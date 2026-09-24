import type { WorkspacePlan, BillingStatusDto, BillingSubscriptionStatus, BillingCycle } from '../shared';
import { PLAN_FEATURES, ACTIVE_BILLING_STATUSES, findCreditPack } from '../shared';
import { getBillingProvider } from '../integrations';
import type { BillingWebhookEvent } from '../integrations/dodo/types';
import { accountRepository } from '../repositories/account.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { userRepository } from '../repositories/user.repository';
import { billingRepository } from '../repositories/billing.repository';
import { creditsService } from './credits.service';
import { jobQueue } from '../queue/job-queue';
import { config } from '../config/env';
import { badRequest, notFound } from '../utils/errors';
import { logger } from '../utils/logger';

export const billingService = {
  /**
   * Every billing surface is reached through a workspace route (`/workspaces/:id/billing*`)
   * but operates on the workspace's owning Account — the subscription + credit
   * pool are per-account, shared by all of the account's workspaces and members.
   */
  async createCheckout(
    workspaceId: string,
    userId: string,
    plan: WorkspacePlan,
    billingCycle: BillingCycle,
  ): Promise<{ url: string }> {
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found for this workspace');
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');

    const session = await getBillingProvider().createCheckoutSession({
      accountId: String(account._id),
      plan,
      billingCycle,
      customerEmail: user.email,
      successUrl: `${config.publicAppUrl}/app/settings/billing?checkout=success`,
      cancelUrl: `${config.publicAppUrl}/app/settings/billing?checkout=cancel`,
    });
    return { url: session.url };
  },

  /** One-time checkout to buy an AI-credit top-up pack. */
  async createCreditPackCheckout(
    workspaceId: string,
    userId: string,
    packId: string,
  ): Promise<{ url: string }> {
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found for this workspace');
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');
    const pack = findCreditPack(packId);
    if (!pack) throw badRequest('Unknown credit pack');

    const session = await getBillingProvider().createCreditPackCheckout({
      accountId: String(account._id),
      packId: pack.id,
      credits: pack.credits,
      productId: config.providers.billing.creditPackProductIds[pack.id] ?? '',
      customerEmail: user.email,
      successUrl: `${config.publicAppUrl}/app/settings/billing?checkout=credits_success`,
      cancelUrl: `${config.publicAppUrl}/app/settings/billing?checkout=cancel`,
    });
    return { url: session.url };
  },

  /** The account's AI-credit ledger (most recent first). */
  async getCreditHistory(workspaceId: string) {
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found for this workspace');
    return creditsService.history(String(account._id));
  },

  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found for this workspace');
    if (!account.billing?.customerId) {
      throw badRequest('No billing account yet — upgrade to a paid plan first.');
    }

    const session = await getBillingProvider().createPortalSession({
      customerId: account.billing.customerId,
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
   * Applies a verified billing event to the account's plan/subscription/credit
   * state. Called by the PROCESS_BILLING_WEBHOOK worker handler.
   */
  async applyWebhookEvent(event: BillingWebhookEvent): Promise<void> {
    // DB-level idempotency in addition to the job queue's own idempotencyKey —
    // guards against a worker crashing after this write but before the queue
    // job is marked complete (which would otherwise let it replay once).
    if (await billingRepository.eventExists(event.id)) return;

    await billingRepository.recordEvent({
      accountId: event.accountId,
      providerEventId: event.id,
      type: event.type,
      payload: event.raw,
    });

    if (!event.accountId) {
      logger.warn(
        { eventId: event.id, type: event.type },
        'billing webhook has no accountId — recorded, no change applied',
      );
      return;
    }

    // One-time credit-pack purchase — grant credits, no plan/subscription change.
    if (event.creditPack) {
      await creditsService.grantPurchase(
        event.accountId,
        event.creditPack.credits,
        `dodo-pack-${event.id}`,
        { packId: event.creditPack.packId, eventId: event.id },
      );
      return;
    }

    if (event.status && ACTIVE_BILLING_STATUSES.includes(event.status)) {
      // active, plus Dodo's past_due/on_hold dunning grace period — access
      // stays unlocked, so keep (or set) the paid plan. Never downgrade a paid
      // plan on a renewal event that happens to omit plan metadata.
      const account = await accountRepository.findById(event.accountId);
      const currentPlan = (account?.plan as WorkspacePlan) ?? 'FREE';
      const nextPlan: WorkspacePlan = event.plan ?? (currentPlan !== 'FREE' ? currentPlan : 'PRO');

      await accountRepository.applySubscription(event.accountId, {
        plan: nextPlan,
        billingCycle: event.billingCycle ?? undefined,
        customerId: event.customerId,
        subscriptionId: event.subscriptionId,
        subscriptionStatus: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      });
      await workspaceRepository.setPlanForAccount(event.accountId, nextPlan);
      // (Re)grant the monthly allowance for the (possibly new) plan and anchor
      // the reset to this period's end. Idempotent per event.
      await creditsService.grantPlanAllowance(event.accountId, nextPlan, event.currentPeriodEnd, `dodo-grant-${event.id}`);
      return;
    }

    if (
      event.status === 'pending' ||
      event.status === 'paused' ||
      event.status === 'cancelled' ||
      event.status === 'expired' ||
      event.status === 'failed'
    ) {
      await accountRepository.applySubscription(event.accountId, {
        plan: 'FREE',
        customerId: event.customerId,
        subscriptionId: event.subscriptionId,
        subscriptionStatus: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      });
      await workspaceRepository.setPlanForAccount(event.accountId, 'FREE');
      // Drop the monthly allowance to the free tier (0). Purchased top-ups are
      // untouched — they never expire.
      await creditsService.grantPlanAllowance(event.accountId, 'FREE', event.currentPeriodEnd, `dodo-grant-${event.id}`);
      return;
    }

    logger.info(
      { eventId: event.id, type: event.type, status: event.status },
      'billing webhook recorded, no plan change needed',
    );
  },

  async getStatus(workspaceId: string): Promise<BillingStatusDto> {
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found for this workspace');

    const plan = (account.plan as WorkspacePlan) ?? 'FREE';
    const enabledFeatures = PLAN_FEATURES[plan].filter((flag) => config.features[flag]);
    const credits = await creditsService.getBalance(String(account._id));

    return {
      plan,
      subscriptionStatus: (account.billing?.subscriptionStatus as BillingSubscriptionStatus) ?? 'none',
      billingCycle: (account.billing?.billingCycle as BillingCycle | undefined) ?? null,
      currentPeriodEnd: account.billing?.currentPeriodEnd
        ? account.billing.currentPeriodEnd.toISOString()
        : null,
      hasBillingAccount: Boolean(account.billing?.customerId),
      enabledFeatures,
      credits,
    };
  },
};
