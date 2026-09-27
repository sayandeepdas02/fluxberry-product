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
): Promise<string> {
  await asOwner(request(app).post(`/api/v1/workspaces/${workspaceId}/invites`).send({ email, role }) as any);
  while (await processOnce()) {
    /* drain the queue so the invite email actually lands in the mock outbox */
  }
  const sent = [...mockOutbox].reverse().find((e) => e.to === email);
  const token = sent!.text!.match(/\/accept-invite\/(\S+)/)![1];
  const userToken = await tokenFor(email);
  const accept = await request(app).post(`/api/v1/invites/${token}/accept`).set('Authorization', `Bearer ${userToken}`).send();
  return accept.body.data.member.userId as string;
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_job_access');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('per-job access control (integration)', () => {
  it('hides a restricted job/candidate from an excluded recruiter and shows it to an included one', async () => {
    const ownerToken = await tokenFor('owner@access.test', 'Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner', company: 'Accessco' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const asOwner = (r: request.Test) => r.set('Authorization', `Bearer ${ownerToken}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    // Two recruiters: one will be granted access, one excluded.
    const inUserId = await inviteAndAccept(asOwner, workspaceId, 'in@access.test', 'recruiter');
    await inviteAndAccept(asOwner, workspaceId, 'out@access.test', 'recruiter');

    const inToken = await tokenFor('in@access.test', 'Recruiter In');
    const outToken = await tokenFor('out@access.test', 'Recruiter Out');
    const asIn = (r: request.Test) => r.set('Authorization', `Bearer ${inToken}`).set('X-Workspace-Id', workspaceId);
    const asOut = (r: request.Test) => r.set('Authorization', `Bearer ${outToken}`).set('X-Workspace-Id', workspaceId);

    // A restricted job with one application.
    const job = await asOwner(request(app).post('/api/v1/jobs').send({ title: 'Confidential Role' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    expect(job.body.data.restrictedTo).toEqual([]);
    await asOwner(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);
    await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('privacyConsent', 'true')
      .field('name', 'Restricted Candidate')
      .field('email', 'restrictedcand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const candidateId = String(application!.candidateId);
    const applicationId = String(application!._id);

    const restrict = await asOwner(request(app).put(`/api/v1/jobs/${jobId}/access`).send({ restrictedTo: [inUserId] }) as any);
    expect(restrict.status).toBe(200);
    expect(restrict.body.data.restrictedTo).toEqual([inUserId]);

    // Excluded recruiter: the job and its candidate are invisible, not just blocked.
    expect((await asOut(request(app).get(`/api/v1/jobs/${jobId}`) as any)).status).toBe(404);
    const outJobs = await asOut(request(app).get('/api/v1/jobs') as any);
    expect(outJobs.body.data.map((j: any) => j.id)).not.toContain(jobId);
    expect((await asOut(request(app).get(`/api/v1/candidates/${candidateId}`) as any)).status).toBe(404);
    const outCandidates = await asOut(request(app).get('/api/v1/candidates') as any);
    expect(outCandidates.body.data.total).toBe(0);
    expect((await asOut(request(app).get(`/api/v1/applications/${applicationId}`) as any)).status).toBe(404);
    const outAnalytics = await asOut(request(app).get('/api/v1/analytics') as any);
    expect(outAnalytics.body.data.metrics.totalApplicants).toBe(0);

    // Bulk-action silently skips a restricted application for an excluded actor.
    const bulk = await asOut(
      request(app)
        .post('/api/v1/applications/bulk-action')
        .send({ applicationIds: [applicationId], action: 'reject', reason: 'OTHER' }) as any,
    );
    expect(bulk.status).toBe(200);
    expect(bulk.body.data).toEqual({ succeeded: 0, failed: 0, skipped: 1 });

    // Included recruiter: full visibility.
    expect((await asIn(request(app).get(`/api/v1/jobs/${jobId}`) as any)).status).toBe(200);
    const inJobs = await asIn(request(app).get('/api/v1/jobs') as any);
    expect(inJobs.body.data.map((j: any) => j.id)).toContain(jobId);
    expect((await asIn(request(app).get(`/api/v1/candidates/${candidateId}`) as any)).status).toBe(200);
    const inAnalytics = await asIn(request(app).get('/api/v1/analytics') as any);
    expect(inAnalytics.body.data.metrics.totalApplicants).toBe(1);

    // Owner/admin always sees everything, restriction or not.
    expect((await asOwner(request(app).get(`/api/v1/jobs/${jobId}`) as any)).status).toBe(200);
    const ownerAnalytics = await asOwner(request(app).get('/api/v1/analytics') as any);
    expect(ownerAnalytics.body.data.metrics.totalApplicants).toBe(1);

    // Clearing the restriction restores visibility for everyone.
    const cleared = await asOwner(request(app).put(`/api/v1/jobs/${jobId}/access`).send({ restrictedTo: [] }) as any);
    expect(cleared.body.data.restrictedTo).toEqual([]);
    expect((await asOut(request(app).get(`/api/v1/jobs/${jobId}`) as any)).status).toBe(200);
  });

  it('rejects granting access to a non-member', async () => {
    const ownerToken = await tokenFor('owner2@access.test', 'Owner Two');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Two', company: 'Accessco2' });
    const workspaceId = onboard.body.data.id as string;
    const asOwner = (r: request.Test) => r.set('Authorization', `Bearer ${ownerToken}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    const job = await asOwner(request(app).post('/api/v1/jobs').send({ title: 'Another Role' }) as any);
    const jobId = job.body.data.id as string;

    const res = await asOwner(
      request(app).put(`/api/v1/jobs/${jobId}/access`).send({ restrictedTo: ['000000000000000000000000'] }) as any,
    );
    expect(res.status).toBe(400);
  });
});
