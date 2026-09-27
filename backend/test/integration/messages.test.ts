import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { mockOutbox } from '../../src/integrations';
import { claimNextJob, completeJob } from '../../src/queue/job-queue';
import { sendEmailHandler } from '../../src/workers/handlers/send-email';
import { logger } from '../../src/utils/logger';
import { activateSubscription } from './helpers/activate-subscription';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_messages');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('candidate messaging (integration)', () => {
  it('sends an outbound message via email, then threads an inbound reply', async () => {
    const token = await tokenFor('msgsrec@test.com', 'Msgs Rec');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Msgs Rec', company: 'Msgco' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Support Lead' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('privacyConsent', 'true')
      .field('name', 'Message Candidate')
      .field('email', 'msgcand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const applicationId = String(application!._id);

    // Empty thread initially.
    const empty = await ws(request(app).get(`/api/v1/applications/${applicationId}/messages`) as any);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toHaveLength(0);

    // Recruiter sends an ad-hoc message.
    const sent = await ws(
      request(app).post(`/api/v1/applications/${applicationId}/messages`).send({
        subject: 'Quick question',
        body: 'Are you available for a call this week?',
      }) as any,
    );
    expect(sent.status).toBe(201);
    expect(sent.body.data.sender).toBe('recruiter');
    expect(sent.body.data.direction).toBe('outbound');

    // Drive every queued SEND_EMAIL job directly (no worker process in tests,
    // and the application-confirmation email is also queued ahead of ours) —
    // same convention as other async-processing tests.
    for (;;) {
      const job = await claimNextJob('test-worker');
      if (!job) break;
      await sendEmailHandler(job.payload, { jobId: String(job._id), attempts: job.attempts ?? 0, logger });
      await completeJob(String(job._id));
    }

    // It queued a real email with the Reply-To convention (both the ad-hoc
    // message and the earlier application-confirmation email land in the
    // same mock outbox, so match on subject to find ours specifically).
    const outboxEntry = mockOutbox.find((m) => m.to === 'msgcand@test.com' && m.subject === 'Quick question');
    expect(outboxEntry).toBeTruthy();
    expect(outboxEntry!.replyTo).toBe(`application+${applicationId}@reply.test.fluxberry.dev`);

    // Candidate replies — simulated inbound webhook.
    const inbound = await request(app)
      .post('/api/v1/webhooks/inbound-email/test-inbound-secret')
      .send({
        to: `application+${applicationId}@reply.test.fluxberry.dev`,
        from: 'msgcand@test.com',
        subject: 'Re: Quick question',
        text: 'Yes, Thursday afternoon works!',
        messageId: 'inbound-msg-1',
      });
    expect(inbound.status).toBe(200);

    // Thread now has both messages, in order.
    const thread = await ws(request(app).get(`/api/v1/applications/${applicationId}/messages`) as any);
    expect(thread.body.data).toHaveLength(2);
    expect(thread.body.data[0].direction).toBe('outbound');
    expect(thread.body.data[1]).toMatchObject({ direction: 'inbound', sender: 'candidate', body: 'Yes, Thursday afternoon works!' });

    // Replaying the same inbound webhook (retry) does not duplicate the message.
    await request(app)
      .post('/api/v1/webhooks/inbound-email/test-inbound-secret')
      .send({
        to: `application+${applicationId}@reply.test.fluxberry.dev`,
        from: 'msgcand@test.com',
        subject: 'Re: Quick question',
        text: 'Yes, Thursday afternoon works!',
        messageId: 'inbound-msg-1',
      });
    const threadAfterRetry = await ws(request(app).get(`/api/v1/applications/${applicationId}/messages`) as any);
    expect(threadAfterRetry.body.data).toHaveLength(2);

    // Wrong webhook secret is rejected.
    const badSecret = await request(app)
      .post('/api/v1/webhooks/inbound-email/wrong-secret')
      .send({ to: `application+${applicationId}@reply.test.fluxberry.dev`, from: 'x@test.com', text: 'hi' });
    expect(badSecret.status).toBe(403);
  });
});
