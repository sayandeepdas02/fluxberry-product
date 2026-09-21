import crypto from 'node:crypto';
import type { WorkspacePlan, BillingSubscriptionStatus, BillingCycle } from '../../shared';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PortalSessionInput,
  PortalSessionResult,
  SubscriptionInfo,
} from './types';
import { logger } from '../../utils/logger';

interface MockSubscriptionRecord {
  customerId: string;
  subscriptionId: string;
  plan: WorkspacePlan;
  billingCycle: BillingCycle;
  status: BillingSubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/** In-memory state so dev/tests can drive a full checkout → webhook loop with no network. */
export const mockSubscriptions = new Map<string, MockSubscriptionRecord>(); // keyed by workspaceId
const mockSessions = new Map<string, { workspaceId: string; plan: WorkspacePlan; billingCycle: BillingCycle }>(); // keyed by sessionId

export class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${crypto.randomBytes(8).toString('hex')}`;
    mockSessions.set(sessionId, { workspaceId: input.workspaceId, plan: input.plan, billingCycle: input.billingCycle });
    const sep = input.successUrl.includes('?') ? '&' : '?';
    logger.info({ sessionId, workspaceId: input.workspaceId }, '[mock billing] checkout session created');
    return { sessionId, url: `${input.successUrl}${sep}mockCheckoutSession=${sessionId}` };
  }

  async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
    const sep = input.returnUrl.includes('?') ? '&' : '?';
    return { url: `${input.returnUrl}${sep}mockPortal=1` };
  }

  parseWebhookEvent(rawBody: Buffer): BillingWebhookEvent {
    return JSON.parse(rawBody.toString('utf8')) as BillingWebhookEvent;
  }

  async getSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    for (const sub of mockSubscriptions.values()) {
      if (sub.customerId === customerId) {
        return {
          customerId: sub.customerId,
          subscriptionId: sub.subscriptionId,
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        };
      }
    }
    return null;
  }
}

/**
 * Test/dev helper: simulate the candidate finishing a mock checkout session,
 * producing the same normalized event shape `parseWebhookEvent` would hand
 * back for a real Dodo event — callers process it exactly like a real webhook.
 */
export function mockCompleteCheckout(sessionId: string): BillingWebhookEvent {
  const session = mockSessions.get(sessionId);
  if (!session) throw new Error(`Unknown mock checkout session: ${sessionId}`);

  const customerId = `mock_cus_${crypto.createHash('sha1').update(session.workspaceId).digest('hex').slice(0, 12)}`;
  const subscriptionId = `mock_sub_${crypto.randomBytes(6).toString('hex')}`;
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  mockSubscriptions.set(session.workspaceId, {
    customerId,
    subscriptionId,
    plan: session.plan,
    billingCycle: session.billingCycle,
    status: 'active',
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
  });
  mockSessions.delete(sessionId);

  return {
    id: `mock_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'subscription.active',
    workspaceId: session.workspaceId,
    plan: session.plan,
    billingCycle: session.billingCycle,
    customerId,
    subscriptionId,
    status: 'active',
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    raw: { mock: true, sessionId },
  };
}

/** Test/dev helper: simulate a cancellation webhook for a workspace's active mock subscription. */
export function mockCancelSubscription(workspaceId: string): BillingWebhookEvent {
  const sub = mockSubscriptions.get(workspaceId);
  if (!sub) throw new Error(`No mock subscription for workspace: ${workspaceId}`);
  sub.status = 'cancelled';

  return {
    id: `mock_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'subscription.cancelled',
    workspaceId,
    plan: null,
    billingCycle: null,
    customerId: sub.customerId,
    subscriptionId: sub.subscriptionId,
    status: 'cancelled',
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    raw: { mock: true },
  };
}

export function __resetMockBilling(): void {
  mockSubscriptions.clear();
  mockSessions.clear();
}
