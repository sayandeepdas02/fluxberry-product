import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { activateSubscription } from './helpers/activate-subscription';

const app = createApp();

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase('mongodb://127.0.0.1:27017/fluxberry_test_linkedin_share');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('LinkedIn manual share tracking (integration)', () => {
  it('tracks posted status and auto-flips to closed when the job closes', async () => {
    const token = await tokenFor('liowner@test.com', 'LI Owner');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LI Owner', company: 'LIco' });
    const workspaceId = onboard.body.data.id as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    const job = await ws(request(app).post('/api/v1/jobs').send({ title: 'LinkedIn Role' }) as any);
    const jobId = job.body.data.id as string;
    expect(job.body.data.linkedIn).toEqual({ status: 'NOT_POSTED', postedAt: null });

    const marked = await ws(request(app).post(`/api/v1/jobs/${jobId}/linkedin-posted`).send({ posted: true }) as any);
    expect(marked.status).toBe(200);
    expect(marked.body.data.linkedIn.status).toBe('POSTED');
    expect(marked.body.data.linkedIn.postedAt).not.toBeNull();

    // Closing the job flips status to CLOSED without touching postedAt directly (it's derived).
    await ws(request(app).post(`/api/v1/jobs/${jobId}/status`).send({ status: 'CLOSED' }) as any);
    const afterClose = await ws(request(app).get(`/api/v1/jobs/${jobId}`) as any);
    expect(afterClose.body.data.linkedIn.status).toBe('CLOSED');

    // Undo works too.
    const unmarked = await ws(request(app).post(`/api/v1/jobs/${jobId}/linkedin-posted`).send({ posted: false }) as any);
    expect(unmarked.body.data.linkedIn).toEqual({ status: 'NOT_POSTED', postedAt: null });
  });
});
