import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { InterviewModel } from '../../src/models/interview.model';
import { interviewService } from '../../src/services/interview.service';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  // Dedicated database so this file never races the other integration files.
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_interview');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('AI interview flow (integration, mock Bolna)', () => {
  it('configures, sends, runs, evaluates, and gates the webhook', async () => {
    const token = await tokenFor('ivrec@test.com', 'IV Rec');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'IV Rec', company: 'Talkco' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Engineer' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('name', 'Talky Candidate')
      .field('email', 'talky@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const applicationId = String(application!._id);

    // Configure the interview (mock provider syncs an agent -> agentReady true)
    const cfg = await ws(
      request(app).put(`/api/v1/jobs/${jobId}/interview-config`).send({
        objective: 'Screen backend depth',
        introduction: 'Hi {candidate_name}',
        questions: [{ id: 'q1', text: 'Tell me about yourself', followUpAllowed: false }],
        durationMinutes: 6,
        tone: 'professional',
        language: 'en',
        status: 'ACTIVE',
      }) as any,
    );
    expect(cfg.status).toBe(200);
    expect(cfg.body.data.agentReady).toBe(true);

    // Send the interview to the candidate
    const sent = await ws(
      request(app).post(`/api/v1/applications/${applicationId}/interview`).send({ expiresInHours: 168 }) as any,
    );
    expect(sent.status).toBe(201);
    const iv = await InterviewModel.findOne({ applicationId });
    const secureToken = iv!.secureToken as string;
    const interviewId = String(iv!._id);

    // Candidate view + session mint (mock returns the scripted questions)
    const view = await request(app).get(`/api/v1/public/interviews/${secureToken}`);
    expect(view.body.data.status).toBe('INVITED');
    expect(view.body.data.questionCount).toBe(1);

    const session = await request(app).post(`/api/v1/public/interviews/${secureToken}/session`);
    expect(session.body.data.provider).toBe('mock');
    expect(session.body.data.questions).toEqual(['Tell me about yourself']);

    // Candidate finishes -> IN_PROGRESS
    const complete = await request(app).post(`/api/v1/public/interviews/${secureToken}/complete`).send({});
    expect(complete.body.data.status).toBe('IN_PROGRESS');

    // Drive the evaluate worker
    await interviewService.evaluate({ interviewId });

    // Recruiter sees the completed interview + evaluation
    const list = await ws(request(app).get(`/api/v1/applications/${applicationId}/interviews`) as any);
    const done = list.body.data[0];
    expect(done.status).toBe('COMPLETED');
    expect(done.transcript).toBeTruthy();
    expect(done.evaluation.overallScore).toBeGreaterThanOrEqual(0);

    // Webhook is gated by the URL secret (fail-closed on a wrong secret)
    const badHook = await request(app).post('/api/v1/webhooks/bolna/wrong-secret').send({ id: 'x' });
    expect(badHook.status).toBe(403);
    const goodHook = await request(app)
      .post('/api/v1/webhooks/bolna/test-webhook-secret')
      .send({ id: 'unknown-exec' });
    expect(goodHook.status).toBe(200); // unknown execution is ignored gracefully
  });

  it('refuses to let a second candidate claim another candidate\'s execution id for the same job', async () => {
    const token = await tokenFor('ivrec2@test.com', 'IV Rec 2');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'IV Rec 2', company: 'Talkco2' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Engineer 2' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);
    await ws(
      request(app).put(`/api/v1/jobs/${jobId}/interview-config`).send({
        objective: 'Screen backend depth',
        introduction: 'Hi {candidate_name}',
        questions: [{ id: 'q1', text: 'Tell me about yourself', followUpAllowed: false }],
        durationMinutes: 6,
        tone: 'professional',
        language: 'en',
        status: 'ACTIVE',
      }) as any,
    );

    // Two candidates apply to the same job -> same providerAgentId on both interviews.
    for (const email of ['candA@test.com', 'candB@test.com']) {
      await request(app)
        .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
        .field('name', email)
        .field('email', email)
        .field('answers', '[]')
        .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    }
    const apps = await ApplicationModel.find({ workspaceId }).lean();
    expect(apps.length).toBe(2);

    const tokens: string[] = [];
    for (const a of apps) {
      const sent = await ws(
        request(app).post(`/api/v1/applications/${a._id}/interview`).send({ expiresInHours: 168 }) as any,
      );
      expect(sent.status).toBe(201);
      const iv = await InterviewModel.findOne({ applicationId: a._id });
      tokens.push(iv!.secureToken as string);
      await request(app).post(`/api/v1/public/interviews/${iv!.secureToken}/session`);
    }

    const [tokenA, tokenB] = tokens;
    const sharedExecId = 'shared-exec-id-123';

    const completeA = await request(app)
      .post(`/api/v1/public/interviews/${tokenA}/complete`)
      .send({ executionId: sharedExecId });
    expect(completeA.body.data.status).toBe('IN_PROGRESS');

    // Candidate B tries to claim candidate A's execution id for their own interview.
    const completeB = await request(app)
      .post(`/api/v1/public/interviews/${tokenB}/complete`)
      .send({ executionId: sharedExecId });
    expect(completeB.status).toBe(409);

    const ivB = await InterviewModel.findOne({ secureToken: tokenB });
    expect(ivB!.providerExecutionId).not.toBe(sharedExecId);
  });
});
