import { z } from 'zod';
import { WORKSPACE_PLANS, BILLING_SUBSCRIPTION_STATUSES, BILLING_CYCLES } from '../enums';
import type { WorkspacePlan, BillingSubscriptionStatus, BillingCycle } from '../enums';
import type { FeatureFlag } from '../feature-flags';

/** Plans that can actually be purchased (everything except the free tier). */
const paidPlans = WORKSPACE_PLANS.filter((p) => p !== 'FREE') as [WorkspacePlan, ...WorkspacePlan[]];

export const createCheckoutSchema = z.object({
  plan: z.enum(paidPlans),
  billingCycle: z.enum(BILLING_CYCLES).default('MONTHLY'),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export type BillingStatusDto = {
  plan: WorkspacePlan;
  subscriptionStatus: BillingSubscriptionStatus;
  /** Null until a subscription has actually started (no cycle to speak of on FREE). */
  billingCycle: BillingCycle | null;
  currentPeriodEnd: string | null;
  /** True once a checkout has ever completed for this workspace (portal is available). */
  hasBillingAccount: boolean;
  /** The feature flags this workspace's current plan unlocks (intersected with the global kill-switches). */
  enabledFeatures: FeatureFlag[];
};

export { WORKSPACE_PLANS, BILLING_SUBSCRIPTION_STATUSES, BILLING_CYCLES };
