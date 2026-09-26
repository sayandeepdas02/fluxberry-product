import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import type {
  SourcingCriteria,
  SourcingSearchResultDto,
  SourcingSearchDto,
  SourcedContactDto,
  SourcingListDto,
  SourcingContactListQuery,
  CreateListInput,
  UpdateListInput,
  Paginated,
  SourcingCampaignDto,
  SourcingCampaignRecipientDto,
  CreateCampaignInput,
  UpdateCampaignInput,
  DraftCampaignInput,
  CampaignDraftDto,
  CompensationBandDto,
} from '../shared';
import { SOURCING_PAGE_SIZE, SOURCING_MAX_PAGE_SIZE, CREDIT_COSTS } from '../shared';
import {
  sourcingSearchRepository,
  sourcedContactRepository,
  sourcingListRepository,
  sourcingListMemberRepository,
  sourcingCampaignRepository,
  sourcingRecipientRepository,
  sourcingSuppressionRepository,
  compensationBandCacheRepository,
} from '../repositories/sourcing.repository';
import { accountRepository } from '../repositories/account.repository';
import { jobRepository } from '../repositories/job.repository';
import { applicationRepository } from '../repositories/application.repository';
import { WorkspaceModel } from '../models/workspace.model';
import { candidateService } from './candidate.service';
import { getAIProvider, getPeopleSourcingProvider, getCompensationProvider, getEmailProvider } from '../integrations';
import { hasEnrichmentGap } from '../integrations/monid/types';
import { jobQueue } from '../queue/job-queue';
import { creditsService } from './credits.service';
import {
  toSourcedContactDto,
  toSourcingSearchDto,
  toSourcingListDto,
  toSourcingCampaignDto,
  toSourcingCampaignRecipientDto,
} from '../serializers/sourcing.serializer';
import { scoreContact } from './sourcing.scoring';
import { renderTemplate, firstNameOf, outreachHtml, type MergeContext } from '../utils/merge-tags';
import { config } from '../config/env';
import { notFound, badRequest, conflict, providerError } from '../utils/errors';
import { logger } from '../utils/logger';

const SEARCH_ACTION = 'SOURCING_SEARCH' as const;
/** Credits charged per search page — reported usage always matches the real charge. */
const SEARCH_COST = CREDIT_COSTS[SEARCH_ACTION];

function providerName(): 'MONID' | 'MOCK' {
  return config.providers.sourcing.apiKey && !config.providers.mockAll ? 'MONID' : 'MOCK';
}

/** Resolve the account that owns a workspace (the credit-spending authority). */
async function resolveAccountId(workspaceId: string): Promise<string> {
  const account = await accountRepository.ensureForWorkspace(workspaceId);
  if (!account) throw notFound('Billing account not found');
  return String(account._id);
}

function pageSize(size?: number): number {
  const cap = Math.min(SOURCING_MAX_PAGE_SIZE, config.providers.sourcing.maxResults);
  return Math.max(1, Math.min(size ?? SOURCING_PAGE_SIZE, cap));
}

/** Cache a page of people (dedupe by pdlId), score them, and return docs ordered best-fit first. */
async function cacheAndScore(
  workspaceId: string,
  criteria: SourcingCriteria,
  people: Awaited<ReturnType<ReturnType<typeof getPeopleSourcingProvider>['search']>>['people'],
): Promise<any[]> {
  const provider = providerName();
  const docs: any[] = [];
  for (const p of people) {
    const { score, reasons } = scoreContact(criteria, p);
    const doc = await sourcedContactRepository.upsertByPdlId(workspaceId, p.providerId ?? null, {
      provider,
      fullName: p.fullName,
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      title: p.title ?? null,
      seniority: p.seniority ?? null,
      company: p.company ?? null,
      companySize: p.companySize ?? null,
      industry: p.industry ?? null,
      location: p.location ?? null,
      country: p.country ?? null,
      yearsExperience: p.yearsExperience ?? null,
      skills: p.skills ?? [],
      linkedinUrl: p.linkedinUrl ?? null,
      githubUrl: p.githubUrl ?? null,
      workEmail: p.workEmail ?? null,
      personalEmail: p.personalEmail ?? null,
      phone: p.phone ?? null,
      experience: p.experience ?? [],
      education: p.education ?? [],
      rawProfile: p,
      matchScore: score,
      matchReasons: reasons,
    });
    docs.push(doc);
  }
  docs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  return docs;
}

