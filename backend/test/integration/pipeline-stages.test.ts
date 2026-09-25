import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { ApplicationModel } from '../../src/models/application.model';
import { activateSubscription } from './helpers/activate-subscription';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_stages');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('custom pipeline stages (integration)', () => {
  it('defaults to the 5 system stages, then supports add/rename/reorder/delete', async () => {
    const token = await tokenFor('stagesrec@test.com', 'Stages Rec');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Stages Rec', company: 'Stageco' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Designer' }) as any);
    const jobId = job.body.data.id as string;
    expect(job.body.data.stages).toHaveLength(5);
    expect(job.body.data.stages[0]).toMatchObject({ id: 'APPLIED', system: true });

    // Fetch via the dedicated endpoint — same 5 system defaults.
    const got = await ws(request(app).get(`/api/v1/jobs/${jobId}/stages`) as any);
    expect(got.status).toBe(200);
    expect(got.body.data).toHaveLength(5);

    // Insert a custom stage (Technical Round) after Screening, and rename APPLIED.
    const current = got.body.data as any[];
    const withCustom = [
      { ...current[0], label: 'New Applicant' },
      current[1],
      { id: 'TECH_ROUND', label: 'Technical Round', color: '#8855ff', sortOrder: 0, system: false, terminal: false },
      ...current.slice(2),
    ];
    const updated = await ws(request(app).put(`/api/v1/jobs/${jobId}/stages`).send({ stages: withCustom }) as any);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toHaveLength(6);
    expect(updated.body.data.find((s: any) => s.id === 'APPLIED').label).toBe('New Applicant');
    const custom = updated.body.data.find((s: any) => s.id === 'TECH_ROUND');
    expect(custom).toMatchObject({ label: 'Technical Round', system: false, terminal: false });

    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    // A candidate applies, gets moved to the new custom stage.
    await request(app)
      .post(`/api/v1/public/jobs/${onboard.body.data.slug}/${job.body.data.slug}/apply`)
      .field('name', 'Stage Candidate')
      .field('email', 'stagecand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const applicationId = String(application!._id);

    const moved = await ws(
      request(app).post(`/api/v1/applications/${applicationId}/stage`).send({ stage: 'TECH_ROUND' }) as any,
    );
    expect(moved.status).toBe(200);
    expect(moved.body.data.stage).toBe('TECH_ROUND');

    // An unknown stage id is rejected.
    const badMove = await ws(
      request(app).post(`/api/v1/applications/${applicationId}/stage`).send({ stage: 'NOT_A_REAL_STAGE' }) as any,
    );
    expect(badMove.status).toBe(400);

    // Can't delete a stage with an active candidate on it.
    const withoutTechRound = updated.body.data.filter((s: any) => s.id !== 'TECH_ROUND');
    const blockedDelete = await ws(
      request(app).put(`/api/v1/jobs/${jobId}/stages`).send({ stages: withoutTechRound }) as any,
    );
    expect(blockedDelete.status).toBe(409);

    // Move the candidate off it, then the delete succeeds.
    await ws(request(app).post(`/api/v1/applications/${applicationId}/stage`).send({ stage: 'OFFER' }) as any);
    const okDelete = await ws(request(app).put(`/api/v1/jobs/${jobId}/stages`).send({ stages: withoutTechRound }) as any);
    expect(okDelete.status).toBe(200);
    expect(okDelete.body.data.find((s: any) => s.id === 'TECH_ROUND')).toBeUndefined();

    // Built-in stages can never be deleted.
    const withoutApplied = okDelete.body.data.filter((s: any) => s.id !== 'APPLIED');
    const blockedSystemDelete = await ws(
      request(app).put(`/api/v1/jobs/${jobId}/stages`).send({ stages: withoutApplied }) as any,
    );
    expect(blockedSystemDelete.status).toBe(400);
  });
});
