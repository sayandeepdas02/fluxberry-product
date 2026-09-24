import { connectDatabase, disconnectDatabase } from '../config/db';
import '../models'; // register all models
import { UserModel } from '../models/user.model';
import { WorkspaceModel, type WorkspaceDoc } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';
import { AccountModel } from '../models/account.model';
import { AccountMemberModel } from '../models/account-member.model';
import { PLAN_CREDIT_ALLOWANCE, WORKSPACE_PLANS, BILLING_CYCLES } from '../shared';
import type { WorkspacePlan, BillingCycle } from '../shared';
import { logger } from '../utils/logger';

/**
 * Admin script: comp/grant a subscription plan to an account (e.g. an internal
 * test account), bypassing checkout. Sets the account's plan to an ACTIVE
 * subscription with the plan's monthly AI-credit allowance. Self-provisions the
 * account if the workspace doesn't have one yet, so it's safe to run before or
 * after `backfill:accounts`. Idempotent — re-running just reasserts the state.
 *
 * Because there is no real Dodo subscription behind a comped account, the
 * subscription never auto-renews or lapses (status stays `active` until changed),
 * and the monthly allowance refills lazily every ~30 days via periodResetAt.
 *
 * Usage (run against the target environment's DB via MONGODB_URI):
 *   tsx src/scripts/grant-plan.ts --email owner@example.com [--plan MAX] [--cycle ANNUAL]
 *   tsx src/scripts/grant-plan.ts --workspace maxeo --plan MAX
 *   tsx src/scripts/grant-plan.ts --workspace maxeo --plan FREE          # revoke
 *   add --dry-run to preview without writing.
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function resolveWorkspace(): Promise<WorkspaceDoc & { _id: unknown }> {
  const slug = arg('workspace');
  if (slug) {
    const ws = await WorkspaceModel.findOne({ slug: slug.toLowerCase() });
    if (!ws) throw new Error(`No workspace with slug "${slug}"`);
    return ws as WorkspaceDoc & { _id: unknown };
  }

  const email = arg('email');
  if (email) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error(`No user with email "${email}"`);
    const memberships = await WorkspaceMemberModel.find({ userId: user._id }).lean();
    const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
    if (workspaces.length === 0) throw new Error(`User "${email}" has no workspaces`);
    if (workspaces.length > 1) {
      const list = workspaces.map((w) => `${w.name} (--workspace ${w.slug})`).join(', ');
      throw new Error(`User "${email}" belongs to ${workspaces.length} workspaces: ${list}. Re-run with --workspace <slug>.`);
    }
    return workspaces[0] as WorkspaceDoc & { _id: unknown };
  }

  throw new Error('Pass --workspace <slug> or --email <ownerEmail>');
}

async function main() {
  const plan = (arg('plan') ?? 'MAX').toUpperCase() as WorkspacePlan;
  if (!WORKSPACE_PLANS.includes(plan)) {
    throw new Error(`Invalid --plan "${plan}". One of: ${WORKSPACE_PLANS.join(', ')}`);
  }
  const cycle = (arg('cycle') ?? 'ANNUAL').toUpperCase() as BillingCycle;
  if (!BILLING_CYCLES.includes(cycle)) {
    throw new Error(`Invalid --cycle "${cycle}". One of: ${BILLING_CYCLES.join(', ')}`);
  }
  const dryRun = process.argv.includes('--dry-run');
  const paid = plan !== 'FREE';

  await connectDatabase();

  const ws = await resolveWorkspace();
  const allowance = PLAN_CREDIT_ALLOWANCE[plan] ?? 0;
  const now = Date.now();
  // Cosmetic renewal date; access is gated on `active` status, not this date.
  const currentPeriodEnd = new Date(now + (cycle === 'ANNUAL' ? 365 : 30) * MS_PER_DAY);
  // Allowance refills ~monthly via the lazy reset in credits.service.
  const periodResetAt = new Date(now + 30 * MS_PER_DAY);

  const billing = {
    subscriptionStatus: paid ? ('active' as const) : ('none' as const),
    billingCycle: paid ? cycle : null,
    currentPeriodEnd: paid ? currentPeriodEnd : null,
    cancelAtPeriodEnd: false,
    // Marks this as a manually-comped subscription (no real Dodo customer).
    customerId: `comp_${String(ws._id)}`,
    subscriptionId: `comp_${plan.toLowerCase()}`,
  };
  const credits = {
    allowanceRemaining: allowance,
    allowancePerPeriod: allowance,
    periodResetAt: paid ? periodResetAt : null,
    // purchasedBalance left untouched below (never reset by a plan grant).
  };

  logger.info(
    { workspace: ws.name, slug: ws.slug, workspaceId: String(ws._id), plan, cycle, allowance, dryRun },
    dryRun ? 'DRY RUN — would grant plan' : 'granting plan',
  );
  if (dryRun) {
    await disconnectDatabase();
    return;
  }

  let account = ws.accountId ? await AccountModel.findById(ws.accountId) : null;

  if (!account) {
    // No account yet (pre-migration) — provision one for this workspace, then
    // copy its members over (same shape as backfill-accounts).
    account = await AccountModel.create({
      name: ws.name,
      ownerUserId: ws.createdBy,
      clerkOrgId: ws.clerkOrgId ?? null,
      plan,
      billing,
      credits: { ...credits, purchasedBalance: 0 },
    });
    await WorkspaceModel.updateOne({ _id: ws._id }, { $set: { accountId: account._id } });

    const members = await WorkspaceMemberModel.find({ workspaceId: ws._id }).lean();
    for (const m of members) {
      // eslint-disable-next-line no-await-in-loop
      await AccountMemberModel.updateOne(
        { accountId: account._id, userId: m.userId },
        { $setOnInsert: { accountId: account._id, userId: m.userId }, $set: { role: m.role, clerkMembershipId: m.clerkMembershipId ?? null } },
        { upsert: true },
      );
    }
    logger.info({ accountId: String(account._id) }, 'provisioned account for workspace');
  } else {
    await AccountModel.updateOne(
      { _id: account._id },
      {
        $set: {
          plan,
          'billing.subscriptionStatus': billing.subscriptionStatus,
          'billing.billingCycle': billing.billingCycle,
          'billing.currentPeriodEnd': billing.currentPeriodEnd,
          'billing.cancelAtPeriodEnd': billing.cancelAtPeriodEnd,
          'billing.customerId': billing.customerId,
          'billing.subscriptionId': billing.subscriptionId,
          'credits.allowanceRemaining': credits.allowanceRemaining,
          'credits.allowancePerPeriod': credits.allowancePerPeriod,
          'credits.periodResetAt': credits.periodResetAt,
        },
      },
    );
  }

  // Refresh the denormalized plan cache on every workspace under the account.
  await WorkspaceModel.updateMany({ accountId: account._id }, { $set: { plan } });

  logger.info(
    { accountId: String(account._id), plan, allowance },
    `done — "${ws.name}" is now on the ${plan} plan`,
  );
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : err }, 'grant-plan failed');
  process.exit(1);
});
