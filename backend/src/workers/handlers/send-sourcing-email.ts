import {
  sourcingRecipientRepository,
  sourcingCampaignRepository,
  sourcingSuppressionRepository,
} from '../../repositories/sourcing.repository';
import { getEmailProvider } from '../../integrations';
import { renderTemplate, outreachHtml } from '../../utils/merge-tags';
import { sourcingService, sourcingUnsubscribeUrl, sourcingOpenPixelUrl, contactMergeContext } from '../../services/sourcing.service';
import { config } from '../../config/env';
import { isFinalAttempt, type JobHandler } from './index';

/**
 * Send one campaign email: personalize (merge tags + spintax), append the
 * compliance footer (unsubscribe + sender identity), and record the result.
 * Idempotent — a recipient already past PENDING is skipped, and the provider
 * idempotency key prevents a double-send on retry.
 */
export const sendSourcingEmailHandler: JobHandler = async (payload, ctx) => {
  const { recipientId } = payload as { recipientId: string };
  const recipient = await sourcingRecipientRepository.findById(recipientId);
  if (!recipient || recipient.status !== 'PENDING') return;

  const campaign = await sourcingCampaignRepository.findById(String(recipient.campaignId));
  if (!campaign) return;

  // Re-check suppression at send time (someone may have unsubscribed since queueing).
  const suppressed = await sourcingSuppressionRepository.suppressedAmong(String(recipient.workspaceId), [recipient.email]);
  if (suppressed.has(recipient.email.toLowerCase())) {
    await sourcingRecipientRepository.update(recipientId, { status: 'SKIPPED', error: 'On the workspace suppression list' });
    await sourcingService.settleCampaignCredits(String(recipient.campaignId));
    return;
  }

  const ctxMerge = contactMergeContext({
    fullName: recipient.fullName,
    company: recipient.company,
    title: recipient.title,
  });
  const subject = renderTemplate(campaign.subject, ctxMerge, recipientId);
  const body = renderTemplate(campaign.body, ctxMerge, recipientId);
  const html = outreachHtml(body, {
    unsubscribeUrl: sourcingUnsubscribeUrl(recipient.unsubscribeToken),
    openPixelUrl: sourcingOpenPixelUrl(recipient.unsubscribeToken),
    senderIdentity: campaign.fromName ?? undefined,
  });
  const inboundDomain = config.providers.messaging.inboundDomain;
  const replyTo = inboundDomain ? `campaign+${recipientId}@${inboundDomain}` : campaign.replyToEmail ?? undefined;

  // On failure, leave the recipient PENDING and rethrow so the queue retries
  // (the provider idempotency key guards against a double-send). On the final
  // attempt the failure is permanent: mark the recipient FAILED so the campaign
  // can finish and its credit reservation settles (this email is refunded).
  let res;
  try {
    res = await getEmailProvider().send({
      to: recipient.email,
      subject,
      html,
      text: body,
      replyTo,
      idempotencyKey: `sourcing-email-${recipientId}`,
    });
  } catch (err) {
    if (isFinalAttempt(ctx)) {
      await sourcingRecipientRepository.update(recipientId, {
        status: 'FAILED',
        error: (err as Error).message?.slice(0, 500) ?? 'Send failed',
      });
      await sourcingService.settleCampaignCredits(String(recipient.campaignId));
    }
    throw err;
  }

  await sourcingRecipientRepository.update(recipientId, {
    status: 'SENT',
    sentAt: new Date(),
    providerMessageId: res.id,
    error: null,
  });
  await sourcingService.settleCampaignCredits(String(recipient.campaignId));
};
