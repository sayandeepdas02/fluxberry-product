import type { SourcingCriteria } from '../../shared';
import { looseMatch } from '../../services/sourcing.scoring';
import type { MonidClient } from './client';
import type { SourcedPerson } from './types';

/**
 * Apollo, via Monid (provider slug "apollo"):
 *
 *   POST /mixed_people/api_search  (free)   — filter by title/seniority/location,
 *     returns REDACTED previews only (obfuscated last name, no location text, no
 *     LinkedIn, no skills — just an id + booleans). Not usable to display or
 *     score on its own.
 *   POST /people/match  ($0.05/call)        — resolves one id into a full,
 *     displayable profile (name, title, seniority, company, location, LinkedIn,
 *     verified work email). Every search result must go through this to become
 *     usable — see integrations/monid/README notes in people-sourcing.ts.
 *
 * Apollo has no skills/education/githubUrl/personalEmail data at all — those
 * are left empty here and only ever filled in by a PDL backfill (see
 * pdl-backfill.ts), lazily, on contact-detail open.
 */

const APOLLO_SENIORITY: Partial<Record<string, string>> = {
  INTERN: 'intern',
  ENTRY: 'entry',
  SENIOR: 'senior',
  STAFF: 'senior', // Apollo has no distinct "staff" IC level; senior is the closest bucket.
  LEAD: 'senior',
  MANAGER: 'manager',
  DIRECTOR: 'director',
  VP: 'vp',
  CXO: 'c_suite',
  // MID has no Apollo equivalent — omitted from the filter (matches broadly).
};

const APOLLO_SENIORITY_REVERSE: Record<string, string> = {
  owner: 'CXO',
  founder: 'CXO',
  c_suite: 'CXO',
  partner: 'CXO',
  vp: 'VP',
  head: 'DIRECTOR',
  director: 'DIRECTOR',
  manager: 'MANAGER',
  senior: 'SENIOR',
  entry: 'ENTRY',
  intern: 'INTERN',
};

export interface ApolloSearchPreview {
  id: string;
  organizationName?: string;
}

/** Where to resume an Apollo search. `offset` is how many already-filtered matches from `upstreamPage` were already returned in a previous call — needed because a page's filtered matches can overflow `perPage` (see searchApollo). */
export interface ApolloSearchCursor {
  upstreamPage: number;
  offset: number;
}

export interface ApolloSearchPage {
  previews: ApolloSearchPreview[];
  /** Apollo's own (unfiltered) total match count — an upper bound, not exact, when a company filter is active (see below). */
  total: number;
  /** Where the next call should resume, or null when upstream is genuinely exhausted. Governs pagination — NOT `total`, which can't be trusted once client-side filtering is applied. */
  nextCursor: ApolloSearchCursor | null;
}

const MAX_UPSTREAM_FILTER_ATTEMPTS = 5;

async function fetchApolloPage(
  client: MonidClient,
  criteria: SourcingCriteria,
  page: number,
  perPage: number,
): Promise<{ total: number; people: Array<{ id: string; organization?: { name?: string } }> }> {
  const output = (await client.run('apollo', '/mixed_people/api_search', {
    queryParams: buildSearchQueryParams(criteria, page, perPage),
  })) as {
    total_entries?: number;
    people?: Array<{ id: string; organization?: { name?: string } }>;
  };
  return { total: output.total_entries ?? 0, people: output.people ?? [] };
}

function matchesCompanyFilters(criteria: SourcingCriteria, organizationName: string | undefined): boolean {
  const name = organizationName ?? '';
  if (criteria.companies.length && !criteria.companies.some((c) => looseMatch(name, c))) return false;
  if (criteria.excludeCompanies.length && criteria.excludeCompanies.some((c) => looseMatch(name, c))) return false;
  return true;
}

function buildSearchQueryParams(criteria: SourcingCriteria, page: number, perPage: number): Record<string, unknown> {
  const params: Record<string, unknown> = { page, per_page: perPage };

  if (criteria.titles.length) params['person_titles[]'] = criteria.titles;

  const seniorities = criteria.seniority.map((s) => APOLLO_SENIORITY[s]).filter((v): v is string => Boolean(v));
  if (seniorities.length) params['person_seniorities[]'] = [...new Set(seniorities)];

  const locations = [...criteria.locations, ...criteria.countries];
  if (locations.length) params['person_locations[]'] = locations;

  // Apollo has no skills filter; fold skills + free-text keywords into q_keywords
  // as the closest available signal.
  const keywordBits = [...criteria.skills, ...criteria.keywords];
  if (keywordBits.length) params.q_keywords = keywordBits.join(' ');

  return params;
}

/**
 * Searches Apollo and returns redacted previews (id + org name only). Applies
 * the companies/excludeCompanies filters client-side on `organization.name`
 * since Apollo's search API only accepts domains/org-ids, not free-text names
 * — there's no server-side way to filter by a free-text company name.
 *
 * Because of that, Apollo's own `total_entries`/page count are UNFILTERED and
 * can't be used to drive pagination once a company filter is active: a page
 * of upstream results can filter down to near-zero while Apollo still reports
 * more pages available, which would otherwise charge credits for empty "load
 * more" pages forever. When a filter is active, this keeps pulling bounded
 * additional upstream pages internally (same request, no extra recruiter
 * action/charge beyond the one search call) until it collects `perPage`
 * filtered matches or upstream is confirmed exhausted.
 *
 * A single upstream page's filtered matches can overflow `perPage` — those
 * extra matches are never dropped; `nextCursor.offset` records exactly how
 * many of that same page's filtered matches were already returned, so the
 * next call resumes mid-page (not at the next page, which would silently
 * skip the overflow) and never re-fetches a page already fully consumed.
 */
