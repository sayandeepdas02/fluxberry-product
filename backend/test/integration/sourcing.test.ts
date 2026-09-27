import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { activateSubscription } from './helpers/activate-subscription';
import { creditsFor, PLAN_CREDIT_ALLOWANCE } from '../../src/shared';
import { mockOutbox, getEmailProvider } from '../../src/integrations';
import { logger } from '../../src/utils/logger';
import { sendSourcingCampaignHandler } from '../../src/workers/handlers/send-sourcing-campaign';
import { sendSourcingEmailHandler } from '../../src/workers/handlers/send-sourcing-email';
import { SourcingCampaignRecipientModel } from '../../src/models/sourcing-campaign-recipient.model';
import { SourcingCampaignModel } from '../../src/models/sourcing-campaign.model';
import { OutreachDailyUsageModel } from '../../src/models/outreach-daily-usage.model';
import { CreditTransactionModel } from '../../src/models/credit-transaction.model';
import { getPeopleSourcingProvider } from '../../src/integrations';
import { JobQueueModel } from '../../src/models/job-queue.model';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { AccountModel } from '../../src/models/account.model';
import { PLAN_DAILY_OUTREACH_CAP } from '../../src/shared';

const jobCtx = { jobId: 'test', attempts: 1, logger } as any;

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

