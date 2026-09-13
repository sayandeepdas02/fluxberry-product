import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { WorkspaceModel } from '../../src/models/workspace.model';
import { ApplicationModel } from '../../src/models/application.model';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_advanced_analytics');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('advanced analytics tier (integration)', () => {
  it('gates advanced endpoints behind the ADVANCED_ANALYTICS plan feature, then serves real numbers on PRO', async () => {
    const ownerToken = await tokenFor('advowner@test.com', 'Adv Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Adv Owner', company: 'Advco' });
    const workspaceId = onboard.body.data.id as string;
    const workspaceSlug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${ownerToken}`).set('X-Workspace-Id', workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Advanced Analytics Role' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    // Disjoint ranges: the applicant below lands only in range A, so this
    // actually exercises date filtering rather than passing on an
    // implementation that ignores the query params entirely.
    const qs = `aStart=${today}&aEnd=${today}&bStart=${tomorrow}&bEnd=${tomorrow}`;

    // FREE plan: blocked with the distinct upgrade-required code, not a generic 403.
    const blockedCohort = await ws(request(app).get(`/api/v1/analytics/advanced/cohort?${qs}`) as any);
    expect(blockedCohort.status).toBe(403);
    expect(blockedCohort.body.error.code).toBe('PLAN_UPGRADE_REQUIRED');
    expect(blockedCohort.body.error.details.flag).toBe('ADVANCED_ANALYTICS');

    const blockedLeaderboard = await ws(request(app).get('/api/v1/analytics/advanced/leaderboard') as any);
    expect(blockedLeaderboard.status).toBe(403);
    expect(blockedLeaderboard.body.error.code).toBe('PLAN_UPGRADE_REQUIRED');

    const blockedBenchmark = await ws(request(app).get(`/api/v1/jobs/${jobId}/analytics/benchmark`) as any);
    expect(blockedBenchmark.status).toBe(403);
    expect(blockedBenchmark.body.error.code).toBe('PLAN_UPGRADE_REQUIRED');

    // Upgrade the workspace directly (billing flow is covered elsewhere).
    await WorkspaceModel.findByIdAndUpdate(workspaceId, { plan: 'PRO' });

    // One applicant, submitted today — falls inside range A only.
    await request(app)
      .post(`/api/v1/public/jobs/${workspaceSlug}/${jobSlug}/apply`)
      .field('name', 'Advanced Candidate')
      .field('email', 'advcand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });

    const cohort = await ws(request(app).get(`/api/v1/analytics/advanced/cohort?${qs}`) as any);
    expect(cohort.status).toBe(200);
    expect(cohort.body.data.rangeA.metrics.totalApplicants).toBe(1);
    expect(cohort.body.data.rangeB.metrics.totalApplicants).toBe(0);
    expect(cohort.body.data.deltas.totalApplicants).toBe(-1);

    const leaderboard = await ws(request(app).get('/api/v1/analytics/advanced/leaderboard') as any);
    expect(leaderboard.status).toBe(200);
    expect(leaderboard.body.data.isApproximate).toBe(true);
    expect(leaderboard.body.data.rows).toHaveLength(1);
    expect(leaderboard.body.data.rows[0].jobsCreated).toBe(1);
    expect(leaderboard.body.data.rows[0].totalApplicants).toBe(1);

    const benchmark = await ws(request(app).get(`/api/v1/jobs/${jobId}/analytics/benchmark`) as any);
    expect(benchmark.status).toBe(200);
    const rateFor = (points: any[], stage: string) => points.find((p) => p.stage === stage);
    expect(rateFor(benchmark.body.data.points, 'APPLIED').jobRate).toBe(100);
    expect(rateFor(benchmark.body.data.points, 'APPLIED').workspaceRate).toBe(100);

    // Cumulative reach: moving the applicant to OFFER means it should count
    // toward every earlier stage's rate too, not just its exact current stage.
    const application = await ApplicationModel.findOne({ workspaceId, jobId }).lean();
    await ws(request(app).post(`/api/v1/applications/${application!._id}/stage`).send({ stage: 'OFFER' }) as any);
    const benchmarkAfterMove = await ws(request(app).get(`/api/v1/jobs/${jobId}/analytics/benchmark`) as any);
    for (const stage of ['APPLIED', 'SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER']) {
      expect(rateFor(benchmarkAfterMove.body.data.points, stage).jobRate).toBe(100);
    }
    expect(rateFor(benchmarkAfterMove.body.data.points, 'HIRED').jobRate).toBe(0);
  });
});
