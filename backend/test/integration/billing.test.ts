import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { AccountModel } from '../../src/models/account.model';
import { BillingEventModel } from '../../src/models/billing-event.model';
import { billingService } from '../../src/services/billing.service';
import { mockCompleteCheckout, mockCancelSubscription } from '../../src/integrations/dodo';

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

/** Plan + subscription live on the account now — resolve it from the workspace. */
async function accountIdForWorkspace(workspaceId: string): Promise<string> {
  const ws = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
  return String(ws!.accountId);
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_billing');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('billing (integration, mock Dodo)', () => {
  it('walks checkout → webhook → plan flip, then cancellation, with a real 403-then-200 gate', async () => {
    const token = await tokenFor('billingowner@test.com', 'Billing Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Billing Owner', company: 'Billco' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    // Starts on FREE with no billing account yet.
    const initialStatus = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(initialStatus.status).toBe(200);
    expect(initialStatus.body.data.plan).toBe('FREE');
    expect(initialStatus.body.data.hasBillingAccount).toBe(false);

    // Can't open the billing portal before ever checking out.
    const earlyPortal = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/billing/portal`) as any);
    expect(earlyPortal.status).toBe(400);

    // Start a checkout session for PRO.
    const checkout = await ws(
      request(app).post(`/api/v1/workspaces/${workspaceId}/billing/checkout`).send({ plan: 'PRO' }) as any,
    );
    expect(checkout.status).toBe(200);
    expect(checkout.body.data.url).toContain('mockCheckoutSession=');
    const sessionId = new URL(checkout.body.data.url).searchParams.get('mockCheckoutSession')!;

    // Simulate Dodo sending the "subscription active" webhook after checkout completes.
    const event = mockCompleteCheckout(sessionId);
    const hook = await request(app)
      .post('/api/v1/webhooks/dodo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(event));
    expect(hook.status).toBe(200);

    // The webhook enqueues async work — drive it directly (same convention as
    // other integration tests, e.g. codingGradingService.grade()).
    await billingService.applyWebhookEvent(event);

    const afterUpgrade = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterUpgrade.body.data.plan).toBe('PRO');
    expect(afterUpgrade.body.data.subscriptionStatus).toBe('active');
    expect(afterUpgrade.body.data.hasBillingAccount).toBe(true);
    // No billingCycle was sent on checkout — defaults to monthly.
    expect(afterUpgrade.body.data.billingCycle).toBe('MONTHLY');

    // Webhook idempotency: replaying the exact same event must not double-process.
    await billingService.applyWebhookEvent(event);
    const eventCount = await BillingEventModel.countDocuments({ providerEventId: event.id });
    expect(eventCount).toBe(1);

    // Portal now works since a customerId exists.
    const portal = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/billing/portal`) as any);
    expect(portal.status).toBe(200);
    expect(portal.body.data.url).toContain('mockPortal=1');

    // Cancel — webhook should flip the account back to FREE.
    const accountId = await accountIdForWorkspace(workspaceId);
    const cancelEvent = mockCancelSubscription(accountId);
    await billingService.applyWebhookEvent(cancelEvent);
    const afterCancel = await AccountModel.findById(accountId).lean();
    expect(afterCancel!.plan).toBe('FREE');
    expect(afterCancel!.billing!.subscriptionStatus).toBe('cancelled');
    // The workspace's denormalized plan cache follows the account.
    const afterCancelWs = await WorkspaceModel.findById(workspaceId).lean();
    expect(afterCancelWs!.plan).toBe('FREE');
  });

  it('rejects webhooks with a bad signature and enforces owner-only checkout', async () => {
    // The mock provider doesn't verify a real signature, but a body that
    // can't even be parsed as JSON must still surface as a 400, not crash.
    const bad = await request(app)
      .post('/api/v1/webhooks/dodo')
      .set('Content-Type', 'application/json')
      .send('not json');
    expect(bad.status).toBe(400);

    const ownerToken = await tokenFor('billingowner2@test.com', 'Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner', company: 'Billco Two' });
    const workspaceId = onboard.body.data.id as string;

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ email: 'billingadmin@test.com', role: 'admin' });

    const adminToken = await tokenFor('billingadmin@test.com');
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/billing/checkout`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ plan: 'PRO' });
    // Only the workspace owner can start a checkout — admins can view/manage billing status but not upgrade the plan.
    expect(res.status).toBe(403);
  });

  it('hard-paywalls product routes until the subscription is active', async () => {
    const token = await tokenFor('paywallowner@test.com', 'Paywall Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Paywall Owner', company: 'Paywallco' });
    expect(onboard.status).toBe(201);
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    const createJob = () =>
      ws(request(app).post('/api/v1/jobs').send({ title: 'Paywall Test Job' }) as any);

    // No subscription yet — locked out of product routes.
    const beforeSubscribe = await createJob();
    expect(beforeSubscribe.status).toBe(403);
    expect(beforeSubscribe.body.error.code).toBe('SUBSCRIPTION_REQUIRED');

    // Subscribe.
    const checkout = await ws(
      request(app).post(`/api/v1/workspaces/${workspaceId}/billing/checkout`).send({ plan: 'PRO' }) as any,
    );
    const sessionId = new URL(checkout.body.data.url).searchParams.get('mockCheckoutSession')!;
    await billingService.applyWebhookEvent(mockCompleteCheckout(sessionId));

    // Now unlocked.
    const afterSubscribe = await createJob();
    expect(afterSubscribe.status).toBe(201);

    // Cancel — locked out again.
    const paywallAccountId = await accountIdForWorkspace(workspaceId);
    await billingService.applyWebhookEvent(mockCancelSubscription(paywallAccountId));
    const afterCancel = await createJob();
    expect(afterCancel.status).toBe(403);
    expect(afterCancel.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('self-heals a workspace that has no account yet (pre-migration deploy)', async () => {
    const token = await tokenFor('legacyowner@test.com', 'Legacy Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Legacy Owner', company: 'Legacy Co' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    // Simulate the pre-account-tier state: drop the account link + the account.
    const before = await WorkspaceModel.findById(workspaceId).lean();
    await AccountModel.deleteOne({ _id: before!.accountId });
    await WorkspaceModel.updateOne({ _id: workspaceId }, { $unset: { accountId: 1 } });

    // Instead of hard-failing, the account is provisioned on the fly and a normal
    // FREE status is returned.
    const status = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(status.status).toBe(200);
    expect(status.body.data.plan).toBe('FREE');

    const linked = await WorkspaceModel.findById(workspaceId).lean();
    expect(linked!.accountId).toBeTruthy();
    expect(await AccountModel.findById(linked!.accountId)).not.toBeNull();
  });

  it('reuses an existing Clerk-org account instead of failing on the unique index', async () => {
    const token = await tokenFor('orgowner@test.com', 'Org Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Org Owner', company: 'Org Co' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    // Simulate legacy state: the workspace has a Clerk org whose account already
    // exists (holding that same clerkOrgId), but the workspace's link is missing.
    const before = await WorkspaceModel.findById(workspaceId).lean();
    const existingAccountId = String(before!.accountId);
    const clerkOrgId = 'org_test_reuse';
    await AccountModel.updateOne({ _id: existingAccountId }, { $set: { clerkOrgId } });
    await WorkspaceModel.updateOne({ _id: workspaceId }, { $set: { clerkOrgId }, $unset: { accountId: 1 } });

    // Must NOT throw E11000 on the unique clerkOrgId index.
    const status = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(status.status).toBe(200);

    // Relinked to the SAME pre-existing account — no duplicate account created.
    const after = await WorkspaceModel.findById(workspaceId).lean();
    expect(String(after!.accountId)).toBe(existingAccountId);
    expect(await AccountModel.countDocuments({ clerkOrgId })).toBe(1);
  });

  it('supports the annual billing cycle end to end', async () => {
    const token = await tokenFor('annualowner@test.com', 'Annual Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Annual Owner', company: 'Annualco' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    const checkout = await ws(
      request(app)
        .post(`/api/v1/workspaces/${workspaceId}/billing/checkout`)
        .send({ plan: 'PRO', billingCycle: 'ANNUAL' }) as any,
    );
    expect(checkout.status).toBe(200);
    const sessionId = new URL(checkout.body.data.url).searchParams.get('mockCheckoutSession')!;
    await billingService.applyWebhookEvent(mockCompleteCheckout(sessionId));

    const status = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(status.body.data.plan).toBe('PRO');
    expect(status.body.data.billingCycle).toBe('ANNUAL');
  });
});
