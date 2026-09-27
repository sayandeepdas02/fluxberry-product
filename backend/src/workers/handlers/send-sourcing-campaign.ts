import crypto from 'node:crypto';
import type { WorkspacePlan } from '../../shared';
import { PLAN_DAILY_OUTREACH_CAP } from '../../shared';
import {
  sourcingCampaignRepository,
  sourcingRecipientRepository,
  outreachUsageRepository,
  utcDay,
} from '../../repositories/sourcing.repository';
import { accountRepository } from '../../repositories/account.repository';
import { jobQueue } from '../../queue/job-queue';
import { sourcingService } from '../../services/sourcing.service';
import type { JobHandler } from './index';

/** Start of the next UTC day (plus a minute of slack), when a new day's cap opens. */
function nextUtcDayStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return new Date(d.getTime() + 60_000);
}

/**
 * Fan a campaign out into one SEND_SOURCING_EMAIL job per pending recipient,
 * staggered to throttle the provider. The plan's daily sending cap is enforced
 * HERE, against the UTC day the emails actually go out (not the day Send was
 * pressed): only as many recipients as today's remaining allowance are queued,
 * and the rest continue automatically when the next day's cap opens.
 */
export const sendSourcingCampaignHandler: JobHandler = async (payload, ctx) => {
  const { campaignId, workspaceId, scheduledAt, run } = payload as {
    campaignId: string;
    workspaceId: string;
    scheduledAt?: string | null;
    /** The send's credit reservation id — identifies which send this job belongs to. */
    run?: string | null;
  };
  const campaign = await sourcingCampaignRepository.findById(campaignId);
  if (!campaign) {
    ctx.logger.warn({ campaignId }, 'send-sourcing-campaign: campaign not found');
    return;
  }

  // Skip a superseded job: if the campaign was rescheduled (or re-sent), the
  // effective scheduled time / send run no longer matches this job's payload.
  const currentScheduledAt = campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null;
  const staleRun = run !== undefined && (run ?? null) !== (campaign.creditTxId ?? null);
  if ((scheduledAt ?? null) !== currentScheduledAt || staleRun || !['SCHEDULED', 'SENDING'].includes(campaign.status)) {
    ctx.logger.info({ campaignId }, 'send-sourcing-campaign: stale job (rescheduled, re-sent, or stopped) — skipping');
    return;
  }

  const account = await accountRepository.ensureForWorkspace(workspaceId);
  const cap = PLAN_DAILY_OUTREACH_CAP[(account?.plan as WorkspacePlan) ?? 'FREE'] ?? 0;
  if (cap <= 0) {
    // The plan has no outreach allowance (e.g. downgraded after scheduling) —
    // deferring would loop forever. Stop, skip what's unsent, refund it.
    await sourcingRecipientRepository.skipUndispatched(campaignId, 'Your plan has no outreach sending allowance');
    await sourcingCampaignRepository.update(campaignId, { status: 'FAILED' });
    await sourcingService.settleCampaignCredits(campaignId);
    ctx.logger.warn({ campaignId }, 'send-sourcing-campaign: plan outreach cap is 0 — campaign failed, unsent refunded');
    return;
  }

  await sourcingCampaignRepository.update(campaignId, { status: 'SENDING' });

  const enqueueSends = async (recipients: { _id: unknown }[]) => {
    let i = 0;
    for (const r of recipients) {
      await jobQueue.enqueue(
        'SEND_SOURCING_EMAIL',
        { recipientId: String(r._id) },
        { runAt: new Date(Date.now() + i * 2000), idempotencyKey: `sourcing-email-${r._id}` },
      );
      i++;
    }
  };

  // A previous attempt of this job may have reserved + claimed recipients and then
  // failed while queueing: re-queue those (idempotent keys) without reserving again.
  await enqueueSends(await sourcingRecipientRepository.listDispatchedPending(campaignId));

  const pending = await sourcingRecipientRepository.listUndispatched(campaignId);
  const granted = await outreachUsageRepository.reserveUpTo(workspaceId, pending.length, cap);
  let batch: { _id: unknown }[] = [];
  if (granted > 0) {
    // Persist the reservation on the recipients before queueing anything, so a
    // retry reuses it; hand back whatever a concurrent run claimed first.
    const token = crypto.randomBytes(12).toString('hex');
    try {
      batch = await sourcingRecipientRepository.claimForDispatch(pending.slice(0, granted).map((r) => r._id), token);
    } catch (err) {
      await outreachUsageRepository.release(workspaceId, utcDay(), granted);
      throw err;
    }
    if (batch.length < granted) await outreachUsageRepository.release(workspaceId, utcDay(), granted - batch.length);
    await enqueueSends(batch);
  }

  const deferred = pending.length - batch.length;
  if (deferred > 0) {
    // Today's cap is used up — carry the rest into the next UTC day.
    const resumeAt = nextUtcDayStart();
    await jobQueue.enqueue(
      'SEND_SOURCING_CAMPAIGN',
      { campaignId, workspaceId, scheduledAt: scheduledAt ?? null, run: campaign.creditTxId ?? null },
      { runAt: resumeAt, idempotencyKey: `sourcing-campaign-${campaignId}-${campaign.creditTxId}-cont-${utcDay(resumeAt)}` },
    );
    ctx.logger.info({ campaignId, dispatched: batch.length, deferred }, 'daily outreach cap reached — continuing next UTC day');
    return;
  }

  await sourcingCampaignRepository.update(campaignId, { status: 'SENT', sentAt: new Date() });
  if (batch.length === 0) await sourcingService.settleCampaignCredits(campaignId);
  ctx.logger.info({ campaignId, dispatched: batch.length }, 'sourcing campaign dispatched');
};
