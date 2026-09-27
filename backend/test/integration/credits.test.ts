import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { AccountModel } from '../../src/models/account.model';
import { billingService } from '../../src/services/billing.service';
import { creditsService } from '../../src/services/credits.service';
import { mockCompleteCreditPackCheckout } from '../../src/integrations/dodo';
import { activateSubscription } from './helpers/activate-subscription';
import { creditsFor, PLAN_CREDIT_ALLOWANCE } from '../../src/shared';
import { WorkspaceMemberModel } from '../../src/models/workspace-member.model';
import { CreditTransactionModel } from '../../src/models/credit-transaction.model';

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

let freshCounter = 0;
/** Onboard a throwaway workspace on `plan` and return its account id. */
async function freshAccount(tag: string, plan: 'PRO' | 'MAX'): Promise<string> {
  const token = await tokenFor(`${tag}-${++freshCounter}@test.com`, 'Fresh Owner');
  const onboard = await request(app)
    .post('/api/v1/workspaces/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Fresh Owner', company: `${tag}co` });
  const workspaceId = onboard.body.data.id as string;
  await activateSubscription(workspaceId, plan);
  return accountIdForWorkspace(workspaceId);
}

async function accountIdForWorkspace(workspaceId: string): Promise<string> {
  const ws = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
  return String(ws!.accountId);
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_credits');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('AI credits (integration)', () => {
  it('debits JD generation, blocks when exhausted, and tops up via a purchase webhook', async () => {
    const token = await tokenFor('creditsowner@test.com', 'Credits Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Credits Owner', company: 'Creditco' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'PRO');

    // Starts with the Pro monthly allowance.
    const initial = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(initial.body.data.credits.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.PRO);
    expect(initial.body.data.credits.purchasedBalance).toBe(0);

    // Generate a JD → allowance drops by the JD cost.
    const gen = await ws(
      request(app).post('/api/v1/jobs/generate-description').send({ title: 'Staff Engineer' }) as any,
    );
    expect(gen.status).toBe(200);
    const afterGen = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterGen.body.data.credits.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.PRO - creditsFor('JD_GENERATION', 1));

    // Drain the pool to zero, then the next generation is blocked with 402.
    const accountId = await accountIdForWorkspace(workspaceId);
    await AccountModel.findByIdAndUpdate(accountId, {
      'credits.allowanceRemaining': 0,
      'credits.purchasedBalance': 0,
    });
    const blocked = await ws(
      request(app).post('/api/v1/jobs/generate-description').send({ title: 'Another Role' }) as any,
    );
    expect(blocked.status).toBe(402);
    expect(blocked.body.error.code).toBe('INSUFFICIENT_CREDITS');

    // Buy a top-up pack → the completed-purchase webhook grants purchased credits.
    const checkout = await ws(
      request(app).post(`/api/v1/workspaces/${workspaceId}/billing/credits/checkout`).send({ packId: 'pack_250' }) as any,
    );
    expect(checkout.status).toBe(200);
    const sessionId = new URL(checkout.body.data.url).searchParams.get('mockCreditPackSession')!;
    const packEvent = mockCompleteCreditPackCheckout(sessionId);
    await billingService.applyWebhookEvent(packEvent);

    const afterTopUp = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterTopUp.body.data.credits.purchasedBalance).toBe(250);

    // Idempotency: replaying the same purchase webhook must not double-grant.
    await billingService.applyWebhookEvent(packEvent);
    const afterReplay = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterReplay.body.data.credits.purchasedBalance).toBe(250);

    // With a purchased balance, generation works again (spends purchased once allowance is 0).
    const gen2 = await ws(
      request(app).post('/api/v1/jobs/generate-description').send({ title: 'Third Role' }) as any,
    );
    expect(gen2.status).toBe(200);
    const afterGen2 = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterGen2.body.data.credits.purchasedBalance).toBe(250 - creditsFor('JD_GENERATION', 1));
  });

  it('lazily resets the monthly allowance once the period has elapsed', async () => {
    const token = await tokenFor('resetowner@test.com', 'Reset Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Reset Owner', company: 'Resetco' });
    const workspaceId = onboard.body.data.id as string;
    await activateSubscription(workspaceId, 'MAX');
    const accountId = await accountIdForWorkspace(workspaceId);

    // Simulate a partly-spent allowance whose period has already ended.
    await AccountModel.findByIdAndUpdate(accountId, {
      'credits.allowanceRemaining': 10,
      'credits.allowancePerPeriod': PLAN_CREDIT_ALLOWANCE.MAX,
      'credits.periodResetAt': new Date(Date.now() - 60 * 1000),
    });

    const balance = await creditsService.getBalance(accountId);
    expect(balance.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.MAX);
    expect(new Date(balance.periodResetAt!).getTime()).toBeGreaterThan(Date.now());
  });
  it('keeps a ledger row for every keyless charge and refund', async () => {
    const accountId = await freshAccount('ledger', 'PRO');
    const a = await creditsService.charge(accountId, 'JD_GENERATION', 1);
    await creditsService.charge(accountId, 'JD_GENERATION', 1);
    await creditsService.refund(a.txId);

    const rows = await CreditTransactionModel.find({ accountId, reason: { $in: ['CONSUME', 'REFUND'] } }).lean();
    expect(rows.filter((r) => r.reason === 'CONSUME')).toHaveLength(2);
    expect(rows.filter((r) => r.reason === 'REFUND')).toHaveLength(1);
    expect((await creditsService.getBalance(accountId)).total).toBe(PLAN_CREDIT_ALLOWANCE.PRO - 1);
  });

  it('charges an idempotency key once, even when retried', async () => {
    const accountId = await freshAccount('idem', 'PRO');
    const first = await creditsService.charge(accountId, 'PROFILE_ENRICH', 1, { idempotencyKey: 'enrich-x-1' });
    const again = await creditsService.charge(accountId, 'PROFILE_ENRICH', 1, { idempotencyKey: 'enrich-x-1' });
    expect(again.replayed).toBe(true);
    expect(again.txId).toBe(first.txId);
    expect((await creditsService.getBalance(accountId)).total).toBe(PLAN_CREDIT_ALLOWANCE.PRO - 9);
  });

  it('settles a reservation down to actual usage, and settling twice refunds once', async () => {
    const accountId = await freshAccount('settle', 'MAX');
    const r = await creditsService.charge(accountId, 'SOURCING_PROFILE', 25); // reserves 38
    expect(r.credits).toBe(38);
    expect(await creditsService.settle(r.txId, 4)).toBe(38 - 6); // 4 new profiles → 6 credits
    expect(await creditsService.settle(r.txId, 4)).toBe(0);
    expect((await creditsService.getBalance(accountId)).total).toBe(PLAN_CREDIT_ALLOWANCE.MAX - 6);
  });

  it('never over-refunds when two settles race on the same stale read', async () => {
    const accountId = await freshAccount('settle-race', 'MAX');
    const r = await creditsService.charge(accountId, 'SOURCING_PROFILE', 25); // 38 reserved
    const owed = 24; // 16 new profiles → 24 credits, so 14 comes back
    // Both settlers read the row before either refunds (the race): each computes
    // refund = 14. Without a ceiling of charged − owed, 14 + 14 ≤ 38 would pass twice.
    const stale = await CreditTransactionModel.findById(r.txId).lean();
    const refunds = await Promise.all([
      creditsService.refundAmount(stale!, 38 - owed, 38 - owed),
      creditsService.refundAmount(stale!, 38 - owed, 38 - owed),
    ]);
    expect(refunds[0] + refunds[1]).toBe(38 - owed);
    expect((await creditsService.getBalance(accountId)).total).toBe(PLAN_CREDIT_ALLOWANCE.MAX - owed);
  });

  it('debits afresh when an idempotency key belongs to a fully refunded charge', async () => {
    const accountId = await freshAccount('refunded-key', 'PRO');
    const first = await creditsService.charge(accountId, 'COMPENSATION_LOOKUP', 1, { idempotencyKey: 'compensation-c1' });
    await creditsService.refund(first.txId); // e.g. no coverage last time
    const again = await creditsService.charge(accountId, 'COMPENSATION_LOOKUP', 1, { idempotencyKey: 'compensation-c1' });
    expect(again.replayed).toBe(false);
    expect(again.txId).not.toBe(first.txId);
    expect((await creditsService.getBalance(accountId)).total).toBe(PLAN_CREDIT_ALLOWANCE.PRO - 1);
    // …while a charge that was kept still replays.
    const replay = await creditsService.charge(accountId, 'COMPENSATION_LOOKUP', 1, { idempotencyKey: 'compensation-c1' });
    expect(replay.replayed).toBe(true);
  });

  it('refunds purchased credits back to the purchased bucket', async () => {
    const accountId = await freshAccount('bucket', 'PRO');
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.allowanceRemaining': 2, 'credits.purchasedBalance': 10 });
    const r = await creditsService.charge(accountId, 'SOURCING_PROFILE', 3); // 5 credits: 2 allowance + 3 purchased
    await creditsService.refund(r.txId);
    const b = await creditsService.getBalance(accountId);
    expect(b.purchasedBalance).toBe(10);
    expect(b.allowanceRemaining).toBe(2);
  });

  it('resets an elapsed period on spend, not only on billing reads', async () => {
    const accountId = await freshAccount('spend-reset', 'PRO');
    await AccountModel.findByIdAndUpdate(accountId, {
      'credits.allowanceRemaining': 0,
      'credits.periodResetAt': new Date(Date.now() - 60 * 1000),
      'credits.screeningsUsed': 300,
    });
    const r = await creditsService.charge(accountId, 'JD_GENERATION', 1);
    expect(r.balance).toBe(PLAN_CREDIT_ALLOWANCE.PRO - 1);
    expect((await creditsService.getBalance(accountId)).screeningsUsed).toBe(0);
  });

  it('refills the allowance on a renewal webhook but not on a same-period event', async () => {
    const accountId = await freshAccount('renewal', 'PRO');
    const periodEnd = new Date(Date.now() + 10 * 86400 * 1000);
    await AccountModel.findByIdAndUpdate(accountId, {
      'billing.currentPeriodEnd': periodEnd,
      'credits.allowanceRemaining': 40,
    });
    const event = (id: string, end: Date) => ({
      id, type: 'subscription.updated', accountId, plan: 'PRO' as const, billingCycle: null,
      customerId: 'cus_1', subscriptionId: 'sub_1', status: 'active' as const,
      currentPeriodEnd: end.toISOString(), cancelAtPeriodEnd: false, creditPack: null, raw: {},
    });

    await billingService.applyWebhookEvent(event('evt_same_period', periodEnd));
    expect((await creditsService.getBalance(accountId)).allowanceRemaining).toBe(40);

    await billingService.applyWebhookEvent(event('evt_renewal', new Date(periodEnd.getTime() + 30 * 86400 * 1000)));
    expect((await creditsService.getBalance(accountId)).allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.PRO);
  });

  it('exposes the balance to non-admin members', async () => {
    const ownerToken = await tokenFor('members-owner@test.com', 'Members Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Members Owner', company: 'Memberco' });
    const workspaceId = onboard.body.data.id as string;
    await activateSubscription(workspaceId, 'PRO');
    const recruiterToken = await tokenFor('members-recruiter@test.com', 'Members Recruiter');
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${recruiterToken}`);
    await WorkspaceMemberModel.create({ workspaceId, userId: me.body.data.user?.id ?? me.body.data.id, role: 'recruiter' });
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/credits`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .set('X-Workspace-Id', workspaceId);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(PLAN_CREDIT_ALLOWANCE.PRO);
    expect(res.body.data.screeningQuota).toBe(300);
  });
});
