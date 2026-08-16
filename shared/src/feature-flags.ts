/** Feature flags let us ship incomplete/optional systems safely (spec §146). */
export const FEATURE_FLAGS = [
  'CODING_ASSESSMENT',
  'AI_INTERVIEW',
  'WORKFLOW_AUTOMATION',
  'ADVANCED_ANALYTICS',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagState = Record<FeatureFlag, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlagState = {
  CODING_ASSESSMENT: false,
  AI_INTERVIEW: false,
  WORKFLOW_AUTOMATION: true,
  ADVANCED_ANALYTICS: false,
};
