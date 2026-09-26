import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { AccountModel } from '../../src/models/account.model';
import { ApplicationModel } from '../../src/models/application.model';
import { JobQueueModel } from '../../src/models/job-queue.model';
import { screeningService } from '../../src/services/screening.service';
import { jobQueue } from '../../src/queue/job-queue';
import { activateSubscription } from './helpers/activate-subscription';
import { PLAN_CREDIT_ALLOWANCE, PLAN_SCREENING_QUOTA } from '../../src/shared';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

let token: string;
let workspaceId: string;
let accountId: string;
let slug: string;
let jobSlug: string;
let jobId: string;
let applicantN = 0;
const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

async function apply() {
  const n = ++applicantN;
  const res = await request(app)
    .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
    .field('name', `Applicant ${n}`)
    .field('email', `applicant${n}@screen.test`)
    .field('answers', '[]')
    .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
  expect(res.status).toBe(201);
  return ApplicationModel.findOne({ workspaceId, jobId }).sort({ createdAt: -1 }).lean();
}

const balance = async () => (await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/credits`) as any)).body.data;

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_screening_credits');
  await mongoose.connection.dropDatabase();
  token = await tokenFor('screening-owner@test.com', 'Screening Owner');
  const onboard = await request(app)
    .post('/api/v1/workspaces/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Screening Owner', company: 'Screenco' });
  workspaceId = onboard.body.data.id;
  slug = onboard.body.data.slug;
  await activateSubscription(workspaceId, 'PRO');
  accountId = String((await WorkspaceModel.findById(workspaceId).select('accountId').lean())!.accountId);

  const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Data Engineer', skills: [{ name: 'SQL', required: true }] }) as any);
  jobId = job.body.data.id;
  jobSlug = job.body.data.slug;
  await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('applicant AI screening — quota, then credits, never blocking', () => {
  it('covers applicants from the plan quota without spending credits', async () => {
    const app1 = await apply();
    expect(app1!.screeningBilledVia).toBe('QUOTA');
    const b = await balance();
    expect(b.screeningsUsed).toBe(1);
    expect(b.screeningQuota).toBe(PLAN_SCREENING_QUOTA.PRO);
    expect(b.total).toBe(PLAN_CREDIT_ALLOWANCE.PRO);
  });

  it('charges 1 credit per applicant once the quota is used up', async () => {
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.screeningsUsed': PLAN_SCREENING_QUOTA.PRO });
    const app2 = await apply();
    expect(app2!.screeningBilledVia).toBe('CREDITS');
    expect((await balance()).total).toBe(PLAN_CREDIT_ALLOWANCE.PRO - 1);
  });

  it('still accepts applicants with no quota or credits, leaving them awaiting screening', async () => {
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.allowanceRemaining': 0, 'credits.purchasedBalance': 0 });
    const app3 = await apply();
    expect(app3!.screeningResult?.status).toBe('AWAITING_CREDITS');
    expect(app3!.screeningBilledVia).toBeNull();
    expect(await JobQueueModel.countDocuments({ 'payload.applicationId': String(app3!._id) })).toBe(0);

    const pending = await ws(request(app).get(`/api/v1/jobs/${jobId}/screen-pending`) as any);
    expect(pending.body.data.pending).toBe(1);

    const blocked = await ws(request(app).post(`/api/v1/jobs/${jobId}/screen-pending`) as any);
    expect(blocked.status).toBe(402);

    await AccountModel.findByIdAndUpdate(accountId, { 'credits.purchasedBalance': 5 });
    const run = await ws(request(app).post(`/api/v1/jobs/${jobId}/screen-pending`) as any);
    expect(run.status).toBe(200);
    expect(run.body.data).toEqual({ queued: 1, remaining: 0 });
    const after = await ApplicationModel.findById(app3!._id).lean();
    expect(after!.screeningResult?.status).toBe('PENDING');
    expect((await balance()).purchasedBalance).toBe(4);
  });

  it('re-screen charges a credit and genuinely re-queues screening', async () => {
    const app4 = await ApplicationModel.findOne({ workspaceId, screeningBilledVia: 'QUOTA' }).lean();
    const appId = String(app4!._id);
    // First run chains a SCREEN job; a re-screen run must chain a new one (not dedupe).
    await screeningService.parseResume({ workspaceId, candidateId: String(app4!.candidateId), applicationId: appId });
    const before = await JobQueueModel.countDocuments({ type: 'SCREEN_CANDIDATE', 'payload.applicationId': appId });
    // The first screening finished (a re-screen while one is still queued is rejected).
    await ApplicationModel.findByIdAndUpdate(appId, { 'screeningResult.status': 'COMPLETED' });

    const credit = (await balance()).total;
    const res = await ws(request(app).post(`/api/v1/applications/${appId}/rescreen`) as any);
    expect(res.status).toBe(200);
    expect((await balance()).total).toBe(credit - 1);

    const parseJob = await JobQueueModel.findOne({ type: 'PARSE_RESUME', 'payload.applicationId': appId }).sort({ createdAt: -1 }).lean();
    await screeningService.parseResume(parseJob!.payload as any);
    const afterCount = await JobQueueModel.countDocuments({ type: 'SCREEN_CANDIDATE', 'payload.applicationId': appId });
    expect(afterCount).toBe(before + 1);
  });

  it('retries a failed (already paid-for) screening for free', async () => {
    const paid = await ApplicationModel.findOne({ workspaceId, screeningBilledVia: 'CREDITS' }).lean();
    await ApplicationModel.findByIdAndUpdate(paid!._id, { 'screeningResult.status': 'FAILED' });
    const before = (await balance()).total;
    const res = await ws(request(app).post(`/api/v1/applications/${paid!._id}/rescreen`) as any);
    expect(res.status).toBe(200);
    expect((await balance()).total).toBe(before);
  });

  it('bills an application once even when two callers race to screen it', async () => {
    const target = await ApplicationModel.findOne({ workspaceId, screeningBilledVia: 'QUOTA' }).lean();
    const appId = String(target!._id);
    await ApplicationModel.findByIdAndUpdate(appId, { screeningBilledVia: null, screeningClaimAt: null });
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.screeningsUsed': 0 });

    const results = await Promise.all([
      screeningService.authorizeScreening(workspaceId, appId),
      screeningService.authorizeScreening(workspaceId, appId),
      screeningService.authorizeScreening(workspaceId, appId),
    ]);
    expect(results.some(Boolean)).toBe(true);
    const acct = await AccountModel.findById(accountId).lean();
    expect(acct!.credits?.screeningsUsed).toBe(1); // quota taken exactly once
    const after = await ApplicationModel.findById(appId).lean();
    expect(after!.screeningBilledVia).toBe('QUOTA');
    expect(after!.screeningClaimAt).toBeNull();
  });

  it('rejects a re-screen while one is already queued, charging once', async () => {
    const target = await ApplicationModel.findOne({ workspaceId, 'screeningResult.status': { $ne: 'AWAITING_CREDITS' } }).lean();
    const appId = String(target!._id);
    await ApplicationModel.findByIdAndUpdate(appId, { 'screeningResult.status': 'COMPLETED', screeningBilledVia: 'QUOTA' });
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.purchasedBalance': 10 });
    const before = (await balance()).total;
    const [a, b] = await Promise.all([
      ws(request(app).post(`/api/v1/applications/${appId}/rescreen`) as any),
      ws(request(app).post(`/api/v1/applications/${appId}/rescreen`) as any),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await balance()).total).toBe(before - 1);
  });

  it('never fails an application when queueing its screening fails', async () => {
    await AccountModel.findByIdAndUpdate(accountId, {
      'billing.subscriptionStatus': 'active',
      'credits.screeningsUsed': 0,
    });
    const spy = vi.spyOn(jobQueue, 'enqueue').mockRejectedValueOnce(new Error('queue down'));
    let created;
    try {
      created = await apply(); // asserts 201 inside
    } finally {
      spy.mockRestore();
    }
    expect(created!.screeningBilledVia).toBe('QUOTA');
    expect(created!.screeningResult?.status).toBe('FAILED'); // retryable for free
  });

  it('does not queue duplicate runs when screen-pending is triggered twice at once', async () => {
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.screeningsUsed': PLAN_SCREENING_QUOTA.PRO, 'credits.allowanceRemaining': 0, 'credits.purchasedBalance': 0 });
    const waiting = await apply();
    expect(waiting!.screeningResult?.status).toBe('AWAITING_CREDITS');
    await AccountModel.findByIdAndUpdate(accountId, { 'credits.purchasedBalance': 5 });
    await Promise.all([
      ws(request(app).post(`/api/v1/jobs/${jobId}/screen-pending`) as any),
      ws(request(app).post(`/api/v1/jobs/${jobId}/screen-pending`) as any),
    ]);
    const runs = await JobQueueModel.countDocuments({ type: 'PARSE_RESUME', 'payload.applicationId': String(waiting!._id) });
    expect(runs).toBe(1);
    expect((await balance()).purchasedBalance).toBe(4);
  });

  it('skips AI (and charges nothing) when the subscription has lapsed', async () => {
    await AccountModel.findByIdAndUpdate(accountId, {
      'billing.subscriptionStatus': 'cancelled',
      'credits.screeningsUsed': 0,
      'credits.purchasedBalance': 50,
    });
    const app5 = await apply();
    expect(app5!.screeningResult?.status).toBe('AWAITING_CREDITS');
    const acct = await AccountModel.findById(accountId).lean();
    expect(acct!.credits?.purchasedBalance).toBe(50);
    expect(acct!.credits?.screeningsUsed).toBe(0);
  });
});