async function onboard(token: string, name: string, company: string) {
  const res = await request(app)
    .post('/api/v1/workspaces/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, company });
  if (!res.body?.data) throw new Error(`onboard failed ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data.id as string;
}

const PROMPT = 'Senior Software Engineer with 4+ years of experience in Rust based in Bangalore';

// One shared user across the suite; each test onboards a fresh workspace for it.
// (Creating a distinct user per test would collide on the User.clerkId unique
// index, since test-token users all have a null clerkId.)
let token: string;

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_sourcing');
  await mongoose.connection.dropDatabase();
  token = await tokenFor('sourcing-suite@test.com', 'Sourcing Suite');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('Talent Sourcing (integration)', () => {
  it('parses, searches, ranks, reveals, loads more, re-runs, and exports', async () => {
    const workspaceId = await onboard(token, 'Sourcing Owner', 'Sourceco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');

    // 1. Parse is free and returns editable criteria.
    const parsed = await ws(request(app).post('/api/v1/sourcing/parse').send({ prompt: PROMPT }) as any);
    expect(parsed.status).toBe(200);
    expect(parsed.body.data.criteria.skills.map((s: string) => s.toLowerCase())).toContain('rust');
    const afterParse = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterParse.body.data.credits.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.MAX);

    // 2. Search charges per NEW profile and returns ranked, contactable-hidden rows.
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    expect(search.status).toBe(200);
    const contacts = search.body.data.contacts as any[];
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts[0].matchScore).toBeGreaterThanOrEqual(contacts[contacts.length - 1].matchScore); // sorted desc
    // Emails are hidden in list rows but contactability is signalled.
    expect(contacts[0].workEmail).toBeNull();
    expect(typeof contacts[0].hasEmail).toBe('boolean');
    const searchId = search.body.data.search.id as string;
    const pageCost = creditsFor('SOURCING_PROFILE', contacts.length);
    expect(search.body.data.search.creditsUsed).toBe(pageCost);

    const afterSearch = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterSearch.body.data.credits.allowanceRemaining).toBe(PLAN_CREDIT_ALLOWANCE.MAX - pageCost);

    // 2b. The same search again surfaces only people the workspace already owns —
    // no paid lookups, so it costs nothing.
    const repeat = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.contacts.length).toBe(contacts.length);
    expect(repeat.body.data.search.creditsUsed).toBe(0);
    const afterRepeat = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any);
    expect(afterRepeat.body.data.total).toBe(PLAN_CREDIT_ALLOWANCE.MAX - pageCost);

    // 3. Rehydrate the saved search.
    const rehydrated = await ws(request(app).get(`/api/v1/sourcing/searches/${searchId}`) as any);
    expect(rehydrated.status).toBe(200);
    expect(rehydrated.body.data.contacts.length).toBe(contacts.length);

    // 4. The profile detail reveals the email when one exists — and is free.
    const contactable = contacts.find((c) => c.hasEmail) ?? contacts[0];
    const detail = await ws(request(app).get(`/api/v1/sourcing/contacts/${contactable.id}`) as any);
    expect(detail.status).toBe(200);
    if (contactable.hasEmail) {
      expect(detail.body.data.workEmail || detail.body.data.personalEmail).toBeTruthy();
    }
    expect(detail.body.data.enrichmentAttempted).toBe(false);

    // 4b. "Enrich profile" is an explicit paid action, charged once per contact.
    const beforeEnrich = (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;
    expect(detail.body.data.hasEnrichmentGap).toBe(true); // mock Apollo, like live, has no skills/education
    {
      const enriched = await ws(request(app).post(`/api/v1/sourcing/contacts/${contactable.id}/enrich`) as any);
      expect(enriched.status).toBe(200);
      expect(enriched.body.data.enrichmentAttempted).toBe(true);
      expect(enriched.body.data.skills.length).toBeGreaterThan(0);
      expect(enriched.body.data.phone).toBeTruthy();
      const again = await ws(request(app).post(`/api/v1/sourcing/contacts/${contactable.id}/enrich`) as any);
      expect(again.status).toBe(200);
      const afterEnrich = (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;
      expect(afterEnrich).toBe(beforeEnrich - creditsFor('PROFILE_ENRICH', 1));
    }

    // 5. Load more appends and spends another page of credits.
    if (search.body.data.search.canLoadMore) {
      const more = await ws(request(app).post(`/api/v1/sourcing/searches/${searchId}/more`).send({}) as any);
      expect(more.status).toBe(200);
      const added = more.body.data.search.fetched - contacts.length;
      expect(added).toBeGreaterThan(0);
      expect(more.body.data.search.creditsUsed).toBe(pageCost + creditsFor('SOURCING_PROFILE', added));
    }

    // 6. Editing criteria re-runs without re-calling the AI.
    const edited = { ...parsed.body.data.criteria, skills: ['Rust', 'Go'] };
    const rerun = await ws(
      request(app).patch(`/api/v1/sourcing/searches/${searchId}/criteria`).send({ criteria: edited }) as any,
    );
    expect(rerun.status).toBe(200);
    expect(rerun.body.data.contacts.length).toBeGreaterThan(0);

    // 6b. Page cost scales with page size (no more flat price for a bigger page).
    const big = await ws(
      request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT, criteria: { ...edited, skills: ['Kotlin'] }, size: 50 }) as any,
    );
    expect(big.status).toBe(200);
    expect(big.body.data.search.creditsUsed).toBe(creditsFor('SOURCING_PROFILE', big.body.data.contacts.length));
    expect(big.body.data.contacts.length).toBe(50);

    // 7. CSV export returns a downloadable file with revealed emails.
    const exportRes = await ws(
      request(app).post('/api/v1/sourcing/contacts/export').send({ contactIds: [contactable.id] }) as any,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text.split('\r\n')[0]).toContain('Name');
  });

  it('gates the compensation band behind a one-time 1-credit unlock per contact', async () => {
    const workspaceId = await onboard(token, 'Sourcing Comp', 'Compco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');

    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const contact = (search.body.data.contacts as any[]).find((c) => c.company);
    const credits = async () => (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;

    // Viewing before unlocking is free and returns no band.
    const locked = await ws(request(app).get(`/api/v1/sourcing/contacts/${contact.id}/compensation`) as any);
    expect(locked.status).toBe(200);
    expect(locked.body.data).toEqual({ unlocked: false, band: null });

    const before = await credits();
    const unlocked = await ws(request(app).post(`/api/v1/sourcing/contacts/${contact.id}/compensation/unlock`) as any);
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.unlocked).toBe(true);
    // Charged only when a band came back (no coverage is refunded).
    const charged = unlocked.body.data.band ? creditsFor('COMPENSATION_LOOKUP', 1) : 0;
    expect(await credits()).toBe(before - charged);
    if (unlocked.body.data.band) expect(unlocked.body.data.band.source).toBe('levels.fyi');

    // Later views are free.
    const second = await ws(request(app).get(`/api/v1/sourcing/contacts/${contact.id}/compensation`) as any);
    expect(second.body.data.band).toEqual(unlocked.body.data.band);
    expect(await credits()).toBe(before - charged);
  });

  it('lists contacts, manages talent pools, and converts a contact into the ATS', async () => {
    const workspaceId = await onboard(token, 'Sourcing Lists', 'Listco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');

    // Seed some cached contacts via a search.
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const contacts = search.body.data.contacts as any[];
    const someIds = contacts.slice(0, 3).map((c) => c.id);

    // The durable Contacts store lists them (paginated).
    const contactList = await ws(request(app).get('/api/v1/sourcing/contacts?page=1&limit=25') as any);
    expect(contactList.status).toBe(200);
    expect(contactList.body.data.total).toBeGreaterThan(0);
    expect(contactList.body.data.items[0].workEmail).toBeNull(); // hidden in list

    // Create a list with two contacts, then add a third.
    const list = await ws(
      request(app).post('/api/v1/sourcing/lists').send({ name: 'Rust shortlist', contactIds: someIds.slice(0, 2) }) as any,
    );
    expect(list.status).toBe(201);
    expect(list.body.data.contactCount).toBe(2);
    const listId = list.body.data.id as string;

    const added = await ws(
      request(app).post(`/api/v1/sourcing/lists/${listId}/contacts`).send({ contactIds: [someIds[2]] }) as any,
    );
    expect(added.body.data.contactCount).toBe(3);

    // Members endpoint returns the contacts.
    const members = await ws(request(app).get(`/api/v1/sourcing/lists/${listId}/contacts`) as any);
    expect(members.body.data.length).toBe(3);

    // Remove one; adding a duplicate is a no-op.
    await ws(request(app).delete(`/api/v1/sourcing/lists/${listId}/contacts/${someIds[2]}`) as any);
    const dedupe = await ws(
      request(app).post(`/api/v1/sourcing/lists/${listId}/contacts`).send({ contactIds: [someIds[0]] }) as any,
    );
    expect(dedupe.body.data.contactCount).toBe(2);

    // Convert a contactable contact into a job's pipeline.
    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Rust Engineer', skills: [{ name: 'Rust', required: true }] }) as any);
    const jobId = job.body.data.id as string;
    const contactable = contacts.find((c) => c.hasEmail);
    if (contactable) {
      const convert = await ws(
        request(app).post(`/api/v1/sourcing/contacts/${contactable.id}/convert`).send({ jobId }) as any,
      );
      expect(convert.status).toBe(200);
      expect(convert.body.data.addedToJob).toBeTruthy();
      expect(convert.body.data.addedToJob.jobId).toBe(jobId);
      // The candidate now shows up in the ATS candidates list, tagged SOURCED.
      const candidates = await ws(request(app).get(`/api/v1/candidates?jobId=${jobId}`) as any);
      expect(candidates.body.data.total).toBe(1);
    }

    // Delete the list.
    const del = await ws(request(app).delete(`/api/v1/sourcing/lists/${listId}`) as any);
    expect(del.status).toBe(204);
  });

  it('composes and sends a campaign, personalizes emails, and honours unsubscribe', async () => {
    const workspaceId = await onboard(token, 'Sourcing Campaign', 'Campco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');

    // Seed contactable people and put them in a list.
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const contactable = (search.body.data.contacts as any[]).filter((c) => c.hasEmail).slice(0, 4);
    expect(contactable.length).toBeGreaterThan(0);
    const list = await ws(
      request(app).post('/api/v1/sourcing/lists').send({ name: 'Outreach pool', contactIds: contactable.map((c) => c.id) }) as any,
    );
    const listId = list.body.data.id as string;

    const credits = async () => (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;
    const beforeDraft = await credits();

    // AI draft returns a body with merge tags, and costs 1 credit.
    const draft = await ws(
      request(app).post('/api/v1/sourcing/campaigns/draft').send({ role: 'Rust Engineer', brief: 'We raised a seed round.' }) as any,
    );
    expect(draft.status).toBe(200);
    expect(draft.body.data.body).toContain('{{firstName}}');
    expect(await credits()).toBe(beforeDraft - creditsFor('OUTREACH_DRAFT', 1));

    // Create a campaign with merge tags + spintax.
    const campaign = await ws(
      request(app).post('/api/v1/sourcing/campaigns').send({
        name: 'Rust outreach',
        listId,
        subject: 'Hi {{firstName}} — a role at {{company}}',
        body: 'Hey {{firstName}},\n\nYour work at {{company}} stood out. {Open to|Up for} a quick chat?\n\nBest,\nUs',
      }) as any,
    );
    expect(campaign.status).toBe(201);
    const campaignId = campaign.body.data.id as string;

    // Test emails only go to workspace members.
    const badTest = await ws(
      request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/test`).send({ toEmail: 'stranger@example.com' }) as any,
    );
    expect(badTest.status).toBe(400);
    const goodTest = await ws(
      request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/test`).send({ toEmail: 'sourcing-suite@test.com' }) as any,
    );
    expect(goodTest.status).toBe(200);

    // Send it → recipients built from contactable members; 1 credit per 25 recipients.
    const beforeSend = await credits();
    mockOutbox.length = 0;
    const sent = await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    expect(sent.status).toBe(200);
    expect(sent.body.data.stats.recipients).toBe(contactable.length);

    // Run the worker fan-out + per-recipient send.
    await sendSourcingCampaignHandler({ campaignId, workspaceId }, jobCtx);
    const recipients = await ws(request(app).get(`/api/v1/sourcing/campaigns/${campaignId}/recipients`) as any);
    for (const r of recipients.body.data as any[]) {
      await sendSourcingEmailHandler({ recipientId: r.id }, jobCtx);
    }

    // Emails were personalized (no raw tags) and carry an unsubscribe link.
    const sentMails = mockOutbox.filter((m) => m.subject.startsWith('Hi '));
    expect(sentMails.length).toBe(contactable.length);
    expect(sentMails[0].subject).not.toContain('{{');
    expect(sentMails[0].html.toLowerCase()).toContain('unsubscribe');

    // Settled to the emails actually sent: ⌈n/25⌉ credits.
    expect(await credits()).toBe(beforeSend - creditsFor('OUTREACH_EMAIL', contactable.length));

    // Stats reflect the sends.
    const afterSend = await ws(request(app).get(`/api/v1/sourcing/campaigns/${campaignId}`) as any);
    expect(afterSend.body.data.stats.sent).toBe(contactable.length);

    // Open tracking: loading the pixel promotes a SENT recipient to OPENED.
    const firstRec = await SourcingCampaignRecipientModel.findOne({ campaignId }).lean();
    const pixel = await request(app).get(`/api/v1/public/sourcing/open/${firstRec!.unsubscribeToken}.gif`);
    expect(pixel.status).toBe(200);
    expect(pixel.headers['content-type']).toBe('image/gif');

    // Reply threading: an inbound reply to campaign+<recipientId>@ marks REPLIED.
    const reply = await request(app)
      .post(`/api/v1/webhooks/inbound-email/${process.env.INBOUND_EMAIL_SECRET}`)
      .send({ to: `campaign+${firstRec!._id}@reply.test.fluxberry.dev`, from: 'candidate@example.com', text: 'Interested!' });
    expect(reply.status).toBe(200);

    const tracked = await ws(request(app).get(`/api/v1/sourcing/campaigns/${campaignId}`) as any);
    expect(tracked.body.data.stats.opened).toBeGreaterThanOrEqual(1);
    expect(tracked.body.data.stats.replied).toBeGreaterThanOrEqual(1);

    // Unsubscribe one recipient via the public token link → suppresses that email.
    const recDoc = await SourcingCampaignRecipientModel.findOne({ campaignId }).lean();
    const unsub = await request(app).get(`/api/v1/public/sourcing/unsubscribe/${recDoc!.unsubscribeToken}`);
    expect(unsub.status).toBe(200);

    // The funnel is monotonic: an unsubscribe records unsubscribed but never lowers sent.
    const afterUnsub = await ws(request(app).get(`/api/v1/sourcing/campaigns/${campaignId}`) as any);
    expect(afterUnsub.body.data.stats.sent).toBe(contactable.length);
    expect(afterUnsub.body.data.stats.unsubscribed).toBe(1);

    // A fresh campaign to the same list now skips the unsubscribed address.
    const campaign2 = await ws(
      request(app).post('/api/v1/sourcing/campaigns').send({
        name: 'Rust outreach 2',
        listId,
        subject: 'Following up',
        body: 'Hi {{firstName}}',
      }) as any,
    );
    const sent2 = await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaign2.body.data.id}/send`).send({}) as any);
    expect(sent2.body.data.stats.recipients).toBe(contactable.length - 1);
  });

  it('refunds a campaign email that fails permanently, so the reservation settles', async () => {
    const workspaceId = await onboard(token, 'Sourcing Fail', 'Failco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');
    const credits = async () => (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;

    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const one = (search.body.data.contacts as any[]).find((c) => c.hasEmail);
    const list = await ws(request(app).post('/api/v1/sourcing/lists').send({ name: 'Solo', contactIds: [one.id] }) as any);
    const campaign = await ws(
      request(app).post('/api/v1/sourcing/campaigns').send({ name: 'Solo', listId: list.body.data.id, subject: 'Hi', body: 'Hi {{firstName}}' }) as any,
    );
    const campaignId = campaign.body.data.id as string;

    const beforeSend = await credits();
    await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    expect(await credits()).toBe(beforeSend - 1); // reserved ⌈1/25⌉

    await sendSourcingCampaignHandler({ campaignId, workspaceId }, jobCtx);
    const [recipient] = (await ws(request(app).get(`/api/v1/sourcing/campaigns/${campaignId}/recipients`) as any)).body.data;
    const spy = vi.spyOn(getEmailProvider(), 'send').mockRejectedValue(new Error('mailbox provider down'));
    try {
      // A non-final failure keeps it PENDING for a retry — nothing settles yet.
      await expect(sendSourcingEmailHandler({ recipientId: recipient.id }, { ...jobCtx, attempts: 1, maxAttempts: 4 })).rejects.toThrow();
      expect((await SourcingCampaignRecipientModel.findById(recipient.id).lean())!.status).toBe('PENDING');
      expect(await credits()).toBe(beforeSend - 1);

      // The final attempt fails permanently → FAILED, and the unused credit is refunded.
      await expect(sendSourcingEmailHandler({ recipientId: recipient.id }, { ...jobCtx, attempts: 4, maxAttempts: 4 })).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }
    expect((await SourcingCampaignRecipientModel.findById(recipient.id).lean())!.status).toBe('FAILED');
    expect(await credits()).toBe(beforeSend);
  });

  it('applies the daily cap on the day emails go out, deferring the rest to the next day', async () => {
    const workspaceId = await onboard(token, 'Sourcing Cap', 'Capco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const two = (search.body.data.contacts as any[]).filter((c) => c.hasEmail).slice(0, 2);
    const list = await ws(request(app).post('/api/v1/sourcing/lists').send({ name: 'Pair', contactIds: two.map((c) => c.id) }) as any);
    const campaign = await ws(
      request(app).post('/api/v1/sourcing/campaigns').send({ name: 'Capped', listId: list.body.data.id, subject: 'Hi', body: 'Hi {{firstName}}' }) as any,
    );
    const campaignId = campaign.body.data.id as string;

    // One send left today: pressing Send succeeds; the cap is checked at dispatch.
    const day = new Date().toISOString().slice(0, 10);
    await OutreachDailyUsageModel.create({ workspaceId, day, count: PLAN_DAILY_OUTREACH_CAP.MAX - 1 });
    const sent = await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    expect(sent.status).toBe(200);

    await sendSourcingCampaignHandler({ campaignId, workspaceId }, jobCtx);
    const recs = await SourcingCampaignRecipientModel.find({ campaignId }).lean();
    expect(recs.filter((r) => r.dispatchedAt).length).toBe(1); // only today's remaining allowance
    expect((await OutreachDailyUsageModel.findOne({ workspaceId, day }).lean())!.count).toBe(PLAN_DAILY_OUTREACH_CAP.MAX);
    const cont = await JobQueueModel.findOne({ type: 'SEND_SOURCING_CAMPAIGN', 'payload.campaignId': campaignId, runAt: { $gt: new Date() } }).lean();
    expect(cont).toBeTruthy(); // the rest continues when the next UTC day opens
    expect((await SourcingCampaignModel.findById(campaignId).lean())!.status).toBe('SENDING');

    // Next day: the continuation dispatches the deferred recipient and finishes.
    await OutreachDailyUsageModel.deleteMany({ workspaceId });
    await sendSourcingCampaignHandler(cont!.payload as any, jobCtx);
    expect((await SourcingCampaignRecipientModel.find({ campaignId, dispatchedAt: null }).lean()).length).toBe(0);
    expect((await SourcingCampaignModel.findById(campaignId).lean())!.status).toBe('SENT');
  });

  it('settles the prior reservation before charging a resend, so held credits can fund it', async () => {
    const workspaceId = await onboard(token, 'Sourcing Resend', 'Resendco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const two = (search.body.data.contacts as any[]).filter((c) => c.hasEmail).slice(0, 2);
    const list = await ws(request(app).post('/api/v1/sourcing/lists').send({ name: 'Pair', contactIds: two.map((c) => c.id) }) as any);
    const campaign = await ws(
      request(app).post('/api/v1/sourcing/campaigns').send({ name: 'Resend', listId: list.body.data.id, subject: 'Hi', body: 'Hi {{firstName}}' }) as any,
    );
    const campaignId = campaign.body.data.id as string;

    await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    const firstTx = (await SourcingCampaignModel.findById(campaignId).lean())!.creditTxId!;
    // Nothing went out, the campaign failed, and the only credit left is the one the reservation holds.
    const ws2 = await WorkspaceModel.findById(workspaceId).select('accountId').lean();
    await AccountModel.findByIdAndUpdate(ws2!.accountId, { 'credits.allowanceRemaining': 0, 'credits.purchasedBalance': 0 });
    await SourcingCampaignModel.findByIdAndUpdate(campaignId, { status: 'FAILED' });

    const resend = await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    expect(resend.status).toBe(200); // funded by settling the prior reservation first
    expect((await CreditTransactionModel.findById(firstTx).lean())!.meta).toMatchObject({ quantity: 0 });
    expect((await SourcingCampaignModel.findById(campaignId).lean())!.creditTxId).not.toBe(firstTx);

    // A resend that genuinely can't be funded hands the campaign back, un-claimed.
    // (One email did go out under the current reservation, so settling it returns nothing.)
    const [firstRec] = await SourcingCampaignRecipientModel.find({ campaignId, status: 'PENDING' }).lean();
    await SourcingCampaignRecipientModel.findByIdAndUpdate(firstRec._id, { status: 'SENT', sentAt: new Date() });
    await AccountModel.findByIdAndUpdate(ws2!.accountId, { 'credits.allowanceRemaining': 0, 'credits.purchasedBalance': 0 });
    await SourcingCampaignModel.findByIdAndUpdate(campaignId, { status: 'PAUSED' });
    const broke = await ws(request(app).post(`/api/v1/sourcing/campaigns/${campaignId}/send`).send({}) as any);
    expect(broke.status).toBe(402);
    expect((await SourcingCampaignModel.findById(campaignId).lean())!.status).toBe('PAUSED');
  });

  it('charges a load-more retry again after a failed (refunded) attempt', async () => {
    const workspaceId = await onboard(token, 'Sourcing Retry', 'Retryco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const searchId = search.body.data.search.id as string;
    const credits = async () => (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data.total;

    const before = await credits();
    const spy = vi.spyOn(getPeopleSourcingProvider(), 'search').mockRejectedValueOnce(new Error('provider down'));
    const failed = await ws(request(app).post(`/api/v1/sourcing/searches/${searchId}/more`).send({}) as any);
    spy.mockRestore();
    expect(failed.status).toBe(502);
    expect(await credits()).toBe(before); // refunded

    const retry = await ws(request(app).post(`/api/v1/sourcing/searches/${searchId}/more`).send({}) as any);
    expect(retry.status).toBe(200);
    const added = retry.body.data.search.fetched - search.body.data.contacts.length;
    expect(added).toBeGreaterThan(0);
    expect(await credits()).toBe(before - creditsFor('SOURCING_PROFILE', added)); // not a free replay
  });

  it('refunds credits and does not gate below MAX', async () => {
    // A PRO workspace must be blocked with PLAN_UPGRADE_REQUIRED (sourcing is MAX-only).
    const workspaceId = await onboard(token, 'Sourcing Pro', 'Proco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'PRO');

    const blocked = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PLAN_UPGRADE_REQUIRED');
  });
});
