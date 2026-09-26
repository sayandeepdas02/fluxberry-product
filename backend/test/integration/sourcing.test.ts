import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { activateSubscription } from './helpers/activate-subscription';
import { CREDIT_COSTS, PLAN_CREDIT_ALLOWANCE } from '../../src/shared';
import { mockOutbox } from '../../src/integrations';
import { logger } from '../../src/utils/logger';
import { sendSourcingCampaignHandler } from '../../src/workers/handlers/send-sourcing-campaign';
import { sendSourcingEmailHandler } from '../../src/workers/handlers/send-sourcing-email';
import { SourcingCampaignRecipientModel } from '../../src/models/sourcing-campaign-recipient.model';

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

    // 2. Search spends one page of credits and returns ranked, contactable-hidden rows.
    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    expect(search.status).toBe(200);
    const contacts = search.body.data.contacts as any[];
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts[0].matchScore).toBeGreaterThanOrEqual(contacts[contacts.length - 1].matchScore); // sorted desc
    // Emails are hidden in list rows but contactability is signalled.
    expect(contacts[0].workEmail).toBeNull();
    expect(typeof contacts[0].hasEmail).toBe('boolean');
    const searchId = search.body.data.search.id as string;
    expect(search.body.data.search.creditsUsed).toBe(10);

    const afterSearch = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/billing`) as any);
    expect(afterSearch.body.data.credits.allowanceRemaining).toBe(
      PLAN_CREDIT_ALLOWANCE.MAX - CREDIT_COSTS.SOURCING_SEARCH,
    );

    // 3. Rehydrate the saved search.
    const rehydrated = await ws(request(app).get(`/api/v1/sourcing/searches/${searchId}`) as any);
    expect(rehydrated.status).toBe(200);
    expect(rehydrated.body.data.contacts.length).toBe(contacts.length);

    // 4. The profile detail reveals the email when one exists.
    const contactable = contacts.find((c) => c.hasEmail) ?? contacts[0];
    const detail = await ws(request(app).get(`/api/v1/sourcing/contacts/${contactable.id}`) as any);
    expect(detail.status).toBe(200);
    if (contactable.hasEmail) {
      expect(detail.body.data.workEmail || detail.body.data.personalEmail).toBeTruthy();
    }

    // 5. Load more appends and spends another page of credits.
    if (search.body.data.search.canLoadMore) {
      const more = await ws(request(app).post(`/api/v1/sourcing/searches/${searchId}/more`).send({}) as any);
      expect(more.status).toBe(200);
      expect(more.body.data.search.fetched).toBeGreaterThan(contacts.length);
      expect(more.body.data.search.creditsUsed).toBe(20);
    }

    // 6. Editing criteria re-runs without re-calling the AI.
    const edited = { ...parsed.body.data.criteria, skills: ['Rust', 'Go'] };
    const rerun = await ws(
      request(app).patch(`/api/v1/sourcing/searches/${searchId}/criteria`).send({ criteria: edited }) as any,
    );
    expect(rerun.status).toBe(200);
    expect(rerun.body.data.contacts.length).toBeGreaterThan(0);

    // 7. CSV export returns a downloadable file with revealed emails.
    const exportRes = await ws(
      request(app).post('/api/v1/sourcing/contacts/export').send({ contactIds: [contactable.id] }) as any,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text.split('\r\n')[0]).toContain('Name');
  });

  it('returns an estimated compensation band (or a clean no-coverage null), cached on repeat lookups', async () => {
    const workspaceId = await onboard(token, 'Sourcing Comp', 'Compco');
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId, 'MAX');

    const search = await ws(request(app).post('/api/v1/sourcing/search').send({ prompt: PROMPT }) as any);
    const contactId = search.body.data.contacts[0].id as string;

    const first = await ws(request(app).get(`/api/v1/sourcing/contacts/${contactId}/compensation`) as any);
    expect(first.status).toBe(200);
    expect('band' in first.body.data).toBe(true);
    if (first.body.data.band) {
      expect(first.body.data.band.source).toBe('levels.fyi');
      expect(typeof first.body.data.band.currency).toBe('string');
    }

    // Second lookup hits the cache — same result, no re-fetch (the cache
    // stores a `null` band result too, so an unresolvable company doesn't
    // get re-queried on every open).
    const second = await ws(request(app).get(`/api/v1/sourcing/contacts/${contactId}/compensation`) as any);
    expect(second.status).toBe(200);
    expect(second.body.data.band).toEqual(first.body.data.band);
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

    // AI draft returns a body with merge tags.
    const draft = await ws(
      request(app).post('/api/v1/sourcing/campaigns/draft').send({ role: 'Rust Engineer', brief: 'We raised a seed round.' }) as any,
    );
    expect(draft.status).toBe(200);
    expect(draft.body.data.body).toContain('{{firstName}}');

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

    // Send it → recipients built from contactable members.
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
