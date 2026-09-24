import { WorkspaceModel } from '../../../src/models/workspace.model';
import { AccountModel } from '../../../src/models/account.model';
import { PLAN_CREDIT_ALLOWANCE, type WorkspacePlan } from '../../../src/shared';

/**
 * Test-only shortcut: Fluxberry is paid-only, so every product route is gated
 * behind requireActiveSubscription (see auth.ts), and plan/subscription/credits
 * now live on the workspace's owning Account. Rather than driving the full mock
 * checkout/webhook flow in every unrelated integration test (that flow is
 * covered by billing.test.ts), directly flip the account to a subscribed state.
 *
 * Pass `plan` to unlock plan-gated features (e.g. 'MAX' for Referrals / Talent
 * Sourcing); defaults to 'PRO'.
 */
export async function activateSubscription(
  workspaceId: string,
  plan: WorkspacePlan = 'PRO',
): Promise<void> {
  const ws = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
  if (!ws?.accountId) throw new Error(`Workspace ${workspaceId} has no account to activate`);
  const allowance = PLAN_CREDIT_ALLOWANCE[plan] ?? 0;
  await AccountModel.findByIdAndUpdate(ws.accountId, {
    plan,
    'billing.subscriptionStatus': 'active',
    'credits.allowanceRemaining': allowance,
    'credits.allowancePerPeriod': allowance,
  });
  // Keep the workspace's denormalized plan cache in sync.
  await WorkspaceModel.findByIdAndUpdate(workspaceId, { plan });
}