export async function searchApollo(
  client: MonidClient,
  criteria: SourcingCriteria,
  cursor: ApolloSearchCursor,
  perPage: number,
): Promise<ApolloSearchPage> {
  const hasCompanyFilter = criteria.companies.length > 0 || criteria.excludeCompanies.length > 0;

  if (!hasCompanyFilter) {
    const { total, people } = await fetchApolloPage(client, criteria, cursor.upstreamPage, perPage);
    return {
      previews: people.map((p) => ({ id: p.id, organizationName: p.organization?.name })),
      total,
      nextCursor: cursor.upstreamPage * perPage < total ? { upstreamPage: cursor.upstreamPage + 1, offset: 0 } : null,
    };
  }

  let page = cursor.upstreamPage;
  let consumedFromPage = cursor.offset;
  let lastTotal = 0;
  const collected: ApolloSearchPreview[] = [];
  let exhausted = false;

  for (let attempt = 0; attempt < MAX_UPSTREAM_FILTER_ATTEMPTS && collected.length < perPage; attempt++) {
    const { total, people } = await fetchApolloPage(client, criteria, page, perPage);
    lastTotal = total;
    const filtered = people
      .filter((p) => matchesCompanyFilters(criteria, p.organization?.name))
      .map((p) => ({ id: p.id, organizationName: p.organization?.name }));
    // Skip whatever was already returned from THIS page in a prior call.
    const available = filtered.slice(consumedFromPage);

    const need = perPage - collected.length;
    const take = available.slice(0, need);
    collected.push(...take);
    consumedFromPage += take.length;

    if (available.length > take.length) {
      // Overflow within this exact page — resume here next time, nothing lost.
      break;
    }

    if (people.length < perPage) {
      exhausted = true;
      break;
    }

    // Fully consumed this page's filtered matches — advance to a fresh page.
    page += 1;
    consumedFromPage = 0;
  }

  return {
    previews: collected,
    total: lastTotal, // Apollo's raw unfiltered count — a rough upper bound, not the true filtered total.
    nextCursor: exhausted ? null : { upstreamPage: page, offset: consumedFromPage },
  };
}

interface ApolloEmploymentEntry {
  title?: string;
  organization_name?: string;
  start_date?: string;
  end_date?: string | null;
  current?: boolean;
}

interface ApolloPersonMatch {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  seniority?: string;
  linkedin_url?: string;
  github_url?: string | null;
  email?: string;
  organization?: {
    name?: string;
    estimated_num_employees?: number;
    industry?: string;
  };
  employment_history?: ApolloEmploymentEntry[];
  city?: string;
  state?: string;
  country?: string;
}

/** Crude "years since earliest known role started" — the closest free signal Apollo offers; PDL's `inferred_years_experience` (via backfill) is more precise. */
function deriveYearsExperience(history: ApolloEmploymentEntry[] | undefined): number | undefined {
  const years = (history ?? [])
    .map((e) => e.start_date && Number(e.start_date.slice(0, 4)))
    .filter((y): y is number => Boolean(y) && !Number.isNaN(y));
  if (!years.length) return undefined;
  const earliest = Math.min(...years);
  return Math.max(0, new Date().getFullYear() - earliest);
}

/** Resolves one Apollo person id into a full, displayable profile. Skills/education stay empty — Apollo has no per-person taxonomy for either; only a PDL backfill fills them. */
export async function enrichApolloPerson(client: MonidClient, apolloId: string): Promise<SourcedPerson | null> {
  const output = (await client.run('apollo', '/people/match', {
    queryParams: { id: apolloId },
  })) as { person?: ApolloPersonMatch };

  const p = output.person;
  if (!p || !p.id) return null;

  const location = [p.city, p.state, p.country].filter(Boolean).join(', ') || undefined;

  return {
    providerId: p.id,
    fullName: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
    firstName: p.first_name,
    lastName: p.last_name,
    title: p.title,
    seniority: p.seniority ? APOLLO_SENIORITY_REVERSE[p.seniority.toLowerCase()] : undefined,
    company: p.organization?.name,
    companySize: p.organization?.estimated_num_employees != null ? String(p.organization.estimated_num_employees) : undefined,
    industry: p.organization?.industry,
    location,
    country: p.country,
    yearsExperience: deriveYearsExperience(p.employment_history),
    skills: [],
    linkedinUrl: p.linkedin_url,
    githubUrl: p.github_url ?? undefined,
    workEmail: p.email,
    personalEmail: undefined,
    phone: undefined,
    experience: (p.employment_history ?? []).slice(0, 6).map((e) => ({
      title: e.title,
      company: e.organization_name,
      start: e.start_date,
      end: e.current ? 'Present' : (e.end_date ?? undefined),
    })),
    education: [],
  };
}
