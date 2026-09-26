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

export interface ApolloSearchPage {
  previews: ApolloSearchPreview[];
  total: number;
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
 * since Apollo's search API only accepts domains/org-ids, not free-text names.
 */
export async function searchApollo(
  client: MonidClient,
  criteria: SourcingCriteria,
  page: number,
  perPage: number,
): Promise<ApolloSearchPage> {
  const output = (await client.run('apollo', '/mixed_people/api_search', {
    queryParams: buildSearchQueryParams(criteria, page, perPage),
  })) as {
    total_entries?: number;
    people?: Array<{ id: string; organization?: { name?: string } }>;
  };

  let people = output.people ?? [];
  if (criteria.companies.length) {
    people = people.filter((p) =>
      criteria.companies.some((c) => looseMatch(p.organization?.name ?? '', c)),
    );
  }
  if (criteria.excludeCompanies.length) {
    people = people.filter(
      (p) => !criteria.excludeCompanies.some((c) => looseMatch(p.organization?.name ?? '', c)),
    );
  }

  return {
    previews: people.map((p) => ({ id: p.id, organizationName: p.organization?.name })),
    total: output.total_entries ?? people.length,
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
