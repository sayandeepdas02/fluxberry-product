import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { JobQueueModel } from '../../src/models/job-queue.model';
import { processOnce } from '../../src/workers/runner';
import { mockOutbox } from '../../src/integrations';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

async function drainQueue() {
  while (await processOnce()) {
    /* keep claiming until the queue is empty */
  }
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_interview_reminder');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

beforeEach(() => {
  mockOutbox.length = 0;
});

async function setupScheduledInterview(emailPrefix: string) {
  const token = await tokenFor(`${emailPrefix}@test.com`, emailPrefix);
  const onboard = await request(app)
    .post('/api/v1/workspaces/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: emailPrefix, company: `${emailPrefix}Co` });
  const workspaceId = onboard.body.data.id as string;
  const slug = onboard.body.data.slug as string;
  const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

  const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Engineer' }) as any);
  const jobId = job.body.data.id as string;
  const jobSlug = job.body.data.slug as string;
  await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

  await request(app)
    .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
    .field('name', 'Reminder Candidate')
    .field('email', `${emailPrefix}-candidate@test.com`)
    .field('answers', '[]')
    .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
  const application = await ApplicationModel.findOne({ workspaceId }).lean();
  const applicationId = String(application!._id);

  const start = new Date(Date.now() + 25 * 3600_000); // >24h out so the reminder gets enqueued
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const created = await ws(
    request(app)
      .post(`/api/v1/applications/${applicationId}/scheduled-interviews`)
      .send({
        title: 'Onsite round',
        interviewers: [{ email: `${emailPrefix}-interviewer@test.com`, name: 'Interviewer' }],
        start: start.toISOString(),
        end: end.toISOString(),
        locationType: 'ONLINE',
        shareInterviewerLink: true,
      }) as any,
  );
  expect(created.status).toBe(201);

  return { ws, applicationId, interviewId: created.body.data.id as string };
}

async function forceReminderRunAtNow(interviewId: string) {
  await JobQueueModel.updateMany(
    { idempotencyKey: { $regex: `^interview-reminder:${interviewId}:` } },
    { $set: { runAt: new Date() } },
  );
}

describe('interview reminder emails (integration)', () => {
  it('sends reminder emails to candidate and interviewer when the interview is still active', async () => {
    const { interviewId } = await setupScheduledInterview('remind-active');

    const reminderJobs = await JobQueueModel.find({
      idempotencyKey: { $regex: `^interview-reminder:${interviewId}:` },
    }).lean();
    expect(reminderJobs.length).toBe(2); // one interviewer + one candidate

    await forceReminderRunAtNow(interviewId);
    await drainQueue();

    const reminderEmails = mockOutbox.filter((e) => e.subject.startsWith('Reminder:'));
    expect(reminderEmails.some((e) => e.to === 'remind-active-candidate@test.com')).toBe(true);
    expect(reminderEmails.some((e) => e.to === 'remind-active-interviewer@test.com')).toBe(true);
  });

  it('skips the reminder when the interview was cancelled first', async () => {
    const { ws, applicationId, interviewId } = await setupScheduledInterview('remind-cancelled');

    await ws(request(app).delete(`/api/v1/applications/${applicationId}/scheduled-interviews/${interviewId}`) as any);

    await forceReminderRunAtNow(interviewId);
    await drainQueue();

    const reminderEmails = mockOutbox.filter(
      (e) => e.subject.startsWith('Reminder:') && e.to.includes('remind-cancelled'),
    );
    expect(reminderEmails.length).toBe(0);
  });
});
