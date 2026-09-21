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
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_labels');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('candidate labels (integration)', () => {
  it('creates, applies, filters by, and cascades deletion of a label', async () => {
    const token = await tokenFor('labelsrec@test.com', 'Labels Rec');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Labels Rec', company: 'Labelco' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    // No labels yet.
    const empty = await ws(request(app).get(`/api/v1/workspaces/${workspaceId}/labels`) as any);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toHaveLength(0);

    // Create two labels.
    const strong = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/labels`).send({ name: 'Strong hire', color: '#16a34a' }) as any);
    expect(strong.status).toBe(201);
    const maybe = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/labels`).send({ name: 'Maybe', color: '#64748b' }) as any);
    expect(maybe.status).toBe(201);

    // Duplicate name (case-insensitive) is rejected.
    const dup = await ws(request(app).post(`/api/v1/workspaces/${workspaceId}/labels`).send({ name: 'strong hire', color: '#000' }) as any);
    expect(dup.status).toBe(409);

    // Rename one.
    const renamed = await ws(request(app).patch(`/api/v1/workspaces/${workspaceId}/labels/${maybe.body.data.id}`).send({ name: 'Maybe later' }) as any);
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe('Maybe later');

    // Job + candidate.
    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'Analyst' }) as any);
    const jobId = job.body.data.id as string;
    const jobSlug = job.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);
    await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('name', 'Label Candidate')
      .field('email', 'labelcand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    const application = await ApplicationModel.findOne({ workspaceId }).lean();
    const applicationId = String(application!._id);

    // Apply both labels to the candidate.
    const applied = await ws(
      request(app)
        .put(`/api/v1/applications/${applicationId}/labels`)
        .send({ labelIds: [strong.body.data.id, maybe.body.data.id] }) as any,
    );
    expect(applied.status).toBe(200);
    expect(applied.body.data.map((l: any) => l.name).sort()).toEqual(['Maybe later', 'Strong hire']);

    // Candidate list shows the resolved labels.
    const list = await ws(request(app).get('/api/v1/candidates') as any);
    expect(list.body.data.items[0].labels.map((l: any) => l.id).sort()).toEqual(
      [strong.body.data.id, maybe.body.data.id].sort(),
    );

    // Filter by label.
    const filtered = await ws(request(app).get(`/api/v1/candidates?labelId=${strong.body.data.id}`) as any);
    expect(filtered.body.data.total).toBe(1);

    // Unknown label id is rejected.
    const badApply = await ws(
      request(app).put(`/api/v1/applications/${applicationId}/labels`).send({ labelIds: ['000000000000000000000000'] }) as any,
    );
    expect(badApply.status).toBe(400);

    // Deleting a label cascades off the application.
    const del = await ws(request(app).delete(`/api/v1/workspaces/${workspaceId}/labels/${strong.body.data.id}`) as any);
    expect(del.status).toBe(204);
    const afterDelete = await ws(request(app).get(`/api/v1/candidates/${application!.candidateId}`) as any);
    const stillHas = afterDelete.body.data.applications[0].labels;
    expect(stillHas.map((l: any) => l.name)).toEqual(['Maybe later']);
  });
});
