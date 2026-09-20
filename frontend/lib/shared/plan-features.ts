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
  FREE: ['WORKFLOW_AUTOMATION'],
  PRO: ['WORKFLOW_AUTOMATION', 'ADVANCED_ANALYTICS', 'GDPR_TOOLS', 'OUTBOUND_WEBHOOKS', 'BULK_IMPORT'],
};

export function planIncludesFeature(plan: WorkspacePlan, flag: FeatureFlag): boolean {
  return PLAN_FEATURES[plan].includes(flag);
}

export { WORKSPACE_PLANS };
