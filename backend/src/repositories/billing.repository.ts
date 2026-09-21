import { BillingEventModel } from '../models/billing-event.model';
import { WorkspaceModel } from '../models/workspace.model';
import type { WorkspacePlan, BillingSubscriptionStatus, BillingCycle } from '../shared';

export interface ApplySubscriptionInput {
  /** Omit to leave the workspace's current plan untouched (e.g. a past_due status update). */
  plan?: WorkspacePlan;
  /** Omit to leave the workspace's current billing cycle untouched. */
  billingCycle?: BillingCycle;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const billingRepository = {
  /** Returns true if this event id has already been recorded (idempotent no-op for the caller). */
  eventExists: async (providerEventId: string) =>
    (await BillingEventModel.exists({ providerEventId })) != null,

  recordEvent: (data: { workspaceId: string | null; providerEventId: string; type: string; payload: unknown }) =>
    BillingEventModel.create(data),

  applySubscription: (workspaceId: string, input: ApplySubscriptionInput) => {
    const set: Record<string, unknown> = {
      'billing.customerId': input.customerId,
      'billing.subscriptionId': input.subscriptionId,
      'billing.subscriptionStatus': input.subscriptionStatus,
      'billing.currentPeriodEnd': input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null,
      'billing.cancelAtPeriodEnd': input.cancelAtPeriodEnd,
    };
    if (input.plan) set.plan = input.plan;
    if (input.billingCycle) set['billing.billingCycle'] = input.billingCycle;
    return WorkspaceModel.findByIdAndUpdate(workspaceId, set, { new: true });
  },
};
