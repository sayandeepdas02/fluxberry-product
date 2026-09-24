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
import { CREDIT_COSTS, PLAN_CREDIT_ALLOWANCE } from '../../src/shared';

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
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
    expect(afterGen.body.data.credits.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.PRO - CREDIT_COSTS.JD_GENERATION);

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
    expect(afterGen2.body.data.credits.purchasedBalance).toBe(250 - CREDIT_COSTS.JD_GENERATION);
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
});
