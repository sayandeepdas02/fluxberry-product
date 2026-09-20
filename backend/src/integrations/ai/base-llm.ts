import type { StructuredRequirements, ParsedProfile } from '../../shared';
import type {
  AIProvider,
  JdGenInput,
  JdGenResult,
  ResumeParseInput,
  ResumeParseResult,
  ScreeningInput,
  ScreeningReasoning,
  ProviderMeta,
} from './types';
import {
  jobDescriptionPrompt,
  resumeParsingPrompt,
  candidateScreeningPrompt,
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
