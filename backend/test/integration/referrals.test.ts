import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { mockOutbox } from '../../src/integrations';
import { processOnce } from '../../src/workers/runner';
import { activateSubscription } from './helpers/activate-subscription';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

/** Invites are pending-until-accepted now — send the invite, pull the token out of
 * the mock outbox (that's the invitee's email), then accept it as that user. */
async function inviteAndAccept(
  asOwner: (r: request.Test) => request.Test,
  workspaceId: string,
  email: string,
  role: string,
): Promise<void> {
  await asOwner(request(app).post(`/api/v1/workspaces/${workspaceId}/invites`).send({ email, role }) as any);
  while (await processOnce()) {
    /* drain the queue so the invite email actually lands in the mock outbox */
  }
  const sent = [...mockOutbox].reverse().find((e) => e.to === email);
  const token = sent!.text!.match(/\/accept-invite\/(\S+)/)![1];
  const userToken = await tokenFor(email);
  await request(app).post(`/api/v1/invites/${token}/accept`).set('Authorization', `Bearer ${userToken}`).send();
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_referrals');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('employee referrals (integration)', () => {
  it('generates a link, attributes an application through it, and lets an admin track the reward', async () => {
    const ownerToken = await tokenFor('refowner@test.com', 'Ref Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Ref Owner', company: 'Refco' });
    const workspaceId = onboard.body.data.id as string;
    const workspaceSlug = onboard.body.data.slug as string;
    const ownerWs = (r: request.Test) => r.set('Authorization', `Bearer ${ownerToken}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    // A recruiter member who will generate the referral link.
    await inviteAndAccept(ownerWs, workspaceId, 'refrecruiter@test.com', 'recruiter');
    const recruiterToken = await tokenFor('refrecruiter@test.com');
    const recruiterWs = (r: request.Test) => r.set('Authorization', `Bearer ${recruiterToken}`).set('X-Workspace-Id', workspaceId);

    const job = await ownerWs(request(app).post('/api/v1/jobs').send({ title: 'Referral Role' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;

    // Can't generate a link for a job that isn't open yet.
    const tooEarly = await recruiterWs(request(app).post('/api/v1/referrals').send({ jobId }) as any);
    expect(tooEarly.status).toBe(400);

    await ownerWs(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    const created = await recruiterWs(request(app).post('/api/v1/referrals').send({ jobId }) as any);
    expect(created.status).toBe(201);
    const code = created.body.data.code as string;
    expect(created.body.data.shareUrl).toContain(code);
    expect(created.body.data.applicationCount).toBe(0);

    // Re-requesting a link for the same (member, job) returns the same code (get-or-create).
    const again = await recruiterWs(request(app).post('/api/v1/referrals').send({ jobId }) as any);
    expect(again.body.data.code).toBe(code);

    // The public redirect resolver finds the right destination.
    const resolved = await request(app).get(`/api/v1/public/referrals/${code}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data).toEqual({ workspaceSlug, jobSlug });

    // A stray/unknown ref code never blocks the application, and never gets attributed.
    const strayApply = await request(app)
      .post(`/api/v1/public/jobs/${workspaceSlug}/${jobSlug}/apply`)
      .field('name', 'Stray Candidate')
      .field('email', 'straycand@test.com')
      .field('source', 'DIRECT')
      .field('referralCode', 'NOTAREALCODE')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(strayApply.status).toBe(201);
    const strayApp = await ApplicationModel.findOne({ workspaceId, _id: strayApply.body.data.applicationId }).lean();
    expect(strayApp!.source).toBe('DIRECT');
    expect(strayApp!.referralCode ?? null).toBeNull();

    // A real code attributes the application as REFERRAL, overriding a client-claimed source.
    const apply = await request(app)
      .post(`/api/v1/public/jobs/${workspaceSlug}/${jobSlug}/apply`)
      .field('name', 'Referred Candidate')
      .field('email', 'referredcand@test.com')
      .field('source', 'DIRECT')
      .field('referralCode', code)
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(apply.status).toBe(201);
    const application = await ApplicationModel.findById(apply.body.data.applicationId).lean();
    expect(application!.source).toBe('REFERRAL');
    expect(application!.referralCode).toBe(code);

    // The recruiter's dashboard shows the new applicant.
    const mine = await recruiterWs(request(app).get('/api/v1/referrals/my') as any);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].applicationCount).toBe(1);
    expect(mine.body.data[0].hiredCount).toBe(0);
    expect(mine.body.data[0].rewardStatus).toBe('NONE');

    // A non-admin can't see or manage workspace-wide referrals/rewards.
    const forbiddenList = await recruiterWs(request(app).get(`/api/v1/workspaces/${workspaceId}/referrals`) as any);
    expect(forbiddenList.status).toBe(403);

    // The owner (admin+) can, and can mark the reward as paid.
    const adminList = await ownerWs(request(app).get(`/api/v1/workspaces/${workspaceId}/referrals`) as any);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(1);
    const referralId = adminList.body.data[0].id as string;

    const rewarded = await ownerWs(
      request(app).patch(`/api/v1/workspaces/${workspaceId}/referrals/${referralId}/reward`).send({ rewardStatus: 'PAID', rewardNote: 'Paid via UPI' }) as any,
    );
    expect(rewarded.status).toBe(200);
    expect(rewarded.body.data.rewardStatus).toBe('PAID');
    expect(rewarded.body.data.rewardNote).toBe('Paid via UPI');

    // A job restricted away from this recruiter must be invisible for referral
    // creation too, not just candidate/job routes — same 404-not-403 convention.
    const restrictedJob = await ownerWs(request(app).post('/api/v1/jobs').send({ title: 'Restricted Referral Role' }) as any);
    const restrictedJobId = restrictedJob.body.data.id as string;
    await ownerWs(request(app).post(`/api/v1/jobs/${restrictedJobId}/publish`) as any);
    const members = await ownerWs(request(app).get(`/api/v1/workspaces/${workspaceId}/members`) as any);
    const ownerUserId = members.body.data.find((m: any) => m.role === 'owner').userId as string;
    await ownerWs(request(app).put(`/api/v1/jobs/${restrictedJobId}/access`).send({ restrictedTo: [ownerUserId] }) as any);

    const blocked = await recruiterWs(request(app).post('/api/v1/referrals').send({ jobId: restrictedJobId }) as any);
    expect(blocked.status).toBe(404);
  });
});
