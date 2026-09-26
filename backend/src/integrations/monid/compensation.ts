import { logger } from '../../utils/logger';
import { MonidClient, MonidOperationalError } from './client';
import type { CompensationBand, CompensationBandInput, CompensationProvider } from './types';

/**
 * Levels.fyi, via Monid (provider slug "levels.fyi") — aggregate, crowd-sourced
 * market compensation by company + job family, NOT any individual's actual
 * pay. Levels.fyi has no company-name search endpoint, so the company slug is
 * derived by naive kebab-casing and validated with `/get_company_overview`;
 * most smaller/less-known employers legitimately have no data, which is
 * expected (returns null, not an error). `/get_company_overview` is also
 * observed to fail with an upstream 502 (not a clean 404) on an unresolvable
 * slug — both outcomes are treated as "no coverage."
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface JobFamily {
  slug: string;
  name: string;
  aliases?: string[];
}

interface LevelsPercentiles {
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
}

interface LevelsSalaryDataResponse {
  status?: string;
  data?: {
    company?: { name?: string };
    job_family?: string;
    percentiles?: {
      base_salary?: LevelsPercentiles;
      tc?: LevelsPercentiles;
    };
    location_currency?: string;
  };
}

interface LevelsCompanyOverviewResponse {
  status?: string;
  data?: { company?: { name?: string } };
}

interface LevelsJobFamiliesResponse {
  status?: string;
  data?: { job_families?: JobFamily[] };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
}

/** Best-effort match — scores by token overlap between the title and each family's name+aliases, picks the highest-scoring family. This is a heuristic for an already-labeled "estimated" feature, not a precise taxonomy lookup. */
function matchJobFamily(families: JobFamily[], title: string): JobFamily | undefined {
  const titleTokens = new Set(tokens(title));
  let best: { family: JobFamily; score: number } | undefined;
  for (const family of families) {
    const candidateTokens = tokens([family.name, ...(family.aliases ?? [])].join(' '));
    const score = candidateTokens.filter((t) => titleTokens.has(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { family, score };
  }
  return best?.family;
}

export class MonidCompensationProvider implements CompensationProvider {
  readonly name = 'monid';
  private readonly client: MonidClient;
  private jobFamiliesCache: JobFamily[] | null = null;
  private jobFamiliesFetchedAt = 0;

  constructor(apiKey: string) {
    this.client = new MonidClient(apiKey);
  }

  async getSalaryBand(input: CompensationBandInput): Promise<CompensationBand | null> {
    const companySlug = slugify(input.company);
    if (!companySlug) return null;

    const companyName = await this.tryResolveCompany(companySlug);
    if (!companyName) return null;

    let jobFamily: JobFamily | undefined;
    if (input.title) {
      try {
        jobFamily = matchJobFamily(await this.getJobFamilies(), input.title);
      } catch (err) {
        if (err instanceof MonidOperationalError) throw err;
        // The job-family directory itself failed to load/parse for a non-account
        // reason — fall back to a company-wide lookup rather than aborting the
        // whole compensation lookup over an optional refinement.
        logger.info({ err }, 'Levels.fyi job-family lookup failed — falling back to company-wide comp data');
      }
    }

    const queryParams: Record<string, unknown> = { company_slug: companySlug };
    if (jobFamily) queryParams.job_family_slug = jobFamily.slug;
    if (input.location) queryParams.location = slugify(input.location);

    let output: LevelsSalaryDataResponse | null;
    try {
      output = (await this.client.run('levels.fyi', '/get_salary_data', { queryParams })) as LevelsSalaryDataResponse;
    } catch (err) {
      // An operational failure (bad key, empty wallet, unreachable, budget cap,
      // timeout) is NOT "no coverage" — propagate it so the caller does not cache
      // a transient outage as a 30-day negative result.
      if (err instanceof MonidOperationalError) throw err;
      logger.warn({ err, companySlug }, 'Levels.fyi get_salary_data failed — treating as no coverage');
      return null;
    }

    const d = output?.data;
    if (!d?.percentiles) return null;

    return {
      companySlug,
      companyName: d.company?.name ?? companyName,
      jobFamilySlug: jobFamily?.slug,
      jobFamilyName: d.job_family ?? jobFamily?.name,
      currency: d.location_currency ?? 'USD',
      totalComp: {
        p25: d.percentiles.tc?.p25,
        p50: d.percentiles.tc?.p50,
        p75: d.percentiles.tc?.p75,
      },
      base: {
        p25: d.percentiles.base_salary?.p25,
        p50: d.percentiles.base_salary?.p50,
        p75: d.percentiles.base_salary?.p75,
      },
      source: 'levels.fyi',
      fetchedAt: new Date().toISOString(),
    };
  }

  private async tryResolveCompany(companySlug: string): Promise<string | null> {
    try {
      const output = (await this.client.run('levels.fyi', '/get_company_overview', {
        queryParams: { company_slug: companySlug },
      })) as LevelsCompanyOverviewResponse;
      return output?.data?.company?.name ?? null;
    } catch (err) {
      if (err instanceof MonidOperationalError) throw err;
      logger.info({ companySlug }, 'Levels.fyi has no coverage for this company slug');
      return null;
    }
  }

  private async getJobFamilies(): Promise<JobFamily[]> {
    const now = Date.now();
    if (this.jobFamiliesCache && now - this.jobFamiliesFetchedAt < ONE_DAY_MS) return this.jobFamiliesCache;
    const output = (await this.client.run('levels.fyi', '/get_job_families', { queryParams: {} })) as LevelsJobFamiliesResponse;
    this.jobFamiliesCache = output?.data?.job_families ?? [];
    this.jobFamiliesFetchedAt = now;
    return this.jobFamiliesCache;
  }
}
