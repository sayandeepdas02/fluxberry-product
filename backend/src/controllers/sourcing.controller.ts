import { asyncHandler, ok, created, noContent } from '../utils/http';
import { config } from '../config/env';
import { sourcingService } from '../services/sourcing.service';
import type {
  SourcingSearchInput,
  SourcingParseInput,
  UpdateSearchCriteriaInput,
  ExportContactsInput,
  SourcingContactListQuery,
  ConvertContactInput,
  CreateListInput,
  UpdateListInput,
  AddToListInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  SendCampaignInput,
  TestCampaignInput,
  DraftCampaignInput,
} from '../shared';

export const sourcingController = {
  /** Free: prompt → editable criteria (no PDL spend). */
  parse: asyncHandler(async (req, res) => {
    const { prompt } = req.body as SourcingParseInput;
    const criteria = await sourcingService.parse(prompt);
    ok(res, { criteria });
  }),

  /** Run a search (spends credits). Accepts a prompt and optional edited criteria. */
  search: asyncHandler(async (req, res) => {
    const body = req.body as SourcingSearchInput;
    const result = await sourcingService.search(req.auth!.workspaceId!, req.auth!.user.id, body);
    ok(res, result);
  }),

  loadMore: asyncHandler(async (req, res) => {
    const result = await sourcingService.loadMore(req.auth!.workspaceId!, req.params.searchId, req.auth!.user.id);
    ok(res, result);
  }),

  updateCriteria: asyncHandler(async (req, res) => {
    const { criteria } = req.body as UpdateSearchCriteriaInput;
    const result = await sourcingService.updateCriteria(req.auth!.workspaceId!, req.params.searchId, criteria, req.auth!.user.id);
    ok(res, result);
  }),

  listSearches: asyncHandler(async (req, res) => {
    const searches = await sourcingService.listSearches(req.auth!.workspaceId!);
    ok(res, searches);
  }),

  getSearch: asyncHandler(async (req, res) => {
    const result = await sourcingService.getSearch(req.auth!.workspaceId!, req.params.searchId);
    ok(res, result);
  }),

  getContact: asyncHandler(async (req, res) => {
    const contact = await sourcingService.getContact(req.auth!.workspaceId!, req.params.contactId);
    ok(res, contact);
  }),

  /** Paid PDL enrichment (PROFILE_ENRICH credits, refunded on no-match). */
  enrichContact: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.enrichContact(req.auth!.workspaceId!, req.params.contactId, req.auth!.user.id));
  }),

  /** Estimated market compensation band (Levels.fyi) — free once unlocked; null band = no coverage, not an error. */
  getCompensation: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.getCompensationBand(req.auth!.workspaceId!, req.params.contactId));
  }),

  /** First view of a contact's band — spends COMPENSATION_LOOKUP credits (refunded when there's no coverage). */
  unlockCompensation: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.getCompensationBand(req.auth!.workspaceId!, req.params.contactId, { unlock: true, userId: req.auth!.user.id }));
  }),

  exportContacts: asyncHandler(async (req, res) => {
    const { contactIds } = req.body as ExportContactsInput;
    const csv = await sourcingService.exportContactsCsv(req.auth!.workspaceId!, contactIds);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sourced-contacts.csv"');
    res.status(200).send(csv);
  }),

  // ---- Contacts + convert -------------------------------------------------

  listContacts: asyncHandler(async (req, res) => {
    const result = await sourcingService.listContacts(
      req.auth!.workspaceId!,
      req.query as unknown as SourcingContactListQuery,
    );
    ok(res, result);
  }),

  convertContact: asyncHandler(async (req, res) => {
    const { jobId } = req.body as ConvertContactInput;
    const contact = await sourcingService.convertContact(req.auth!.workspaceId!, req.params.contactId, jobId);
    ok(res, contact);
  }),

  // ---- Lists --------------------------------------------------------------

  listLists: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.listLists(req.auth!.workspaceId!));
  }),

  getList: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.getList(req.auth!.workspaceId!, req.params.listId));
  }),

  createList: asyncHandler(async (req, res) => {
    const list = await sourcingService.createList(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.body as CreateListInput,
    );
    created(res, list);
  }),

  updateList: asyncHandler(async (req, res) => {
    const list = await sourcingService.updateList(
      req.auth!.workspaceId!,
      req.params.listId,
      req.body as UpdateListInput,
    );
    ok(res, list);
  }),

  deleteList: asyncHandler(async (req, res) => {
    await sourcingService.deleteList(req.auth!.workspaceId!, req.params.listId);
    noContent(res);
  }),

  listMembers: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.listMembers(req.auth!.workspaceId!, req.params.listId));
  }),

  addToList: asyncHandler(async (req, res) => {
    const { contactIds } = req.body as AddToListInput;
    ok(res, await sourcingService.addToList(req.auth!.workspaceId!, req.params.listId, contactIds));
  }),

  removeFromList: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.removeFromList(req.auth!.workspaceId!, req.params.listId, req.params.contactId));
  }),

  // ---- Campaigns ----------------------------------------------------------

  listCampaigns: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.listCampaigns(req.auth!.workspaceId!));
  }),

  getCampaign: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.getCampaign(req.auth!.workspaceId!, req.params.campaignId));
  }),

  createCampaign: asyncHandler(async (req, res) => {
    const campaign = await sourcingService.createCampaign(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.body as CreateCampaignInput,
    );
    created(res, campaign);
  }),

  updateCampaign: asyncHandler(async (req, res) => {
    const campaign = await sourcingService.updateCampaign(
      req.auth!.workspaceId!,
      req.params.campaignId,
      req.body as UpdateCampaignInput,
    );
    ok(res, campaign);
  }),

  deleteCampaign: asyncHandler(async (req, res) => {
    await sourcingService.deleteCampaign(req.auth!.workspaceId!, req.params.campaignId);
    noContent(res);
  }),

  listRecipients: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.listRecipients(req.auth!.workspaceId!, req.params.campaignId));
  }),

  draftEmail: asyncHandler(async (req, res) => {
    ok(res, await sourcingService.draftEmail(req.auth!.workspaceId!, req.body as DraftCampaignInput, req.auth!.user.id));
  }),

  testCampaign: asyncHandler(async (req, res) => {
    const { toEmail } = req.body as TestCampaignInput;
    await sourcingService.testCampaign(req.auth!.workspaceId!, req.params.campaignId, toEmail);
    ok(res, { ok: true });
  }),

  sendCampaign: asyncHandler(async (req, res) => {
    const { scheduledAt } = req.body as SendCampaignInput;
    const campaign = await sourcingService.sendCampaign(req.auth!.workspaceId!, req.params.campaignId, scheduledAt, req.auth!.user.id);
    ok(res, campaign);
  }),

  // ---- Public (no auth) ---------------------------------------------------

  /** 1x1 transparent GIF that records an open when loaded by the recipient's client. */
  trackOpen: asyncHandler(async (req, res) => {
    const token = req.params.token.replace(/\.gif$/i, '');
    await sourcingService.recordOpen(token);
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.status(200).end(gif);
  }),

  /** Resend delivery-event webhook: delivered / opened / bounced / complained. */
  emailWebhook: asyncHandler(async (req, res) => {
    const expected = config.providers.messaging.inboundSecret;
    if (!expected || req.params.secret !== expected) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid webhook secret' } });
      return;
    }
    const type = String(req.body?.type ?? '');
    const providerMessageId = req.body?.data?.email_id as string | undefined;
    const map: Record<string, 'delivered' | 'opened' | 'bounced' | 'complained'> = {
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
    };
    const mapped = map[type];
    if (mapped) await sourcingService.applyEmailEvent({ type: mapped, providerMessageId });
    res.status(200).json({ received: true });
  }),

  unsubscribe: asyncHandler(async (req, res) => {
    await sourcingService.unsubscribeByToken(req.params.token);
    res
      .status(200)
      .send(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>' +
          '<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1a1a1a">' +
          '<h1 style="font-size:20px">You\'re unsubscribed</h1>' +
          '<p style="color:#6b7280">You won\'t receive any further outreach emails from this sender. You can close this tab.</p>' +
          '</body></html>',
      );
  }),
};
