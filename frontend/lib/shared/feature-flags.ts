/** Feature flags let us ship incomplete/optional systems safely (spec §146). */
export const FEATURE_FLAGS = [
  'WORKFLOW_AUTOMATION',
  'ADVANCED_ANALYTICS',
  'AV_SCANNING',
  'OUTBOUND_WEBHOOKS',
  'GDPR_TOOLS',
  'OFFER_MANAGEMENT',
  'BULK_IMPORT',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagState = Record<FeatureFlag, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlagState = {
  WORKFLOW_AUTOMATION: true,
  ADVANCED_ANALYTICS: false,
  AV_SCANNING: false,
  OUTBOUND_WEBHOOKS: false,
  GDPR_TOOLS: false,
  OFFER_MANAGEMENT: true,
  BULK_IMPORT: false,
};
