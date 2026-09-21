import { WorkspaceModel } from '../../../src/models/workspace.model';

/**
 * Test-only shortcut: Fluxberry is paid-only, so every product route is
 * gated behind requireActiveSubscription (see auth.ts). Rather than driving
 * the full mock checkout/webhook flow in every unrelated integration test
 * (that flow itself is covered by billing.test.ts), directly flip the
 * workspace to a subscribed state.
 */
export async function activateSubscription(workspaceId: string): Promise<void> {
  await WorkspaceModel.findByIdAndUpdate(workspaceId, {
    plan: 'PRO',
    'billing.subscriptionStatus': 'active',
  });
}
