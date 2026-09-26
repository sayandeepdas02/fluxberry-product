import type { SourcingCriteria } from '../../shared';

/**
 * People-sourcing provider surface (Apollo + PDL, brokered through Monid, in
 * production; a realistic mock otherwise). Core services depend only on this
 * interface; the concrete adapter is chosen by config exactly like the AI/
 * email/storage providers.
 *
 * The provider takes ALREADY-STRUCTURED `SourcingCriteria` (the natural-language
 * prompt is turned into criteria upstream by the AI provider) and returns raw
 * people. Match-scoring and persistence happen in the sourcing service, so the
 * same transparent ranking applies to both the mock and the live API.
 */

export interface PersonSearchInput {
  criteria: SourcingCriteria;
  /** How many profiles to retrieve this page (each costs one Apollo enrich call live). */
  size: number;
  /** Opaque pagination cursor from a previous page (null = first page). */
  scrollToken?: string | null;
}

export interface SourcedPersonExperience {
  title?: string;
  company?: string;
  start?: string;
  end?: string;
}

export interface SourcedPersonEducation {
  degree?: string;
  school?: string;
  major?: string;
}

/** A normalized person record, provider-agnostic. */
export interface SourcedPerson {
  /** Stable upstream id (Apollo person id live, PDL id historically) used to dedupe across searches. */
  providerId: string | null;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  /** One of SENIORITY_LEVELS when we can infer it, else undefined. */
  seniority?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  location?: string;
  country?: string;
  yearsExperience?: number;
  /** Empty for a fresh Apollo result — Apollo has no per-person skills taxonomy. Populated only after a PDL backfill. */
  skills: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  experience: SourcedPersonExperience[];
  education: SourcedPersonEducation[];
}

export interface PersonSearchResult {
  people: SourcedPerson[];
  /** Total matches available upstream (for "load more" affordance). */
  total: number;
  /** Cursor to pass back for the next page, or null when exhausted. */
  scrollToken: string | null;
  /** Credits/calls this page consumed (live: people.length enrich calls; mock: simulated). */
  creditsUsed: number;
}

/** The subset of SourcedPerson a backfill can ever supply — never search-only fields. */
export interface BackfillFields {
  skills: string[];
  githubUrl?: string;
  personalEmail?: string;
  education: SourcedPersonEducation[];
  yearsExperience?: number;
}

export interface PeopleSourcingProvider {
  readonly name: string;
  search(input: PersonSearchInput): Promise<PersonSearchResult>;
  /**
   * Lazy, targeted enrichment for fields the search step couldn't supply
   * (skills/education/githubUrl/personalEmail on a fresh Apollo result).
   * Called only on contact-detail open, only when hasEnrichmentGap() is true —
   * never during bulk search. Returns null on a no-match.
   */
  backfill(person: Pick<SourcedPerson, 'fullName' | 'company' | 'workEmail' | 'linkedinUrl'>): Promise<BackfillFields | null>;
}

/**
 * True when `person` is missing any of the fields Apollo never returns
 * (skills/education/githubUrl/personalEmail) — signals a PDL backfill is worth
 * attempting. Accepts either a fresh `SourcedPerson` or a persisted Mongo doc
 * (whose fields come back as `T | null`), hence the loose shape here.
 */
export function hasEnrichmentGap(person: {
  skills?: unknown[] | null;
  education?: unknown[] | null;
  githubUrl?: string | null;
  personalEmail?: string | null;
}): boolean {
  return (
    (person.skills?.length ?? 0) === 0 ||
    (person.education?.length ?? 0) === 0 ||
    !person.githubUrl ||
    !person.personalEmail
  );
}

// ---------------------------------------------------------------------------
// Compensation (Levels.fyi, brokered through Monid)
// ---------------------------------------------------------------------------

export interface CompensationBandInput {
  /** Free-text employer name as stored on the sourced contact, e.g. "Stripe". */
  company: string;
  /** Free-text job title, e.g. "Senior Backend Engineer". */
  title?: string;
  /** Free-text location, e.g. "Bengaluru, India" — omitted defaults to US-wide data. */
  location?: string;
}

export interface CompensationPercentiles {
  p25?: number;
  p50?: number;
  p75?: number;
}

/** Aggregate, crowd-sourced market compensation for a company + job family — NOT this specific candidate's actual pay. */
export interface CompensationBand {
  companySlug: string;
  companyName?: string;
  jobFamilySlug?: string;
  jobFamilyName?: string;
  currency: string;
  totalComp: CompensationPercentiles;
  base: CompensationPercentiles;
  source: 'levels.fyi';
  fetchedAt: string;
}

export interface CompensationProvider {
  readonly name: string;
  /** Returns null (not an error) when the company/role can't be resolved to comp data. */
  getSalaryBand(input: CompensationBandInput): Promise<CompensationBand | null>;
}
