import { sourcingCampaignRepository, sourcingRecipientRepository } from '../../repositories/sourcing.repository';
import { jobQueue } from '../../queue/job-queue';
import type { JobHandler } from './index';

/**
 * Fan a campaign out into one SEND_SOURCING_EMAIL job per pending recipient,
 * staggered to throttle the provider, then mark the campaign dispatched.
 */
export const sendSourcingCampaignHandler: JobHandler = async (payload, ctx) => {
  const { campaignId, scheduledAt } = payload as {
    campaignId: string;
    workspaceId: string;
    scheduledAt?: string | null;
  };
  const campaign = await sourcingCampaignRepository.findById(campaignId);
  if (!campaign) {
    ctx.logger.warn({ campaignId }, 'send-sourcing-campaign: campaign not found');
    return;
  }

  // Skip a superseded job: if the campaign was rescheduled (or already sent), the
  // effective scheduled time no longer matches this job's payload — don't send.
  const currentScheduledAt = campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null;
  if ((scheduledAt ?? null) !== currentScheduledAt) {
    ctx.logger.info({ campaignId }, 'send-sourcing-campaign: stale job (rescheduled) — skipping');
    return;
  }

  await sourcingCampaignRepository.update(campaignId, { status: 'SENDING' });

  const recipients = await sourcingRecipientRepository.listByCampaign(campaignId);
  const pending = recipients.filter((r: any) => r.status === 'PENDING');

  let i = 0;
  for (const r of pending) {
    await jobQueue.enqueue(
      'SEND_SOURCING_EMAIL',
      { recipientId: String(r._id) },
      { runAt: new Date(Date.now() + i * 2000), idempotencyKey: `sourcing-email-${r._id}` },
    );
    i++;
  }

  await sourcingCampaignRepository.update(campaignId, { status: 'SENT', sentAt: new Date() });
  ctx.logger.info({ campaignId, dispatched: pending.length }, 'sourcing campaign dispatched');
};
