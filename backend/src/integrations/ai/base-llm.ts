import type { StructuredRequirements, ParsedProfile, SourcingCriteria } from '../../shared';
import { sourcingCriteriaSchema, emptySourcingCriteria, SENIORITY_LEVELS } from '../../shared';
import type {
  AIProvider,
  JdGenInput,
  JdGenResult,
  ResumeParseInput,
  ResumeParseResult,
  ScreeningInput,
  ScreeningReasoning,
  SourcingQueryInput,
  SourcingQueryResult,
  OutreachDraftInput,
  OutreachDraftResult,
  ProviderMeta,
} from './types';
import {
  jobDescriptionPrompt,
  resumeParsingPrompt,
  candidateScreeningPrompt,
  sourcingQueryPrompt,
  outreachEmailPrompt,
  type PromptSpec,
} from './prompts';
import { extractJson, clampScore, asStringArray } from './util';

/**
 * Shared LLM logic (prompt -> JSON -> typed result). Concrete providers only
 * implement `complete()`. Keeps core services decoupled from any vendor SDK.
 */
export abstract class BaseLLMProvider implements AIProvider {
  abstract readonly name: string;
  protected abstract model: string;

  /** Send a system+user prompt and return the raw text completion. */
  protected abstract complete(spec: PromptSpec, maxTokens: number): Promise<string>;

  protected meta(version: string): ProviderMeta {
    return { provider: this.name, model: this.model, promptVersion: version };
  }

  async generateJobDescription(input: JdGenInput): Promise<JdGenResult> {
    const spec = jobDescriptionPrompt(input);
    const json = extractJson<any>(await this.complete(spec, 2200));
    return {
      description: String(json.description ?? '').trim(),
      structuredRequirements: normalizeReqs(json.structuredRequirements),
      meta: this.meta(spec.version),
    };
  }

  async parseResume(input: ResumeParseInput): Promise<ResumeParseResult> {
    const spec = resumeParsingPrompt(input);
    const json = extractJson<any>(await this.complete(spec, 1800));
    return { profile: normalizeProfile(json), meta: this.meta(spec.version) };
  }

  async screenCandidate(input: ScreeningInput): Promise<ScreeningReasoning> {
    const spec = candidateScreeningPrompt(input);
    const json = extractJson<any>(await this.complete(spec, 1200));
    return {
      summary: String(json.summary ?? '').trim(),
      strengths: asStringArray(json.strengths),
      concerns: asStringArray(json.concerns),
      relevanceScore: clampScore(json.relevanceScore),
      meta: this.meta(spec.version),
    };
  }

  async parseSourcingQuery(input: SourcingQueryInput): Promise<SourcingQueryResult> {
    const spec = sourcingQueryPrompt(input);
    const json = extractJson<any>(await this.complete(spec, 700));
    return { criteria: normalizeCriteria(json), meta: this.meta(spec.version) };
  }

  async draftOutreachEmail(input: OutreachDraftInput): Promise<OutreachDraftResult> {
    const spec = outreachEmailPrompt(input);
    const json = extractJson<any>(await this.complete(spec, 800));
    return {
      subject: String(json.subject ?? '').trim(),
      body: String(json.body ?? '').trim(),
      meta: this.meta(spec.version),
    };
  }

}

const SENIORITY_SET = new Set<string>(SENIORITY_LEVELS);
const SENIORITY_SYNONYMS: Record<string, string> = {
  intern: 'INTERN', internship: 'INTERN', trainee: 'INTERN',
  junior: 'ENTRY', entry: 'ENTRY', 'entry level': 'ENTRY', associate: 'ENTRY', grad: 'ENTRY',
  mid: 'MID', 'mid level': 'MID', intermediate: 'MID',
  senior: 'SENIOR', sr: 'SENIOR',
  staff: 'STAFF', principal: 'STAFF',
  lead: 'LEAD', 'tech lead': 'LEAD',
  manager: 'MANAGER', 'engineering manager': 'MANAGER', em: 'MANAGER',
  director: 'DIRECTOR', head: 'DIRECTOR',
  vp: 'VP', 'vice president': 'VP',
  cxo: 'CXO', cto: 'CXO', ceo: 'CXO', founder: 'CXO', 'c-level': 'CXO',
};

/** Coerce arbitrary LLM JSON into a valid, clamped SourcingCriteria. */
export function normalizeCriteria(j: any): SourcingCriteria {
  const clampYear = (v: unknown) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN;
    return Number.isNaN(n) ? undefined : Math.max(0, Math.min(60, n));
  };
  const trimTo = (arr: string[], len: number) =>
    arr.map((s) => s.trim().slice(0, len).trim()).filter(Boolean);

  const seniority = Array.isArray(j?.seniority)
    ? Array.from(
        new Set(
          j.seniority
            .filter((s: unknown) => typeof s === 'string')
            .map((s: string) => SENIORITY_SYNONYMS[s.trim().toLowerCase()] ?? s.trim().toUpperCase())
            .filter((s: string) => SENIORITY_SET.has(s)),
        ),
      )
    : [];

  const raw = {
    titles: trimTo(asStringArray(j?.titles, 12), 80),
    seniority,
    skills: trimTo(asStringArray(j?.skills, 30), 60),
    minYears: clampYear(j?.minYears),
    maxYears: clampYear(j?.maxYears),
    locations: trimTo(asStringArray(j?.locations, 12), 80),
    countries: trimTo(asStringArray(j?.countries, 12), 60).map((s) => s.toLowerCase()),
    companies: trimTo(asStringArray(j?.companies, 20), 80),
    excludeCompanies: trimTo(asStringArray(j?.excludeCompanies, 20), 80),
    industries: trimTo(asStringArray(j?.industries, 12), 60).map((s) => s.toLowerCase()),
    keywords: trimTo(asStringArray(j?.keywords, 20), 60),
  };

  const parsed = sourcingCriteriaSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptySourcingCriteria();
}

function normalizeReqs(r: any): StructuredRequirements {
  return {
    requiredSkills: asStringArray(r?.requiredSkills, 30),
    preferredSkills: asStringArray(r?.preferredSkills, 30),
    responsibilities: asStringArray(r?.responsibilities, 20),
    education: asStringArray(r?.education, 10),
    experience: {
      min: numOrUndef(r?.experience?.min),
      max: numOrUndef(r?.experience?.max),
    },
  };
}

function normalizeProfile(j: any): ParsedProfile {
  return {
    summary: typeof j?.summary === 'string' ? j.summary : '',
    yearsExperience: numOrUndef(j?.yearsExperience) ?? 0,
    skills: asStringArray(j?.skills, 40),
    education: Array.isArray(j?.education)
      ? j.education.slice(0, 10).map((e: any) => ({
          degree: str(e?.degree),
          institution: str(e?.institution),
          year: str(e?.year),
        }))
      : [],
    workExperience: Array.isArray(j?.workExperience)
      ? j.workExperience.slice(0, 15).map((w: any) => ({
          title: str(w?.title),
          company: str(w?.company),
          start: str(w?.start),
          end: str(w?.end),
          description: str(w?.description),
        }))
      : [],
    projects: Array.isArray(j?.projects)
      ? j.projects.slice(0, 15).map((p: any) => ({ name: str(p?.name), description: str(p?.description) }))
      : [],
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const numOrUndef = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
