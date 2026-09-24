import { AccountModel, type AccountDoc } from '../models/account.model';
import { WorkspaceModel } from '../models/workspace.model';
import type { WorkspacePlan, BillingSubscriptionStatus, BillingCycle } from '../shared';

export interface ApplySubscriptionInput {
  /** Omit to leave the account's current plan untouched (e.g. a past_due status update). */
  plan?: WorkspacePlan;
  /** Omit to leave the account's current billing cycle untouched. */
  billingCycle?: BillingCycle;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const accountRepository = {
  create: (data: Partial<AccountDoc>) => AccountModel.create(data),
  findById: (id: string) => AccountModel.findById(id),
  findByClerkOrgId: (clerkOrgId: string) => AccountModel.findOne({ clerkOrgId }),

  /** Resolve the account that owns a workspace (the billing/entitlement authority for that tenant). */
  findByWorkspaceId: async (workspaceId: string) => {
    const ws = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
    if (!ws?.accountId) return null;
    return AccountModel.findById(ws.accountId);
  },

  /**
   * Atomically set clerkOrgId on the account that owns the workspace matched by
   * slug — but only if that account hasn't been linked to a Clerk org yet. Used
   * by the Clerk sync to associate an org with an account (best-effort).
   */
  claimClerkOrgIdByWorkspaceSlug: async (slug: string, clerkOrgId: string) => {
    const ws = await WorkspaceModel.findOne({ slug }).select('accountId').lean();
    if (!ws?.accountId) return null;
    return AccountModel.findOneAndUpdate(
      { _id: ws.accountId, clerkOrgId: null },
      { clerkOrgId },
      { new: true },
    );
  },

  applySubscription: (accountId: string, input: ApplySubscriptionInput) => {
    const set: Record<string, unknown> = {
      'billing.customerId': input.customerId,
      'billing.subscriptionId': input.subscriptionId,
      'billing.subscriptionStatus': input.subscriptionStatus,
      'billing.currentPeriodEnd': input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null,
      'billing.cancelAtPeriodEnd': input.cancelAtPeriodEnd,
    };
    if (input.plan) set.plan = input.plan;
    if (input.billingCycle) set['billing.billingCycle'] = input.billingCycle;
    return AccountModel.findByIdAndUpdate(accountId, set, { new: true });
  },
};
