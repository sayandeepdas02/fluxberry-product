import type { StructuredRequirements, ParsedProfile, ScoreBreakdown, SourcingCriteria } from '../../shared';

export interface ProviderMeta {
  provider: string;
  model: string;
  promptVersion: string;
}

export interface JdGenInput {
  title: string;
  userPrompt?: string;
  employmentType?: string;
  workMode?: string;
  location?: string;
  salary?: { min?: number; max?: number; currency?: string };
  experience?: { min?: number; max?: number };
  skills?: string[];
}

export interface JdGenResult {
  description: string;
  structuredRequirements: StructuredRequirements;
  meta: ProviderMeta;
}

export interface ResumeParseInput {
  resumeText: string;
  fileName?: string;
  /** Values already known from the application form (used as fallbacks, never overwritten by AI). */
  hints?: { name?: string; email?: string; phone?: string; location?: string };
}

export interface ResumeParseResult {
  profile: ParsedProfile;
  meta: ProviderMeta;
}

export interface ScreeningInput {
  job: {
    title: string;
    structuredRequirements?: StructuredRequirements | null;
    skills?: Array<{ name: string; required: boolean }>;
    location?: string | null;
    salary?: { min?: number; max?: number; currency?: string } | null;
    experience?: { min?: number; max?: number } | null;
  };
  candidate: {
    parsedProfile?: ParsedProfile | null;
    expectedSalary?: number | null;
    location?: string | null;
    yearsExperience?: number | null;
  };
  /** Deterministic sub-scores already computed by the scoring engine (spec §29). */
  deterministic: ScoreBreakdown;
}

export interface ScreeningReasoning {
  summary: string;
  strengths: string[];
  concerns: string[];
  /** AI judgment (0–10) for the "relevance" dimension that is hard to score deterministically. */
  relevanceScore: number;
  meta: ProviderMeta;
}

export interface SourcingQueryInput {
  /** The recruiter's free-text description of who they want to source. */
  prompt: string;
}

export interface SourcingQueryResult {
  criteria: SourcingCriteria;
  meta: ProviderMeta;
}

/**
 * Provider-agnostic AI surface (spec §127). Core services depend only on this;
 * concrete providers (Anthropic/OpenAI/Mock) are chosen by config.
 */
export interface AIProvider {
  readonly name: string;
  generateJobDescription(input: JdGenInput): Promise<JdGenResult>;
  parseResume(input: ResumeParseInput): Promise<ResumeParseResult>;
  screenCandidate(input: ScreeningInput): Promise<ScreeningReasoning>;
  /** Turn a natural-language sourcing prompt into structured search criteria. */
  parseSourcingQuery(input: SourcingQueryInput): Promise<SourcingQueryResult>;
}