/** Re-score cached contacts against a search's current criteria (keeps ranking stable on rehydrate). */
function rescore(criteria: SourcingCriteria, contacts: any[]): any[] {
  return contacts
    .map((c) => {
      const { score, reasons } = scoreContact(criteria, c);
      return { ...c, matchScore: score, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export const sourcingService = {
  /** Free step: turn a natural-language prompt into editable criteria (no PDL spend). */
  async parse(prompt: string): Promise<SourcingCriteria> {
    const { criteria } = await getAIProvider().parseSourcingQuery({ prompt });
    return criteria;
  },

  /**
   * Run a new search: parse (unless edited criteria are supplied) → PDL page →
   * cache + score → persist. Spends SOURCING_SEARCH credits (refunded if the
   * provider fails), so the search doc is created first for a stable spend key.
   */
  async search(
    workspaceId: string,
    createdBy: string | null,
    input: { prompt: string; criteria?: SourcingCriteria; size?: number },
  ): Promise<SourcingSearchResultDto> {
    const criteria = input.criteria ?? (await this.parse(input.prompt));
    const size = pageSize(input.size);
    const accountId = await resolveAccountId(workspaceId);

    const search = await sourcingSearchRepository.create({
      workspaceId,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : null,
      prompt: input.prompt,
      criteria,
      status: 'RUNNING',
    });
    const searchId = String(search._id);

    await creditsService.consume(accountId, SEARCH_ACTION, `sourcing-search-${searchId}-p1`);

    let result;
    try {
      result = await getPeopleSourcingProvider().search({ criteria, size, scrollToken: null });
    } catch (err) {
      await creditsService.refund(accountId, SEARCH_ACTION, { searchId });
      await sourcingSearchRepository.update(searchId, { status: 'FAILED' });
      logger.error({ err, searchId }, 'Sourcing provider search failed');
      throw providerError('People search provider failed. Your credits were refunded.');
    }

    const docs = await cacheAndScore(workspaceId, criteria, result.people);
    const updated = await sourcingSearchRepository.update(searchId, {
      status: 'COMPLETED',
      total: result.total,
      fetched: docs.length,
      creditsUsed: search.creditsUsed + SEARCH_COST,
      scrollToken: result.scrollToken,
      contactIds: docs.map((d) => d._id),
      lastRunAt: new Date(),
    });

    return {
      search: toSourcingSearchDto(updated ?? search),
      contacts: docs.map((d) => toSourcedContactDto(d.toObject(), { reveal: false })),
    };
  },

  /** Fetch the next page for an existing search (costs credits); appends + re-ranks. */
  async loadMore(workspaceId: string, searchId: string): Promise<SourcingSearchResultDto> {
    const search = await sourcingSearchRepository.findInWorkspace(workspaceId, searchId);
    if (!search) throw notFound('Search not found');
    if (!search.scrollToken) throw badRequest('No more results to load for this search');
    if ((search.fetched ?? 0) >= config.providers.sourcing.maxResults) {
      throw badRequest('This search has reached its result cap');
    }
    const criteria = search.criteria as SourcingCriteria;
    const accountId = await resolveAccountId(workspaceId);
    // Derive the spend key from credits already charged (not `fetched`, which can
    // stay flat when a page returns only duplicates) so every charge is distinct.
    const charge = Math.floor((search.creditsUsed ?? 0) / SEARCH_COST) + 1;

    await creditsService.consume(accountId, SEARCH_ACTION, `sourcing-search-${searchId}-c${charge}`);

    let result;
    try {
      result = await getPeopleSourcingProvider().search({
        criteria,
        size: pageSize(),
        scrollToken: search.scrollToken,
      });
    } catch (err) {
      await creditsService.refund(accountId, SEARCH_ACTION, { searchId });
      logger.error({ err, searchId }, 'Sourcing load-more failed');
      throw providerError('People search provider failed. Your credits were refunded.');
    }

    const newDocs = await cacheAndScore(workspaceId, criteria, result.people);
    const existing = new Set((search.contactIds ?? []).map((id) => String(id)));
    const mergedIds = [...(search.contactIds ?? [])];
    for (const d of newDocs) if (!existing.has(String(d._id))) mergedIds.push(d._id);

    const updated = await sourcingSearchRepository.update(searchId, {
      total: result.total,
      fetched: mergedIds.length,
      creditsUsed: (search.creditsUsed ?? 0) + SEARCH_COST,
      scrollToken: result.scrollToken,
      contactIds: mergedIds,
      lastRunAt: new Date(),
    });

    return this.getSearch(workspaceId, searchId, updated);
  },

  /** Re-run a search with recruiter-edited criteria — no AI re-parse; costs credits. */
  async updateCriteria(
    workspaceId: string,
    searchId: string,
    criteria: SourcingCriteria,
  ): Promise<SourcingSearchResultDto> {
    const search = await sourcingSearchRepository.findInWorkspace(workspaceId, searchId);
    if (!search) throw notFound('Search not found');
    const accountId = await resolveAccountId(workspaceId);

    // Idempotent per run so a retried PATCH doesn't double-charge.
    const runKey = `sourcing-search-${searchId}-rerun-${search.lastRunAt?.getTime() ?? 0}`;
    await creditsService.consume(accountId, SEARCH_ACTION, runKey);

    let result;
    try {
      result = await getPeopleSourcingProvider().search({ criteria, size: pageSize(), scrollToken: null });
    } catch (err) {
      await creditsService.refund(accountId, SEARCH_ACTION, { searchId });
      throw providerError('People search provider failed. Your credits were refunded.');
    }

    const docs = await cacheAndScore(workspaceId, criteria, result.people);
    const updated = await sourcingSearchRepository.update(searchId, {
      criteria,
      status: 'COMPLETED',
      total: result.total,
      fetched: docs.length,
      creditsUsed: (search.creditsUsed ?? 0) + SEARCH_COST,
      scrollToken: result.scrollToken,
      contactIds: docs.map((d) => d._id),
      lastRunAt: new Date(),
    });

    return {
      search: toSourcingSearchDto(updated ?? search),
      contacts: docs.map((d) => toSourcedContactDto(d.toObject(), { reveal: false })),
    };
  },

  /** Recent searches for the workspace (history / rehydrate switcher). */
  async listSearches(workspaceId: string): Promise<SourcingSearchDto[]> {
    const rows = await sourcingSearchRepository.listByWorkspace(workspaceId);
    return rows.map(toSourcingSearchDto);
  },

  /** Rehydrate a saved search: load its cached contacts and re-rank against its criteria. */
  async getSearch(workspaceId: string, searchId: string, preloaded?: any): Promise<SourcingSearchResultDto> {
    const search = preloaded ?? (await sourcingSearchRepository.findInWorkspace(workspaceId, searchId));
    if (!search) throw notFound('Search not found');
    const criteria = search.criteria as SourcingCriteria;
    const contacts = await sourcedContactRepository.findByIds(workspaceId, search.contactIds ?? []);
    const ranked = rescore(criteria, contacts);
    return {
      search: toSourcingSearchDto(search.toObject ? search.toObject() : search),
      contacts: ranked.map((c) => toSourcedContactDto(c, { reveal: false })),
    };
  },

  /**
   * Full profile with the contact's email/phone revealed (viewing is free —
   * data is cached). Lazily backfills skills/education/githubUrl/personalEmail
   * via a targeted PDL enrich call the FIRST time this contact is opened, if
   * (and only if) a gap actually exists — never during bulk search, to keep
   * the cheap Apollo-eager / PDL-lazy cost split intact.
   */
  async getContact(workspaceId: string, contactId: string): Promise<SourcedContactDto> {
    const contact = await sourcedContactRepository.findInWorkspace(workspaceId, contactId);
    if (!contact) throw notFound('Contact not found');

    let doc = contact.toObject();
    if (hasEnrichmentGap(doc)) {
      try {
        const backfilled = await getPeopleSourcingProvider().backfill({
          fullName: doc.fullName,
          company: doc.company ?? undefined,
          workEmail: doc.workEmail ?? undefined,
          linkedinUrl: doc.linkedinUrl ?? undefined,
        });
        if (backfilled) {
          const updated = await sourcedContactRepository.update(contactId, {
            skills: backfilled.skills.length ? backfilled.skills : doc.skills,
            githubUrl: backfilled.githubUrl ?? doc.githubUrl,
            personalEmail: backfilled.personalEmail ?? doc.personalEmail,
            education: backfilled.education.length ? backfilled.education : doc.education,
            yearsExperience: backfilled.yearsExperience ?? doc.yearsExperience,
          });
          doc = (updated ?? contact).toObject();
        }
      } catch (err) {
        logger.warn({ err, contactId }, 'PDL backfill failed — showing contact with the gap unfilled');
      }
    }

    return toSourcedContactDto(doc, { reveal: true });
  },

  /**
   * Estimated market compensation band for this contact's company + title
   * (Levels.fyi via Monid) — aggregate data, NOT this person's actual salary.
   * Cached globally by company+role, so repeat lookups across candidates at
   * the same company are free. Returns null when unresolvable — a normal,
   * expected outcome for smaller/less-known employers, not an error.
   */
  async getCompensationBand(workspaceId: string, contactId: string): Promise<CompensationBandDto | null> {
    const contact = await sourcedContactRepository.findInWorkspace(workspaceId, contactId);
    if (!contact) throw notFound('Contact not found');
    if (!contact.company) return null;

    const cached = await compensationBandCacheRepository.find(contact.company, contact.title ?? undefined);
    if (cached) return cached.band;

    const band = await getCompensationProvider().getSalaryBand({
      company: contact.company,
      title: contact.title ?? undefined,
      location: contact.location ?? undefined,
    });
    await compensationBandCacheRepository.save(contact.company, contact.title ?? undefined, band);
    return band;
  },

  /** Build a CSV of the given contacts (emails revealed) for download. */
  async exportContactsCsv(workspaceId: string, contactIds: string[]): Promise<string> {
    const contacts = await sourcedContactRepository.findByIds(workspaceId, contactIds);
    const header = [
      'Name', 'Title', 'Company', 'Location', 'Years Experience', 'Skills',
      'LinkedIn', 'GitHub', 'Work Email', 'Personal Email', 'Phone', 'Match Score',
    ];
    const rows = contacts.map((c: any) => [
      c.fullName ?? '',
      c.title ?? '',
      c.company ?? '',
      c.location ?? '',
      c.yearsExperience ?? '',
      (c.skills ?? []).join('; '),
      c.linkedinUrl ?? '',
      c.githubUrl ?? '',
      c.workEmail ?? '',
      c.personalEmail ?? '',
      c.phone ?? '',
      c.matchScore ?? '',
    ]);
    return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  },

  // ---- Contacts (durable people store) ------------------------------------

  async listContacts(workspaceId: string, query: SourcingContactListQuery): Promise<Paginated<SourcedContactDto>> {
    const { items, total } = await sourcedContactRepository.listByWorkspace(workspaceId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      hasEmail: query.hasEmail,
    });
    return {
      items: items.map((c: any) => toSourcedContactDto(c, { reveal: false })),
      total,
      page: query.page,
      limit: query.limit,
    };
  },

  /**
   * Convert a sourced contact into an ATS candidate + application on a job
   * (`source: SOURCED`), deduping the candidate by email. This is the bridge
   * from top-of-funnel sourcing into the existing pipeline.
   */
  async convertContact(workspaceId: string, contactId: string, jobId: string): Promise<SourcedContactDto> {
    const contact = await sourcedContactRepository.findInWorkspace(workspaceId, contactId);
    if (!contact) throw notFound('Contact not found');
    const email = contact.workEmail || contact.personalEmail;
    if (!email) throw badRequest('This contact has no email yet — reveal or enrich one before adding to a job');

    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');

    const candidate = await candidateService.findOrCreate(workspaceId, {
      name: contact.fullName,
      email,
      phone: contact.phone ?? undefined,
      location: contact.location ?? undefined,
      linkedinUrl: contact.linkedinUrl ?? undefined,
      currentSalary: undefined,
      expectedSalary: undefined,
    });

    let app = await applicationRepository.findByJobAndCandidate(jobId, String(candidate._id));
    if (!app) {
      app = await applicationRepository.create({
        workspaceId,
        jobId,
        candidateId: candidate._id,
        source: 'SOURCED',
        stage: 'APPLIED',
        jobRestrictedTo: (job as any).restrictedTo ?? [],
      });
    }

    const updated = await sourcedContactRepository.update(contactId, {
      addedToJob: { applicationId: app._id, jobId: job._id, jobTitle: (job as any).title },
    });
    return toSourcedContactDto((updated ?? contact).toObject(), { reveal: true });
  },

  // ---- Lists (talent pools) -----------------------------------------------

  async listLists(workspaceId: string): Promise<SourcingListDto[]> {
    const rows = await sourcingListRepository.listByWorkspace(workspaceId);
    return rows.map(toSourcingListDto);
  },

  async getList(workspaceId: string, listId: string): Promise<SourcingListDto> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    return toSourcingListDto(list.toObject());
  },

  async createList(workspaceId: string, createdBy: string | null, input: CreateListInput): Promise<SourcingListDto> {
    const list = await sourcingListRepository.create({
      workspaceId,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : null,
      name: input.name,
      description: input.description ?? null,
    });
    if (input.contactIds.length) {
      // Only add contacts that actually belong to this workspace, so contactCount
      // never counts foreign or non-existent ids the list can't show.
      const owned = await sourcedContactRepository.findByIds(workspaceId, input.contactIds);
      await sourcingListMemberRepository.addMany(
        workspaceId,
        String(list._id),
        owned.map((c: any) => String(c._id)),
        createdBy,
      );
    }
    const synced = await sourcingListRepository.syncCount(String(list._id));
    return toSourcingListDto((synced ?? list).toObject());
  },

  async updateList(workspaceId: string, listId: string, input: UpdateListInput): Promise<SourcingListDto> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    const updated = await sourcingListRepository.update(listId, patch);
    return toSourcingListDto((updated ?? list).toObject());
  },

  async deleteList(workspaceId: string, listId: string): Promise<void> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    await sourcingListMemberRepository.removeAllInList(listId);
    await sourcingListRepository.remove(listId);
  },

  async addToList(workspaceId: string, listId: string, contactIds: string[]): Promise<SourcingListDto> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    const owned = await sourcedContactRepository.findByIds(workspaceId, contactIds);
    await sourcingListMemberRepository.addMany(workspaceId, listId, owned.map((c: any) => String(c._id)), null);
    const synced = await sourcingListRepository.syncCount(listId);
    return toSourcingListDto((synced ?? list).toObject());
  },

  async removeFromList(workspaceId: string, listId: string, contactId: string): Promise<SourcingListDto> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    await sourcingListMemberRepository.remove(listId, contactId);
    const synced = await sourcingListRepository.syncCount(listId);
    return toSourcingListDto((synced ?? list).toObject());
  },

  /** Contacts belonging to a list (list-view shape — emails hidden). */
  async listMembers(workspaceId: string, listId: string): Promise<SourcedContactDto[]> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, listId);
    if (!list) throw notFound('List not found');
    const ids = await sourcingListMemberRepository.contactIdsInList(listId);
    const contacts = await sourcedContactRepository.findByIds(workspaceId, ids);
    return contacts.map((c: any) => toSourcedContactDto(c, { reveal: false }));
  },

  // ---- Campaigns (single-shot outreach) -----------------------------------

  async listCampaigns(workspaceId: string): Promise<SourcingCampaignDto[]> {
    const rows = await sourcingCampaignRepository.listByWorkspace(workspaceId);
    const lists = await sourcingListRepository.listByWorkspace(workspaceId);
    const nameById = new Map(lists.map((l: any) => [String(l._id), l.name]));
    return rows.map((r: any) => toSourcingCampaignDto(r, nameById.get(String(r.listId)) ?? null));
  },

  async getCampaign(workspaceId: string, campaignId: string): Promise<SourcingCampaignDto> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    const fresh = (await this.refreshStats(campaignId)) ?? campaign;
    const list = await sourcingListRepository.findInWorkspace(workspaceId, String(campaign.listId));
    return toSourcingCampaignDto(fresh.toObject ? fresh.toObject() : fresh, list?.name ?? null);
  },

  async createCampaign(workspaceId: string, createdBy: string | null, input: CreateCampaignInput): Promise<SourcingCampaignDto> {
    const list = await sourcingListRepository.findInWorkspace(workspaceId, input.listId);
    if (!list) throw notFound('List not found');
    const campaign = await sourcingCampaignRepository.create({
      workspaceId,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : null,
      name: input.name,
      listId: input.listId,
      subject: input.subject,
      body: input.body,
      fromName: input.fromName ?? null,
      replyToEmail: input.replyToEmail ?? null,
      status: 'DRAFT',
    });
    return toSourcingCampaignDto(campaign.toObject(), list.name);
  },

  async updateCampaign(workspaceId: string, campaignId: string, input: UpdateCampaignInput): Promise<SourcingCampaignDto> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    if (campaign.status !== 'DRAFT') throw conflict('Only draft campaigns can be edited');
    const patch: Record<string, unknown> = {};
    for (const k of ['name', 'subject', 'body', 'fromName', 'replyToEmail'] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    const updated = await sourcingCampaignRepository.update(campaignId, patch);
    const list = await sourcingListRepository.findInWorkspace(workspaceId, String(campaign.listId));
    return toSourcingCampaignDto((updated ?? campaign).toObject(), list?.name ?? null);
  },

  async deleteCampaign(workspaceId: string, campaignId: string): Promise<void> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    await sourcingRecipientRepository.deleteByCampaign(campaignId);
    await sourcingCampaignRepository.remove(campaignId);
  },

  async listRecipients(workspaceId: string, campaignId: string): Promise<SourcingCampaignRecipientDto[]> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    const rows = await sourcingRecipientRepository.listByCampaign(campaignId);
    return rows.map(toSourcingCampaignRecipientDto);
  },

  /** AI draft (or refine) for the composer — free, rate-limited by aiLimiter. */
  async draftEmail(workspaceId: string, input: DraftCampaignInput): Promise<CampaignDraftDto> {
    const ws = await WorkspaceModel.findById(workspaceId).select('name').lean();
    const { subject, body } = await getAIProvider().draftOutreachEmail({
      role: input.role,
      company: ws?.name ?? 'our team',
      tone: input.tone,
      brief: input.brief,
      refine: input.refine,
    });
    return { subject, body };
  },

  /** Send a one-off preview of the campaign to the recruiter's own address. */
  async testCampaign(workspaceId: string, campaignId: string, toEmail: string): Promise<void> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    const ctx: MergeContext = { firstName: 'there', fullName: 'there', company: 'their company', title: 'their role' };
    const subject = renderTemplate(campaign.subject, ctx, 'test');
    const body = renderTemplate(campaign.body, ctx, 'test');
    await jobQueue.enqueue('SEND_EMAIL', {
      to: toEmail,
      subject: `[TEST] ${subject}`,
      html: outreachHtml(body, { senderIdentity: campaign.fromName ?? undefined }),
      text: body,
      replyTo: campaign.replyToEmail ?? undefined,
    });
  },

  /**
   * Build the recipient set (skipping no-email + suppressed contacts) and hand
   * the campaign off to the queue for send (now) or at `scheduledAt`.
   */
  async sendCampaign(workspaceId: string, campaignId: string, scheduledAtIso?: string): Promise<SourcingCampaignDto> {
    const campaign = await sourcingCampaignRepository.findInWorkspace(workspaceId, campaignId);
    if (!campaign) throw notFound('Campaign not found');
    if (campaign.status === 'SENDING' || campaign.status === 'SENT') {
      throw conflict('This campaign has already been sent');
    }

    const memberIds = await sourcingListMemberRepository.contactIdsInList(String(campaign.listId));
    const contacts = await sourcedContactRepository.findByIds(workspaceId, memberIds);
    const withEmail = contacts
      .map((c: any) => ({ c, email: (c.workEmail || c.personalEmail || '').toLowerCase() }))
      .filter((x: { email: string }) => x.email);
    const suppressed = await sourcingSuppressionRepository.suppressedAmong(workspaceId, withEmail.map((x) => x.email));
    const eligible = withEmail.filter((x) => !suppressed.has(x.email));
    if (eligible.length === 0) {
      throw badRequest('No contactable recipients — every contact lacks an email or is unsubscribed');
    }

    // Atomically claim the campaign (DRAFT/SCHEDULED/PAUSED/FAILED → SENDING) so two
    // concurrent sends can't both build recipients and double-email everyone.
    const claimed = await sourcingCampaignRepository.claimForSend(workspaceId, campaignId);
    if (!claimed) throw conflict('This campaign is already sending or has been sent');

    // Reuse recipients by contact: preserve rows that already progressed past PENDING
    // (a retry from PAUSED/FAILED must never re-email an already-contacted person),
    // and only (re)insert PENDING rows for the rest.
    const existing = await sourcingRecipientRepository.listByCampaign(campaignId);
    const alreadyProcessed = new Set(
      existing.filter((r: any) => r.status !== 'PENDING').map((r: any) => String(r.contactId)),
    );
    await sourcingRecipientRepository.deletePendingByCampaign(campaignId);
    const toInsert = eligible.filter((x) => !alreadyProcessed.has(String(x.c._id)));
    if (toInsert.length) {
      await sourcingRecipientRepository.insertMany(
        toInsert.map((x) => ({
          workspaceId,
          campaignId,
          contactId: x.c._id,
          fullName: x.c.fullName,
          email: x.email,
          company: x.c.company ?? null,
          title: x.c.title ?? null,
          status: 'PENDING',
          unsubscribeToken: randomToken(),
        })),
      );
    }

    const scheduledAt = scheduledAtIso ? new Date(scheduledAtIso) : null;
    const scheduled = Boolean(scheduledAt && scheduledAt.getTime() > Date.now());
    await sourcingCampaignRepository.update(campaignId, {
      status: scheduled ? 'SCHEDULED' : 'SENDING',
      scheduledAt: scheduledAt ?? null,
      'stats.recipients': alreadyProcessed.size + toInsert.length,
    });

    // Stamp the effective scheduled time on the job so a superseded (rescheduled)
    // job can be recognized as stale by the handler and skipped.
    await jobQueue.enqueue(
      'SEND_SOURCING_CAMPAIGN',
      { campaignId, workspaceId, scheduledAt: scheduledAt ? scheduledAt.toISOString() : null },
      {
        runAt: scheduled ? scheduledAt! : undefined,
        idempotencyKey: `sourcing-campaign-${campaignId}-${scheduledAt?.getTime() ?? 'now'}`,
      },
    );

    return this.getCampaign(workspaceId, campaignId);
  },

  /** Open-pixel hit: record openedAt (once) and promote a sent/delivered recipient to OPENED. */
  async recordOpen(token: string): Promise<void> {
    const r = await sourcingRecipientRepository.findByToken(token);
    if (!r) return;
    const patch: Record<string, unknown> = {};
    if (!r.openedAt) patch.openedAt = new Date();
    if (r.status === 'SENT' || r.status === 'DELIVERED') patch.status = 'OPENED';
    if (Object.keys(patch).length) await sourcingRecipientRepository.update(String(r._id), patch);
  },

  /** A candidate replied (via the inbound email webhook) — record repliedAt + mark REPLIED. */
  async recordReply(recipientId: string): Promise<void> {
    const r = await sourcingRecipientRepository.findById(recipientId);
    if (!r || r.repliedAt) return;
    const patch: Record<string, unknown> = { repliedAt: new Date() };
    if (r.status !== 'UNSUBSCRIBED') patch.status = 'REPLIED';
    await sourcingRecipientRepository.update(recipientId, patch);
  },

  /**
   * Apply a normalized email-provider delivery event (Resend webhook) to the
   * matching recipient; hard bounces and spam complaints also suppress the
   * address so future campaigns skip it. Progression timestamps are set once.
   */
  async applyEmailEvent(evt: { type: 'delivered' | 'opened' | 'bounced' | 'complained'; providerMessageId?: string }): Promise<void> {
    if (!evt.providerMessageId) return;
    const r = await sourcingRecipientRepository.findByProviderMessageId(evt.providerMessageId);
    if (!r) return;
    const id = String(r._id);
    if (evt.type === 'delivered') {
      const patch: Record<string, unknown> = {};
      if (!r.deliveredAt) patch.deliveredAt = new Date();
      if (r.status === 'SENT') patch.status = 'DELIVERED';
      if (Object.keys(patch).length) await sourcingRecipientRepository.update(id, patch);
    } else if (evt.type === 'opened') {
      const patch: Record<string, unknown> = {};
      if (!r.openedAt) patch.openedAt = new Date();
      if (r.status === 'SENT' || r.status === 'DELIVERED') patch.status = 'OPENED';
      if (Object.keys(patch).length) await sourcingRecipientRepository.update(id, patch);
    } else if (evt.type === 'bounced') {
      await sourcingRecipientRepository.update(id, { status: 'BOUNCED' });
      await sourcingSuppressionRepository.add(String(r.workspaceId), r.email, 'bounced');
    } else if (evt.type === 'complained') {
      await sourcingRecipientRepository.update(id, { status: 'UNSUBSCRIBED' });
      await sourcingSuppressionRepository.add(String(r.workspaceId), r.email, 'complained');
    }
  },

  /** One-click unsubscribe: suppress the address workspace-wide and mark the recipient. */
  async unsubscribeByToken(token: string): Promise<void> {
    const recipient = await sourcingRecipientRepository.findByToken(token);
    if (!recipient) return;
    await sourcingSuppressionRepository.add(String(recipient.workspaceId), recipient.email, 'unsubscribed');
    if (recipient.status !== 'UNSUBSCRIBED') {
      await sourcingRecipientRepository.update(String(recipient._id), { status: 'UNSUBSCRIBED' });
    }
  },

  /**
   * Recompute a campaign's aggregate stats. sent/delivered/opened/replied come
   * from progression timestamps (never cleared), so a later unsubscribe or bounce
   * can't lower them; bounced/unsubscribed/failed come from the current status.
   */
  async refreshStats(campaignId: string) {
    const stats = await sourcingRecipientRepository.funnelCounts(campaignId);
    return sourcingCampaignRepository.update(campaignId, { stats });
  },
};

/** Quote a CSV cell, escaping embedded quotes; guard against CSV/formula injection. */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function randomToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Public one-click unsubscribe URL for a recipient token. */
export function sourcingUnsubscribeUrl(token: string): string {
  return `${config.publicApiUrl}/api/v1/public/sourcing/unsubscribe/${token}`;
}

/** Public open-tracking pixel URL for a recipient token. */
export function sourcingOpenPixelUrl(token: string): string {
  return `${config.publicApiUrl}/api/v1/public/sourcing/open/${token}.gif`;
}

/** Build the merge-tag context for a recipient/contact. */
export function contactMergeContext(c: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
}): MergeContext {
  return {
    firstName: c.firstName || firstNameOf(c.fullName),
    lastName: c.lastName ?? '',
    fullName: c.fullName ?? '',
    title: c.title ?? '',
    company: c.company ?? '',
    location: c.location ?? '',
  };
}
