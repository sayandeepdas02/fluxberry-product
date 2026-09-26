import { Types } from 'mongoose';
import { SourcingSearchModel, type SourcingSearchDoc } from '../models/sourcing-search.model';
import { SourcedContactModel } from '../models/sourced-contact.model';
import { SourcingListModel } from '../models/sourcing-list.model';
import { SourcingListMemberModel } from '../models/sourcing-list-member.model';
import { SourcingCampaignModel } from '../models/sourcing-campaign.model';
import { SourcingCampaignRecipientModel } from '../models/sourcing-campaign-recipient.model';
import { SourcingSuppressionModel } from '../models/sourcing-suppression.model';
import { OutreachDailyUsageModel } from '../models/outreach-daily-usage.model';
import {
  CompensationBandCacheModel,
  COMPENSATION_BAND_CACHE_TTL_MS,
} from '../models/compensation-band-cache.model';
import type { CompensationBandDto } from '../shared';

export const sourcingSearchRepository = {
  create: (data: Record<string, any>) => SourcingSearchModel.create(data),
  findInWorkspace: (workspaceId: string, id: string) =>
    SourcingSearchModel.findOne({ _id: id, workspaceId }),
  update: (id: string, patch: Record<string, any>) =>
    SourcingSearchModel.findByIdAndUpdate(id, patch, { new: true }),
  listByWorkspace: (workspaceId: string, limit = 30) =>
    SourcingSearchModel.find({ workspaceId }).sort({ createdAt: -1 }).limit(limit).lean(),
};

export const sourcedContactRepository = {
  findInWorkspace: (workspaceId: string, id: string) =>
    SourcedContactModel.findOne({ _id: id, workspaceId }),

  findByIds: (workspaceId: string, ids: (string | Types.ObjectId)[]) =>
    SourcedContactModel.find({
      workspaceId,
      _id: { $in: ids.map((id) => new Types.ObjectId(String(id))) },
    }).lean(),

  update: (id: string, patch: Record<string, any>) =>
    SourcedContactModel.findByIdAndUpdate(id, patch, { new: true }),

  /**
   * Atomically claims the right to run a PDL backfill for this contact —
   * matches only if `backfillAttemptedAt` is still null, so two concurrent
   * detail-view opens can't both trigger the paid PDL call. Returns the
   * claimed doc (with `backfillAttemptedAt` now stamped) on success, or null
   * if someone else already claimed/completed it first.
   */
  claimBackfill: (id: string) =>
    SourcedContactModel.findOneAndUpdate(
      { _id: id, backfillAttemptedAt: null },
      { $set: { backfillAttemptedAt: new Date() } },
      { new: true },
    ),

  /** Batched lookup by upstream id, for preserving previously-enriched fields across a re-cache (see cacheAndScore). */
  findManyByPdlIds: async (workspaceId: string, pdlIds: string[]): Promise<Map<string, any>> => {
    if (pdlIds.length === 0) return new Map();
    const rows = await SourcedContactModel.find({ workspaceId, pdlId: { $in: pdlIds } }).lean();
    return new Map(rows.map((r) => [r.pdlId as string, r]));
  },

  /**
   * Upsert a person by upstream id (dedupe within a workspace), returning the
   * saved doc. A null pdlId always inserts a fresh contact.
   */
  async upsertByPdlId(workspaceId: string, pdlId: string | null, data: Record<string, any>) {
    if (pdlId) {
      const doc = await SourcedContactModel.findOneAndUpdate(
        { workspaceId, pdlId },
        { $set: data, $setOnInsert: { workspaceId, pdlId } },
        { new: true, upsert: true },
      );
      return doc!;
    }
    return SourcedContactModel.create({ workspaceId, pdlId: null, ...data });
  },

  listByWorkspace: async (
    workspaceId: string,
    opts: { page: number; limit: number; search?: string; hasEmail?: boolean },
  ) => {
    const match: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
    if (opts.hasEmail === true) match.$or = [{ workEmail: { $ne: null } }, { personalEmail: { $ne: null } }];
    if (opts.search) {
      const rx = { $regex: opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      match.$and = [{ $or: [{ fullName: rx }, { company: rx }, { title: rx }] }];
    }
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      SourcedContactModel.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(opts.limit).lean(),
      SourcedContactModel.countDocuments(match),
    ]);
    return { items, total };
  },
};

export const sourcingListRepository = {
  create: (data: Record<string, any>) => SourcingListModel.create(data),
  findInWorkspace: (workspaceId: string, id: string) => SourcingListModel.findOne({ _id: id, workspaceId }),
  listByWorkspace: (workspaceId: string) =>
    SourcingListModel.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
  update: (id: string, patch: Record<string, any>) =>
    SourcingListModel.findByIdAndUpdate(id, patch, { new: true }),
  remove: (id: string) => SourcingListModel.deleteOne({ _id: id }),
  syncCount: async (listId: string) => {
    const count = await SourcingListMemberModel.countDocuments({ listId });
    return SourcingListModel.findByIdAndUpdate(listId, { contactCount: count }, { new: true });
  },
};

