import { connectDatabase, disconnectDatabase } from '../config/db';
import '../models'; // register all models
import { WorkspaceModel } from '../models/workspace.model';
import { AccountModel } from '../models/account.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';
import { AccountMemberModel } from '../models/account-member.model';
import { PLAN_CREDIT_ALLOWANCE, type WorkspacePlan } from '../shared';
import { logger } from '../utils/logger';

/**
 * One-off migration for the account tier: gives every existing workspace its own
 * billing Account (1:1), moving plan + billing + credits onto the account and
 * copying WorkspaceMember rows into AccountMember. After this, plan/billing/credits
 * are read from the account; the workspace's `plan` field becomes a denormalized
 * cache. Idempotent — a workspace that already has `accountId` is skipped.
 */
async function main() {
  await connectDatabase();

  const cursor = WorkspaceModel.find({ accountId: null }).cursor();
  let created = 0;
  for await (const ws of cursor) {
    const plan = ((ws.plan as WorkspacePlan) ?? 'FREE') as WorkspacePlan;
    const billing = ws.billing ?? {};
    const allowance = PLAN_CREDIT_ALLOWANCE[plan] ?? 0;
    // Anchor the first reset to the current period end if the sub is active,
    // otherwise leave it null (no active period to reset against).
    const periodResetAt = billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null;

    // eslint-disable-next-line no-await-in-loop
    const account = await AccountModel.create({
      name: ws.name,
      ownerUserId: ws.createdBy,
      clerkOrgId: ws.clerkOrgId ?? null,
      plan,
      billing,
      credits: {
        allowanceRemaining: allowance,
        allowancePerPeriod: allowance,
        periodResetAt,
        purchasedBalance: 0,
      },
    });

    // eslint-disable-next-line no-await-in-loop
    await WorkspaceModel.updateOne({ _id: ws._id }, { $set: { accountId: account._id } });

    // Copy memberships → account members.
    // eslint-disable-next-line no-await-in-loop
    const members = await WorkspaceMemberModel.find({ workspaceId: ws._id }).lean();
    for (const m of members) {
      // eslint-disable-next-line no-await-in-loop
      await AccountMemberModel.updateOne(
        { accountId: account._id, userId: m.userId },
        { $setOnInsert: { accountId: account._id, userId: m.userId }, $set: { role: m.role, clerkMembershipId: m.clerkMembershipId ?? null } },
        { upsert: true },
      );
    }
    created++;
  }

  logger.info({ accountsCreated: created }, 'Backfilled accounts for existing workspaces');
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Account backfill failed');
  process.exit(1);
});
