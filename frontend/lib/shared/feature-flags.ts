/** Feature flags let us ship incomplete/optional systems safely (spec §146). */
export const FEATURE_FLAGS = [
  'CODING_ASSESSMENT',
  'AI_INTERVIEW',
  'WORKFLOW_AUTOMATION',
  'ADVANCED_ANALYTICS',
  'ASSESSMENTS',
  'QUESTION_BANK',
  'AV_SCANNING',
  'OUTBOUND_WEBHOOKS',
  'GDPR_TOOLS',
  'OFFER_MANAGEMENT',
  'BULK_IMPORT',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagState = Record<FeatureFlag, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlagState = {
  CODING_ASSESSMENT: true,
  AI_INTERVIEW: false,
  WORKFLOW_AUTOMATION: true,
  ADVANCED_ANALYTICS: false,
  ASSESSMENTS: false,
  QUESTION_BANK: false,
  AV_SCANNING: false,
  OUTBOUND_WEBHOOKS: false,
  GDPR_TOOLS: false,
  OFFER_MANAGEMENT: true,
  BULK_IMPORT: false,
};