export const sourcingListMemberRepository = {
  /** Upsert memberships for many contacts; ignores contacts already in the list. */
  addMany: async (workspaceId: string, listId: string, contactIds: string[], addedBy: string | null) => {
    if (contactIds.length === 0) return;
    await SourcingListMemberModel.bulkWrite(
      contactIds.map((contactId) => ({
        updateOne: {
          filter: { listId: new Types.ObjectId(listId), contactId: new Types.ObjectId(contactId) },
          update: {
            $setOnInsert: {
              workspaceId: new Types.ObjectId(workspaceId),
              listId: new Types.ObjectId(listId),
              contactId: new Types.ObjectId(contactId),
              addedBy: addedBy ? new Types.ObjectId(addedBy) : null,
            },
          },
          upsert: true,
        },
      })),
    );
  },
  remove: (listId: string, contactId: string) =>
    SourcingListMemberModel.deleteOne({ listId, contactId }),
  removeAllInList: (listId: string) => SourcingListMemberModel.deleteMany({ listId }),
  contactIdsInList: async (listId: string): Promise<string[]> => {
    const rows = await SourcingListMemberModel.find({ listId }).select('contactId').lean();
    return rows.map((r) => String(r.contactId));
  },
};

export const sourcingCampaignRepository = {
  create: (data: Record<string, any>) => SourcingCampaignModel.create(data),
  findById: (id: string) => SourcingCampaignModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) => SourcingCampaignModel.findOne({ _id: id, workspaceId }),
  /** Atomically move an eligible campaign to SENDING so concurrent sends can't both proceed. */
  claimForSend: (workspaceId: string, id: string) =>
    SourcingCampaignModel.findOneAndUpdate(
      { _id: id, workspaceId, status: { $in: ['DRAFT', 'SCHEDULED', 'PAUSED', 'FAILED'] } },
      { $set: { status: 'SENDING' } },
      { new: true },
    ),
  listByWorkspace: (workspaceId: string) =>
    SourcingCampaignModel.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
  update: (id: string, patch: Record<string, any>) =>
    SourcingCampaignModel.findByIdAndUpdate(id, patch, { new: true }),
  remove: (id: string) => SourcingCampaignModel.deleteOne({ _id: id }),
};

export const sourcingRecipientRepository = {
  insertMany: (docs: Record<string, any>[]) => SourcingCampaignRecipientModel.insertMany(docs),
  listByCampaign: (campaignId: string) =>
    SourcingCampaignRecipientModel.find({ campaignId }).sort({ createdAt: 1 }).lean(),
  findById: (id: string) => SourcingCampaignRecipientModel.findById(id),
  findByToken: (token: string) => SourcingCampaignRecipientModel.findOne({ unsubscribeToken: token }),
  findByProviderMessageId: (providerMessageId: string) =>
    SourcingCampaignRecipientModel.findOne({ providerMessageId }),
  update: (id: string, patch: Record<string, any>) =>
    SourcingCampaignRecipientModel.findByIdAndUpdate(id, patch, { new: true }),
  deleteByCampaign: (campaignId: string) => SourcingCampaignRecipientModel.deleteMany({ campaignId }),
  deletePendingByCampaign: (campaignId: string) =>
    SourcingCampaignRecipientModel.deleteMany({ campaignId, status: 'PENDING' }),
  countPending: (campaignId: string) => SourcingCampaignRecipientModel.countDocuments({ campaignId, status: 'PENDING' }),
  /** Emails actually handed to the provider for this campaign since `since` (the latest credit charge). */
  countSentSince: (campaignId: string, since: Date) =>
    SourcingCampaignRecipientModel.countDocuments({ campaignId, sentAt: { $gte: since } }),

  /**
   * Aggregate a campaign into the monotonic funnel: sent/delivered/opened/replied
   * are derived from progression timestamps (which are never cleared), so a later
   * status change like an unsubscribe can't lower them. Terminal states
   * (bounced/unsubscribed/failed) come from the current status.
   */
  funnelCounts: async (campaignId: string) => {
    const notNull = (field: string) => ({ $cond: [{ $ne: [`$${field}`, null] }, 1, 0] });
    const eqStatus = (s: string) => ({ $cond: [{ $eq: ['$status', s] }, 1, 0] });
    const [row] = await SourcingCampaignRecipientModel.aggregate([
      { $match: { campaignId: new Types.ObjectId(campaignId) } },
      {
        $group: {
          _id: null,
          recipients: { $sum: 1 },
          sent: { $sum: notNull('sentAt') },
          delivered: {
            $sum: {
              $cond: [
                { $or: [{ $ne: ['$deliveredAt', null] }, { $ne: ['$openedAt', null] }, { $ne: ['$repliedAt', null] }] },
                1,
                0,
              ],
            },
          },
          opened: {
            $sum: { $cond: [{ $or: [{ $ne: ['$openedAt', null] }, { $ne: ['$repliedAt', null] }] }, 1, 0] },
          },
          replied: { $sum: notNull('repliedAt') },
          bounced: { $sum: eqStatus('BOUNCED') },
          unsubscribed: { $sum: eqStatus('UNSUBSCRIBED') },
          failed: { $sum: eqStatus('FAILED') },
        },
      },
    ]);
    return {
      recipients: row?.recipients ?? 0,
      sent: row?.sent ?? 0,
      delivered: row?.delivered ?? 0,
      opened: row?.opened ?? 0,
      replied: row?.replied ?? 0,
      bounced: row?.bounced ?? 0,
      unsubscribed: row?.unsubscribed ?? 0,
      failed: row?.failed ?? 0,
    };
  },
};

