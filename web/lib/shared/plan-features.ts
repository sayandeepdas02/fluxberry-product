import { WORKSPACE_PLANS } from './enums';
import type { WorkspacePlan } from './enums';
import type { FeatureFlag } from './feature-flags';

/**
 * Which feature flags each plan unlocks. This is the INNER gate: a feature
 * must also be on globally (config.features / FEATURE_FLAGS default state)
 * before a workspace's plan can unlock it — plan never overrides an
 * operational kill-switch, it only narrows what a given plan is allowed to use.
 */
export const PLAN_FEATURES: Record<WorkspacePlan, FeatureFlag[]> = {
  FREE: [],
  PRO: ['ADVANCED_ANALYTICS', 'GDPR_TOOLS', 'OUTBOUND_WEBHOOKS', 'BULK_IMPORT'],
  // Max is a superset of Pro, plus the two Max-only features.
  MAX: ['ADVANCED_ANALYTICS', 'GDPR_TOOLS', 'OUTBOUND_WEBHOOKS', 'BULK_IMPORT', 'TALENT_SOURCING', 'REFERRALS'],
};

export function planIncludesFeature(plan: WorkspacePlan, flag: FeatureFlag): boolean {
  return PLAN_FEATURES[plan].includes(flag);
}

/** The cheapest plan that unlocks a feature (drives upsell copy). Null if no plan has it. */
export function requiredPlanForFeature(flag: FeatureFlag): WorkspacePlan | null {
  for (const plan of WORKSPACE_PLANS) {
    if (PLAN_FEATURES[plan].includes(flag)) return plan;
  }
  return null;
}

export { WORKSPACE_PLANS };
