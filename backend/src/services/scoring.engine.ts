import {
  SCORE_WEIGHTS,
  SCORE_DIMENSIONS,
  type ScoreBreakdown,
  type ScoreDimension,
} from '@fluxberry/shared';

export interface ScoringInput {
  job: {
    requiredSkills: string[];
    preferredSkills: string[];
    experienceMin?: number | null;
    experienceMax?: number | null;
    location?: string | null;
    workMode?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    education?: string[];
  };
  candidate: {
    skills: string[];
    yearsExperience?: number | null;
    location?: string | null;
    expectedSalary?: number | null;
    hasEducation?: boolean;
  };
  /** AI's 0–10 judgment of how relevant the candidate's experience is to THIS role. */
  aiRelevance: number;
}

const clamp = (n: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));
const norm = (s: string) => s.toLowerCase().trim();

/** Skill overlap fraction, scaled 0–10 (required skills weighted 2x preferred). */
function skillScore(job: ScoringInput['job'], candidate: ScoringInput['candidate']): number {
  const have = new Set(candidate.skills.map(norm));
  const req = job.requiredSkills.map(norm);
  const pref = job.preferredSkills.map(norm);
  if (req.length === 0 && pref.length === 0) return 6; // unknown → neutral
  const reqHit = req.filter((s) => have.has(s)).length;
  const prefHit = pref.filter((s) => have.has(s)).length;
  const reqScore = req.length ? reqHit / req.length : 1;
  const prefScore = pref.length ? prefHit / pref.length : 0;
  const combined = req.length ? reqScore * 0.8 + prefScore * 0.2 : prefScore;
  return clamp(combined * 10);
}

function experienceScore(job: ScoringInput['job'], candidate: ScoringInput['candidate']): number {
  const yrs = candidate.yearsExperience;
  if (yrs == null) return 5;
  const min = job.experienceMin ?? null;
  const max = job.experienceMax ?? null;
  if (min == null && max == null) return 7;
  if (min != null && yrs < min) return clamp((yrs / Math.max(min, 1)) * 10);
  if (max != null && yrs > max) return 8; // overqualified is a mild concern, not a fail
  return 10;
}

function locationScore(job: ScoringInput['job'], candidate: ScoringInput['candidate']): number {
  if (job.workMode === 'REMOTE') return 10;
  if (!job.location) return 8;
  if (!candidate.location) return 5;
  const j = norm(job.location);
  const c = norm(candidate.location);
  if (c.includes(j) || j.includes(c)) return 10;
  return 4;
}

function compensationScore(job: ScoringInput['job'], candidate: ScoringInput['candidate']): number {
  const exp = candidate.expectedSalary;
  if (exp == null) return 7;
  const max = job.salaryMax ?? null;
  if (max == null) return 7;
  if (exp <= max) return 10;
  const over = (exp - max) / max;
  return clamp(10 - over * 20); // 10% over ≈ -2, 50% over ≈ 0
}

function educationScore(job: ScoringInput['job'], candidate: ScoringInput['candidate']): number {
  if (!job.education?.length) return 7; // no requirement → neutral-positive
  return candidate.hasEducation ? 10 : 5;
}

/**
 * Transparent, deterministic screening score (spec §29). Sub-scores are computed
 * from structured signals; the LLM only contributes the "relevance" dimension and
 * qualitative reasoning — never an unexplained number.
 */
export function computeScreeningScore(input: ScoringInput): {
  breakdown: ScoreBreakdown;
  total: number;
} {
  const breakdown: ScoreBreakdown = {
    skills: round1(skillScore(input.job, input.candidate)),
    experience: round1(experienceScore(input.job, input.candidate)),
    relevance: round1(clamp(input.aiRelevance)),
    location: round1(locationScore(input.job, input.candidate)),
    compensation: round1(compensationScore(input.job, input.candidate)),
    education: round1(educationScore(input.job, input.candidate)),
  };

  const total = SCORE_DIMENSIONS.reduce(
    (sum, dim: ScoreDimension) => sum + breakdown[dim] * SCORE_WEIGHTS[dim],
    0,
  );
  return { breakdown, total: round1(clamp(total)) };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
