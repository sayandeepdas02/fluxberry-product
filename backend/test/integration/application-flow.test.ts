import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, mongoose } from '../../src/config/db';
import { activateSubscription } from './helpers/activate-subscription';

const app = createApp();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');

async function tokenFor(email: string, name?: string) {
  const res = await request(app).post('/api/v1/auth/test-token').send({ email, name });
  return res.body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase();
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('core application flow (integration)', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('runs recruiter → candidate → recruiter end to end', async () => {
    const token = await tokenFor('recruiter@test.com', 'Rec Ruiter');

    // Onboarding creates the first workspace
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rec Ruiter', company: 'Testies' });
    expect(onboard.status).toBe(201);
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    // Create + publish a job
    const created = await ws(request(app).post('/api/v1/jobs').send({ title: 'Backend Engineer', skills: [{ name: 'Node.js', required: true }] }) as any);
    expect(created.status).toBe(201);
    const jobId = created.body.data.id as string;
    const jobSlug = created.body.data.slug as string;

    const published = await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);
    expect(published.body.data.status).toBe('PUBLISHED');

    // Public job is visible
    const publicJob = await request(app).get(`/api/v1/public/jobs/${slug}/${jobSlug}`);
    expect(publicJob.status).toBe(200);
    expect(publicJob.body.data.job.title).toBe('Backend Engineer');

    // Candidate applies (no auth) with a resume
    const applied = await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('privacyConsent', 'true')
      .field('name', 'Test Candidate')
      .field('email', 'cand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(applied.status).toBe(201);

    // Duplicate application is rejected
    const dup = await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('privacyConsent', 'true')
      .field('name', 'Test Candidate')
      .field('email', 'cand@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(dup.status).toBe(409);

    // An application without the privacy notice agreement is refused
    const noConsent = await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('name', 'No Consent')
      .field('email', 'noconsent@test.com')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(noConsent.status).toBe(422);

    // Recruiter sees the candidate
    const list = await ws(request(app).get('/api/v1/candidates') as any);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0].name).toBe('Test Candidate');
  });

  it('captures linkedinUrl from a public application', async () => {
    const token = await tokenFor('recruiter-li@test.com', 'Rec Ruiter');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rec Ruiter', company: 'LinkedTest' });
    const workspaceId = onboard.body.data.id as string;
    const slug = onboard.body.data.slug as string;
    const ws = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('X-Workspace-Id', workspaceId);
    await activateSubscription(workspaceId);

    const created = await ws(request(app).post('/api/v1/jobs').send({ title: 'Frontend Engineer', skills: [{ name: 'React', required: true }] }) as any);
    const jobId = created.body.data.id as string;
    const jobSlug = created.body.data.slug as string;
    await ws(request(app).post(`/api/v1/jobs/${jobId}/publish`) as any);

    const applied = await request(app)
      .post(`/api/v1/public/jobs/${slug}/${jobSlug}/apply`)
      .field('privacyConsent', 'true')
      .field('name', 'LinkedIn Candidate')
      .field('email', 'li-cand@test.com')
      .field('linkedinUrl', 'https://linkedin.com/in/li-cand')
      .field('answers', '[]')
      .attach('resume', PDF, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(applied.status).toBe(201);

    const list = await ws(request(app).get('/api/v1/candidates') as any);
    const item = list.body.data.items.find((c: any) => c.email === 'li-cand@test.com');
    const profile = await ws(request(app).get(`/api/v1/candidates/${item.candidateId}`) as any);
    expect(profile.body.data.candidate.linkedinUrl).toBe('https://linkedin.com/in/li-cand');
  });

  it('enforces RBAC — a viewer cannot create jobs', async () => {
    const ownerToken = await tokenFor('owner2@test.com', 'Owner Two');
    const onboard = await request(app)
      .post('/api/v1/workspaces/onboarding')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Two', company: 'Second Co' });
    const workspaceId = onboard.body.data.id as string;

    // Invite a viewer
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ email: 'viewer@test.com', role: 'viewer' });

    const viewerToken = await tokenFor('viewer@test.com');
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-Workspace-Id', workspaceId)
      .send({ title: 'Nope' });
    expect(res.status).toBe(403);
  });
});
