import type { SourcingCriteria } from '../../shared';

/**
 * People-sourcing provider surface (People Data Labs in production, a realistic
 * mock otherwise). Core services depend only on this interface; the concrete
 * adapter is chosen by config exactly like the AI/email/storage providers.
 *
 * The provider takes ALREADY-STRUCTURED `SourcingCriteria` (the natural-language
 * prompt is turned into criteria upstream by the AI provider) and returns raw
 * people. Match-scoring and persistence happen in the sourcing service, so the
 * same transparent ranking applies to both the mock and the live API.
 */

export interface PersonSearchInput {
  criteria: SourcingCriteria;
  /** How many profiles to retrieve this page (each costs one PDL credit live). */
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
  /** Stable upstream id (PDL person id) used to dedupe across searches. */
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
  /** Credits this page consumed (live: people.length; mock: simulated). */
  creditsUsed: number;
}

export interface PeopleSourcingProvider {
  readonly name: string;
  search(input: PersonSearchInput): Promise<PersonSearchResult>;
}
