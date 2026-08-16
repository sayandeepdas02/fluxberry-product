import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { CandidateAssessmentModel } from '../../src/models/candidate-assessment.model';
import { codingGradingService } from '../../src/services/coding-grading.service';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  // Dedicated database so this file never races the other integration file.
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_coding');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('coding assessment flow (integration, mock Judge0)', () => {
  it('invites, submits code, grades via Judge0, and finalizes the score', async () => {
    const token = await tokenFor('coderec@test.com', 'Coding Rec');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Coding Rec', company: 'Codeco' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);

    // Job + publish
    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Engineer' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    // Candidate applies
    await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('name', 'Coder Candidate')
      .field('email', 'coder@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const applicationId = String(application!._id);

    // Coding question with one visible + one hidden test case
    const q = await ws(
      request(app).post('/api/v1/questions').send({
        type: 'CODING',
        questionText: 'Print ok',
        category: 'Basics',
        coding: {
          languageIds: [71],
          testCases: [
            { input: '', expected: 'ok', hidden: false, points: 1 },
            { input: '2', expected: 'ok', hidden: true, points: 1 },
          ],
        },
      }) as any,
    );
    expect(q.status).toBe(201);
    const questionId = q.body.data.id as string;
    expect(q.body.data.coding.testCases).toHaveLength(2);

    // Coding assessment, then publish
    const created = await ws(
      request(app).post('/api/v1/assessments').send({
        type: 'CODING',
        name: 'Coding Test',
        durationMinutes: 30,
        questions: [{ questionId, points: 1, sortOrder: 0 }],
      }) as any,
    );
    expect(created.status).toBe(201);
    const assessmentId = created.body.data.id as string;
    await ws(request(app).patch(`/api/v1/assessments/${assessmentId}`).send({ status: 'PUBLISHED' }) as any);

    // Send to the candidate
    const sent = await ws(
      request(app).post(`/api/v1/applications/${applicationId}/assessments`).send({ assessmentId, expiresInHours: 168 }) as any,
    );
    expect(sent.status).toBe(201);
    const ca = await CandidateAssessmentModel.findOne({ assessmentId, applicationId });
    const secureToken = ca!.secureToken as string;
    const candidateAssessmentId = String(ca!._id);

    // Candidate view: coding type, hidden case NOT exposed
    const view = await request(app).get(`/api/v1/public/assessments/${secureToken}`);
    expect(view.body.data.type).toBe('CODING');
    const pubQ = view.body.data.questions[0];
    expect(pubQ.coding.sampleTestCases).toHaveLength(1); // only the visible case
    expect(pubQ.coding.languageIds).toEqual([71]);

    // Start, then run (visible cases only)
    await request(app).post(`/api/v1/public/assessments/${secureToken}/start`);
    const run = await request(app)
      .post(`/api/v1/public/assessments/${secureToken}/run`)
      .send({ questionId, code: 'print("ok")', languageId: 71 });
    expect(run.status).toBe(200);
    expect(run.body.data.passed).toBe(1);
    expect(run.body.data.total).toBe(1);

    // Submit -> async grading
    const submit = await request(app)
      .post(`/api/v1/public/assessments/${secureToken}/submit`)
      .send({ answers: [{ questionId, code: 'print("ok")', languageId: 71 }] });
    expect(submit.body.data.status).toBe('GRADING');

    // Drive the grader (two passes: submit to Judge0, then poll results).
    await codingGradingService.grade({ candidateAssessmentId });
    await codingGradingService.grade({ candidateAssessmentId });

    // Candidate now sees it completed; recruiter sees the score + per-case results
    const done = await request(app).get(`/api/v1/public/assessments/${secureToken}`);
    expect(done.body.data.status).toBe('COMPLETED');
    expect(done.body.data.score).toBe(100);

    const recruiterView = await ws(request(app).get(`/api/v1/applications/${applicationId}/assessments`) as any);
    const graded = recruiterView.body.data[0];
    expect(graded.status).toBe('COMPLETED');
    expect(graded.type).toBe('CODING');
    expect(graded.score).toBe(100);
    expect(graded.codingResults[0]).toMatchObject({ passed: 2, total: 2 });
  });
});