export const sourcingSuppressionRepository = {
  /** Return the subset of the given emails that are suppressed in this workspace. */
  suppressedAmong: async (workspaceId: string, emails: string[]): Promise<Set<string>> => {
    if (emails.length === 0) return new Set();
    const lowered = emails.map((e) => e.toLowerCase());
    const rows = await SourcingSuppressionModel.find({ workspaceId, email: { $in: lowered } })
      .select('email')
      .lean();
    return new Set(rows.map((r) => r.email));
  },
  add: (workspaceId: string, email: string, reason = 'unsubscribed') =>
    SourcingSuppressionModel.updateOne(
      { workspaceId, email: email.toLowerCase() },
      { $setOnInsert: { workspaceId, email: email.toLowerCase(), reason } },
      { upsert: true },
    ),
};

// Location is part of the cache identity — Levels.fyi's /get_salary_data
// returns a different band (and currency) per location, so two contacts at
// the same company+title in different countries must never share a cache row.
function compKeys(company: string, title?: string, location?: string) {
  return {
    companyKey: company.trim().toLowerCase(),
    titleKey: title?.trim().toLowerCase() ?? null,
    locationKey: location?.trim().toLowerCase() ?? null,
  };
}

export const compensationBandCacheRepository = {
  /** Returns the cached band (or cached null-coverage) if fresh; null if there's no cached entry, or it's gone stale, and a live lookup should run. */
  find: async (company: string, title?: string, location?: string): Promise<{ band: CompensationBandDto | null } | null> => {
    const doc = await CompensationBandCacheModel.findOne(compKeys(company, title, location)).lean();
    if (!doc) return null;
    if (Date.now() - doc.fetchedAt.getTime() > COMPENSATION_BAND_CACHE_TTL_MS) return null;
    return { band: (doc.band as CompensationBandDto | null) ?? null };
  },
  save: (company: string, title: string | undefined, location: string | undefined, band: CompensationBandDto | null) =>
    CompensationBandCacheModel.findOneAndUpdate(
      compKeys(company, title, location),
      { $set: { band, fetchedAt: new Date() } },
      { upsert: true, new: true },
    ),
};

const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

/** Atomic per-workspace, per-UTC-day outreach counter backing the daily sending cap. */
export const outreachUsageRepository = {
  /**
   * Reserve `n` sends against today's cap. Succeeds only if count + n ≤ cap,
   * atomically, so concurrent sends can't jointly overshoot. Returns the day key
   * to release with on success, or null (with today's count) when over the cap.
   */
  async reserve(workspaceId: string, n: number, cap: number): Promise<{ day: string | null; used: number }> {
    const day = utcDay();
    try {
      await OutreachDailyUsageModel.updateOne(
        { workspaceId, day },
        { $setOnInsert: { workspaceId, day, count: 0 } },
        { upsert: true },
      );
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // lost the upsert race — row exists now
    }
    const reserved = await OutreachDailyUsageModel.findOneAndUpdate(
      { workspaceId, day, count: { $lte: cap - n } },
      { $inc: { count: n } },
      { new: true },
    ).lean();
    if (reserved) return { day, used: reserved.count };
    const current = await OutreachDailyUsageModel.findOne({ workspaceId, day }).lean();
    return { day: null, used: current?.count ?? 0 };
  },

  /** Give back a reservation (the send aborted before queueing anything). */
  release: (workspaceId: string, day: string, n: number) =>
    OutreachDailyUsageModel.updateOne({ workspaceId, day }, { $inc: { count: -n } }),
};
