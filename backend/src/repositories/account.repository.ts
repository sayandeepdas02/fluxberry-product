import { AccountModel, type AccountDoc } from '../models/account.model';
import { WorkspaceModel } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';
import { AccountMemberModel } from '../models/account-member.model';
import { PLAN_CREDIT_ALLOWANCE } from '../shared';
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
   * Resolve the workspace's account, provisioning one on the fly if it doesn't
   * exist yet. This makes the account tier self-healing: a workspace created
   * before the backfill migration ran (or on a partially-migrated deployment)
   * still resolves a valid account on first access instead of hard-failing.
   * Idempotent and race-safe — it only claims the workspace if still unclaimed.
   */
  ensureForWorkspace: async (workspaceId: string) => {
    const fast = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
    if (fast?.accountId) return AccountModel.findById(fast.accountId);

    const ws = await WorkspaceModel.findById(workspaceId);
    if (!ws) return null;
    if (ws.accountId) return AccountModel.findById(ws.accountId);

    const plan = ((ws.plan as WorkspacePlan) ?? 'FREE') as WorkspacePlan;
    const allowance = PLAN_CREDIT_ALLOWANCE[plan] ?? 0;
    const account = await AccountModel.create({
      name: ws.name,
      ownerUserId: ws.createdBy,
      clerkOrgId: ws.clerkOrgId ?? null,
      plan,
      billing: ws.billing ?? {},
      credits: {
        allowanceRemaining: allowance,
        allowancePerPeriod: allowance,
        periodResetAt: ws.billing?.currentPeriodEnd ? new Date(ws.billing.currentPeriodEnd) : null,
        purchasedBalance: 0,
      },
    });

    // Atomically claim the workspace; if another concurrent request beat us to
    // it, discard our duplicate and use the one that won.
    const claimed = await WorkspaceModel.findOneAndUpdate(
      { _id: ws._id, accountId: null },
      { $set: { accountId: account._id } },
      { new: true },
    );
    if (!claimed) {
      await AccountModel.deleteOne({ _id: account._id });
      const fresh = await WorkspaceModel.findById(ws._id).select('accountId').lean();
      return fresh?.accountId ? AccountModel.findById(fresh.accountId) : null;
    }

    // Copy the workspace's members onto the account (same shape as the backfill).
    const members = await WorkspaceMemberModel.find({ workspaceId: ws._id }).lean();
    for (const m of members) {
      // eslint-disable-next-line no-await-in-loop
      await AccountMemberModel.updateOne(
        { accountId: account._id, userId: m.userId },
        { $setOnInsert: { accountId: account._id, userId: m.userId }, $set: { role: m.role, clerkMembershipId: m.clerkMembershipId ?? null } },
        { upsert: true },
      );
    }
    return account;
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
