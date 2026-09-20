/**
 * Transparent screening score configuration. Shared so the deterministic
 * scoring engine (backend) and any UI that explains the breakdown agree on the
 * same weights and dimensions. See spec §29.
 */

export const SCORE_DIMENSIONS = [
  'skills',
  'experience',
  'relevance',
  'location',
  'compensation',
  'education',
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

/** Weights sum to 1.0. */
export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  skills: 0.35,
  experience: 0.2,
  relevance: 0.2,
  location: 0.1,
  compensation: 0.1,
  education: 0.05,
};

export const SCORE_DIMENSION_LABELS: Record<ScoreDimension, string> = {
  skills: 'Skill match',
  experience: 'Experience',
  relevance: 'Relevant experience',
  location: 'Location',
  compensation: 'Compensation fit',
  education: 'Education & other',
};

/** Each sub-score is 0–10; the weighted total is also 0–10. */
export type ScoreBreakdown = Record<ScoreDimension, number>;

/** Current version of the scoring pipeline; stored with every result. */
export const SCORING_VERSION = 'screening-v1';
