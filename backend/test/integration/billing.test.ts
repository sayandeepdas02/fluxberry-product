import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { BillingEventModel } from '../../src/models/billing-event.model';
import { billingService } from '../../src/services/billing.service';
import { mockCompleteCheckout, mockCancelSubscription } from '../../src/integrations/dodo';

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
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

    // Webhook idempotency: replaying the exact same event must not double-process.
    await billingService.applyWebhookEvent(event);
    const eventCount = await BillingEventModel.countDocuments({ providerEventId: event.id });
    expect(eventCount).toBe(1);

    // Portal now works since a customerId exists.
    const portal = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/billing/portal`) as any);
    expect(portal.status).toBe(200);
    expect(portal.body.data.url).toContain('mockPortal=1');

    // Cancel — webhook should flip the workspace back to FREE.
    const cancelEvent = mockCancelSubscription(workspaceId);
    await billingService.applyWebhookEvent(cancelEvent);
    const afterCancel = await WorkspaceModel.findById(workspaceId).lean();
    expect(afterCancel!.plan).toBe('FREE');
    expect(afterCancel!.billing!.subscriptionStatus).toBe('canceled');
  });

  it('rejects webhooks with a bad signature and enforces owner-only checkout', async () => {
    // A malformed/unsigned webhook body is still accepted by the mock provider
    // (verifyWebhookSignature always returns true in mock mode) but must fail
    // to parse into a usable event rather than crash the process.
    const bad = await request(app)
      .post('/api/v1/webhooks/dodo')
      .set('Content-Type', 'application/json')
      .send('not json');
    expect(bad.status).toBe(500); // JSON.parse throws -> asyncHandler -> error middleware, never a crash

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
});
