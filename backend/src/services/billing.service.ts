import type { WorkspacePlan, BillingStatusDto, BillingSubscriptionStatus, BillingCycle } from '../shared';
import { PLAN_FEATURES, ACTIVE_BILLING_STATUSES } from '../shared';
import { getBillingProvider } from '../integrations';
import type { BillingWebhookEvent } from '../integrations/dodo/types';
import { workspaceRepository } from '../repositories/workspace.repository';
import { userRepository } from '../repositories/user.repository';
import { billingRepository } from '../repositories/billing.repository';
import { jobQueue } from '../queue/job-queue';
import { config } from '../config/env';
import { badRequest, notFound } from '../utils/errors';
import { logger } from '../utils/logger';

export const billingService = {
  async createCheckout(
    workspaceId: string,
    userId: string,
    plan: WorkspacePlan,
    billingCycle: BillingCycle,
  ): Promise<{ url: string }> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw notFound('Workspace not found');
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');

    const session = await getBillingProvider().createCheckoutSession({
      workspaceId,
      plan,
      billingCycle,
      customerEmail: user.email,
      successUrl: `${config.publicAppUrl}/app/settings/billing?checkout=success`,
      cancelUrl: `${config.publicAppUrl}/app/settings/billing?checkout=cancel`,
    });
    return { url: session.url };
  },

  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw notFound('Workspace not found');
    if (!workspace.billing?.customerId) {
      throw badRequest('No billing account yet — upgrade to a paid plan first.');
    }

    const session = await getBillingProvider().createPortalSession({
      customerId: workspace.billing.customerId,
      returnUrl: `${config.publicAppUrl}/app/settings/billing`,
    });
    return { url: session.url };
  },

  /**
   * Verifies the webhook signature (throws if invalid), then hands off to the
   * async worker. Never mutates the database synchronously here — a slow
   * write must never cause the provider to see a timeout and retry-storm
   * this endpoint.
   */
  async handleWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<void> {
    let event;
    try {
      event = getBillingProvider().parseWebhookEvent(rawBody, headers);
    } catch {
      throw badRequest('Invalid webhook signature');
    }
    await jobQueue.enqueue('PROCESS_BILLING_WEBHOOK', event, {
      idempotencyKey: `dodo-webhook-${event.id}`,
    });
  },

  /**
   * Applies a verified billing event to the workspace's plan/subscription
   * state. Called by the PROCESS_BILLING_WEBHOOK worker handler — kept here
   * (rather than in the handler itself) so it's a plain service method tests
   * can call directly, same as e.g. codingGradingService.grade().
   */
  async applyWebhookEvent(event: BillingWebhookEvent): Promise<void> {
    // DB-level idempotency in addition to the job queue's own idempotencyKey —
    // guards against a worker crashing after this write but before the queue
    // job is marked complete (which would otherwise let it replay once).
    if (await billingRepository.eventExists(event.id)) return;

    await billingRepository.recordEvent({
      workspaceId: event.workspaceId,
      providerEventId: event.id,
      type: event.type,
      payload: event.raw,
    });

    if (!event.workspaceId) {
      logger.warn(
        { eventId: event.id, type: event.type },
        'billing webhook has no workspaceId — recorded, no plan change applied',
      );
      return;
    }

    if (event.status && ACTIVE_BILLING_STATUSES.includes(event.status)) {
      // active, plus Dodo's past_due/on_hold dunning grace period — access
      // stays unlocked, so keep (or set) the PRO plan.
      await billingRepository.applySubscription(event.workspaceId, {
        plan: event.plan ?? 'PRO',
        billingCycle: event.billingCycle ?? undefined,
        customerId: event.customerId,
        subscriptionId: event.subscriptionId,
        subscriptionStatus: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      });
      return;
    }

    if (
      event.status === 'pending' ||
      event.status === 'paused' ||
      event.status === 'cancelled' ||
      event.status === 'expired' ||
      event.status === 'failed'
    ) {
      await billingRepository.applySubscription(event.workspaceId, {
        plan: 'FREE',
        customerId: event.customerId,
        subscriptionId: event.subscriptionId,
        subscriptionStatus: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      });
      return;
    }

    logger.info(
      { eventId: event.id, type: event.type, status: event.status },
      'billing webhook recorded, no plan change needed',
    );
  },

  async getStatus(workspaceId: string): Promise<BillingStatusDto> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw notFound('Workspace not found');

    const plan = (workspace.plan as WorkspacePlan) ?? 'FREE';
    const enabledFeatures = PLAN_FEATURES[plan].filter((flag) => config.features[flag]);

    return {
      plan,
      subscriptionStatus: (workspace.billing?.subscriptionStatus as BillingSubscriptionStatus) ?? 'none',
      billingCycle: (workspace.billing?.billingCycle as BillingCycle | undefined) ?? null,
      currentPeriodEnd: workspace.billing?.currentPeriodEnd
        ? workspace.billing.currentPeriodEnd.toISOString()
        : null,
      hasBillingAccount: Boolean(workspace.billing?.customerId),
      enabledFeatures,
    };
  },
};
