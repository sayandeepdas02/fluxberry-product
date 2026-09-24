import type { SourcingCriteria } from '../../shared';
import { logger } from '../../utils/logger';
import { providerError } from '../../utils/errors';
import type {
  PeopleSourcingProvider,
  PersonSearchInput,
  PersonSearchResult,
  SourcedPerson,
} from './types';

/**
 * Live People Data Labs adapter (Person Search API v5).
 *
 *   GET https://api.peopledatalabs.com/v5/person/search
 *   header:  X-Api-Key: <key>
 *   params:  query (Elasticsearch JSON), size, scroll_token
 *   billing: ONE credit per record returned — so `size` is the spend dial and
 *            is bounded by the caller (SOURCING_MAX_PAGE_SIZE / PDL_MAX_RESULTS).
 *
 * The exact field weighting below is a sensible default; tune against live PDL
 * result quality. Method signatures never change, so nothing downstream cares.
 */
const PDL_SEARCH_URL = 'https://api.peopledatalabs.com/v5/person/search';

export class PdlPeopleSourcingProvider implements PeopleSourcingProvider {
  readonly name = 'peopledatalabs';

  constructor(private readonly apiKey: string) {}

  async search(input: PersonSearchInput): Promise<PersonSearchResult> {
    const body: Record<string, unknown> = {
      query: buildEsQuery(input.criteria),
      size: input.size,
    };
    if (input.scrollToken) body.scroll_token = input.scrollToken;

    let res: Response;
    try {
      res = await fetch(PDL_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error({ err }, 'PDL search request failed');
      throw providerError('People Data Labs is unreachable');
    }

    if (res.status === 404) {
      // PDL returns 404 when a valid query simply has no matches.
      return { people: [], total: 0, scrollToken: null, creditsUsed: 0 };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error({ status: res.status, text: text.slice(0, 500) }, 'PDL search error');
      if (res.status === 402) throw providerError('People Data Labs credits exhausted');
      if (res.status === 429) throw providerError('People Data Labs rate limit hit, try again shortly');
      throw providerError('People Data Labs search failed');
    }

    const json = (await res.json()) as PdlSearchResponse;
    const people = (json.data ?? []).map(mapPdlPerson);
    return {
      people,
      total: json.total ?? people.length,
      scrollToken: json.scroll_token ?? null,
      creditsUsed: people.length,
    };
  }
}

// --- query builder ---------------------------------------------------------

function buildEsQuery(c: SourcingCriteria): Record<string, unknown> {
  const must: unknown[] = [];
  const should: unknown[] = [];
  const mustNot: unknown[] = [];

  // Titles — at least one should match (OR), lightly required if provided.
  if (c.titles.length) {
    must.push({
      bool: {
        should: c.titles.map((t) => ({ match: { job_title: t } })),
        minimum_should_match: 1,
      },
    });
  }

  // Skills — prefer strong overlap without demanding every one.
  if (c.skills.length) {
    const need = Math.max(1, Math.ceil(c.skills.length * 0.5));
    must.push({
      bool: {
        should: c.skills.map((s) => ({ term: { skills: s.toLowerCase() } })),
        minimum_should_match: need,
      },
    });
  }

  // Locations / countries.
  if (c.locations.length) {
    should.push({
      bool: {
        should: c.locations.map((l) => ({ match: { location_name: l } })),
        minimum_should_match: 1,
      },
    });
  }
  if (c.countries.length) {
    must.push({ terms: { location_country: c.countries.map((x) => x.toLowerCase()) } });
  }

  // Experience floor.
  if (c.minYears != null || c.maxYears != null) {
    const range: Record<string, number> = {};
    if (c.minYears != null) range.gte = c.minYears;
    if (c.maxYears != null) range.lte = c.maxYears;
    must.push({ range: { inferred_years_experience: range } });
  }

  // Current employers to target / avoid.
  if (c.companies.length) {
    should.push({
      bool: {
        should: c.companies.map((co) => ({ match: { job_company_name: co } })),
        minimum_should_match: 1,
      },
    });
  }
  if (c.excludeCompanies.length) {
    c.excludeCompanies.forEach((co) => mustNot.push({ match: { job_company_name: co } }));
  }

  // Industries.
  if (c.industries.length) {
    should.push({ terms: { industry: c.industries.map((x) => x.toLowerCase()) } });
  }

  // Keywords — broad free-text catch-all across summary + titles.
  if (c.keywords.length) {
    should.push({
      query_string: {
        query: c.keywords.map((k) => `"${k}"`).join(' OR '),
        default_field: 'summary',
      },
    });
  }

  // Only surface reachable people (have some professional signal).
  must.push({ exists: { field: 'work_email' } });

  return {
    bool: {
      ...(must.length ? { must } : {}),
      ...(should.length ? { should } : {}),
      ...(mustNot.length ? { must_not: mustNot } : {}),
    },
  };
}

// --- response mapping ------------------------------------------------------

interface PdlSearchResponse {
  status: number;
  data?: PdlPerson[];
  total?: number;
  scroll_token?: string | null;
}

interface PdlPerson {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  job_title_levels?: string[];
  job_company_name?: string;
  job_company_size?: string;
  job_company_industry?: string;
  industry?: string;
  location_name?: string;
  location_country?: string;
  inferred_years_experience?: number;
  skills?: string[];
  linkedin_url?: string;
  github_url?: string;
  work_email?: string;
  personal_emails?: string[];
  emails?: Array<{ address?: string; type?: string }>;
  mobile_phone?: string;
  phone_numbers?: string[];
  experience?: Array<{
    title?: { name?: string };
    company?: { name?: string };
    start_date?: string;
    end_date?: string;
  }>;
  education?: Array<{
    degrees?: string[];
    school?: { name?: string };
    majors?: string[];
  }>;
}

function mapPdlPerson(p: PdlPerson): SourcedPerson {
  const personalEmail = p.personal_emails?.[0] ?? p.emails?.find((e) => e.type === 'personal')?.address;
  return {
    providerId: p.id ?? null,
    fullName: p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ') ?? 'Unknown',
    firstName: p.first_name,
    lastName: p.last_name,
    title: p.job_title,
    seniority: mapLevel(p.job_title_levels),
    company: p.job_company_name,
    companySize: p.job_company_size,
    industry: p.job_company_industry ?? p.industry,
    location: p.location_name,
    country: p.location_country,
    yearsExperience: p.inferred_years_experience,
    skills: (p.skills ?? []).slice(0, 20),
    linkedinUrl: p.linkedin_url ? ensureHttps(p.linkedin_url) : undefined,
    githubUrl: p.github_url ? ensureHttps(p.github_url) : undefined,
    workEmail: p.work_email ?? undefined,
    personalEmail: personalEmail ?? undefined,
    phone: p.mobile_phone ?? p.phone_numbers?.[0] ?? undefined,
    experience: (p.experience ?? []).slice(0, 6).map((e) => ({
      title: e.title?.name,
      company: e.company?.name,
      start: e.start_date,
      end: e.end_date,
    })),
    education: (p.education ?? []).slice(0, 3).map((e) => ({
      degree: e.degrees?.[0],
      school: e.school?.name,
      major: e.majors?.[0],
    })),
  };
}

function mapLevel(levels?: string[]): string | undefined {
  if (!levels?.length) return undefined;
  const map: Record<string, string> = {
    intern: 'INTERN', entry: 'ENTRY', senior: 'SENIOR', manager: 'MANAGER',
    director: 'DIRECTOR', vp: 'VP', cxo: 'CXO', owner: 'CXO', partner: 'CXO',
  };
  for (const l of levels) {
    const hit = map[l.toLowerCase()];
    if (hit) return hit;
  }
  return 'MID';
}

function ensureHttps(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}
