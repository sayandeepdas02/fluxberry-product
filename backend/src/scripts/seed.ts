import { connectDatabase, disconnectDatabase, mongoose } from '../config/db';
import { DEFAULT_FORM_FIELDS } from '../shared';
import { UserModel } from '../models/user.model';
import { WorkspaceModel } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';
import { JobModel } from '../models/job.model';
import { ApplicationFormModel } from '../models/application-form.model';
import { CandidateModel } from '../models/candidate.model';
import { ApplicationModel } from '../models/application.model';
import { EventModel } from '../models/event.model';
import { computeScreeningScore } from '../services/scoring.engine';
import { shortId } from '../utils/ids';
import { slugify } from '../utils/slug';
import { logger } from '../utils/logger';

async function wipe() {
  const collections = [
    'users', 'workspaces', 'workspace_members', 'jobs', 'application_forms',
    'candidates', 'applications', 'application_answers',
    'screening_results', 'events', 'audit_logs', 'jobs_queue', 'notifications',
  ];
  for (const name of collections) {
    await mongoose.connection.collection(name).deleteMany({}).catch(() => {});
  }
}

function defaultForm() {
  return DEFAULT_FORM_FIELDS.map((f, i) => ({
    id: shortId(), key: f.key, type: f.type, label: f.label, description: null,
    required: f.required, enabled: true, options: [], sortOrder: i, system: true,
  }));
}

function reasoning(breakdown: Record<string, number>) {
  const strong = Object.entries(breakdown).filter(([, v]) => v >= 6.5).map(([k]) => `Good ${k}`);
  const weak = Object.entries(breakdown).filter(([, v]) => v < 5).map(([k]) => `Limited ${k}`);
  return {
    summary: `${strong.length} strong area${strong.length === 1 ? '' : 's'}${weak.length ? `, ${weak.length} gap${weak.length === 1 ? '' : 's'}` : ''}.`,
    strengths: strong.slice(0, 4),
    concerns: weak.slice(0, 3),
  };
}

async function main() {
  await connectDatabase();
  logger.info('Seeding database (dev)…');
  await wipe();

  // Demo user + workspace
  const user = await UserModel.create({ email: 'demo@fluxberry.dev', name: 'Demo Recruiter' });
  const ws = await WorkspaceModel.create({ name: 'Acme', slug: 'acme', plan: 'FREE', createdBy: user._id });
  await WorkspaceMemberModel.create({ workspaceId: ws._id, userId: user._id, role: 'owner' });
  const workspaceId = ws._id;

  // Jobs
  const jobDefs = [
    {
      title: 'Senior Backend Engineer', location: 'Bangalore', workMode: 'HYBRID',
      salary: { min: 1800000, max: 3000000, currency: 'INR' }, experience: { min: 3, max: 6 },
      required: ['Node.js', 'PostgreSQL', 'AWS'], preferred: ['Kafka', 'Docker'],
      description: '## About the role\n\nWe are hiring a Senior Backend Engineer to own our core services end to end.\n\n## What you\'ll do\n- Design and build scalable APIs\n- Own services from idea to production\n\n## What we\'re looking for\n- 3+ years with Node.js and PostgreSQL\n- Experience deploying on AWS',
    },
    {
      title: 'Product Designer', location: 'Remote', workMode: 'REMOTE',
      salary: { min: 1500000, max: 2500000, currency: 'INR' }, experience: { min: 2, max: 5 },
      required: ['Figma', 'Product design', 'UX'], preferred: ['UI'],
      description: '## About the role\n\nShape the product experience as our Product Designer.\n\n## What we\'re looking for\n- Strong portfolio\n- Systems thinking',
    },
    {
      title: 'Founding Engineer', location: 'Bangalore', workMode: 'ONSITE',
      salary: { min: 2500000, max: 4000000, currency: 'INR' }, experience: { min: 4, max: 8 },
      required: ['React', 'Node.js', 'TypeScript'], preferred: ['AWS', 'PostgreSQL'],
      description: '## About the role\n\nJoin as a Founding Engineer and build across the stack.\n\n## What we\'re looking for\n- Full-stack experience\n- Ownership mindset',
    },
  ];

  const jobs = [];
  for (const d of jobDefs) {
    const job = await JobModel.create({
      workspaceId, title: d.title, slug: slugify(d.title), description: d.description, status: 'PUBLISHED',
      employmentType: 'FULL_TIME', workMode: d.workMode, location: d.location, openings: 1,
      salary: d.salary, experience: d.experience,
      skills: [...d.required.map((n) => ({ name: n, required: true, weight: 1 })), ...d.preferred.map((n) => ({ name: n, required: false, weight: 1 }))],
      structuredRequirements: { requiredSkills: d.required, preferredSkills: d.preferred, responsibilities: [], education: [], experience: d.experience },
      createdBy: user._id, publishedAt: new Date(),
    });
    const form = await ApplicationFormModel.create({ workspaceId, jobId: job._id, questions: defaultForm() });
    await JobModel.updateOne({ _id: job._id }, { applicationFormId: form._id });
    jobs.push(job);
  }

  // Candidates + applications (varied fit → varied scores)
  const candDefs = [
    { name: 'Rahul Sharma', loc: 'Bangalore', exp: 4, salary: 2500000, skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'], job: 0, stage: 'SHORTLISTED' },
    { name: 'Priya Nair', loc: 'Bangalore', exp: 5, salary: 2800000, skills: ['Node.js', 'PostgreSQL', 'Kafka', 'AWS'], job: 0, stage: 'SHORTLISTED' },
    { name: 'Arjun Mehta', loc: 'Remote', exp: 2, salary: 1600000, skills: ['JavaScript', 'React'], job: 0, stage: 'SCREENING' },
    { name: 'Sara Khan', loc: 'Mumbai', exp: 3, salary: 2200000, skills: ['Node.js', 'MongoDB'], job: 0, stage: 'APPLIED' },
    { name: 'Vikram Rao', loc: 'Bangalore', exp: 6, salary: 3200000, skills: ['Node.js', 'PostgreSQL', 'AWS', 'Kafka', 'Docker'], job: 0, stage: 'OFFER' },
    { name: 'Meera Iyer', loc: 'Remote', exp: 4, salary: 2100000, skills: ['Figma', 'Product design', 'UX', 'UI'], job: 1, stage: 'SHORTLISTED' },
    { name: 'Dev Patel', loc: 'Remote', exp: 3, salary: 1900000, skills: ['Figma', 'UX'], job: 1, stage: 'SCREENING' },
    { name: 'Ananya Gupta', loc: 'Delhi', exp: 2, salary: 1700000, skills: ['Sketch'], job: 1, stage: 'APPLIED' },
    { name: 'Karan Singh', loc: 'Bangalore', exp: 5, salary: 3000000, skills: ['React', 'Node.js', 'TypeScript', 'AWS'], job: 2, stage: 'SHORTLISTED' },
    { name: 'Neha Verma', loc: 'Bangalore', exp: 7, salary: 3800000, skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'], job: 2, stage: 'HIRED' },
    { name: 'Rohan Das', loc: 'Pune', exp: 3, salary: 2400000, skills: ['React', 'JavaScript'], job: 2, stage: 'REJECTED' },
    { name: 'Ishita Roy', loc: 'Bangalore', exp: 4, salary: 2600000, skills: ['React', 'Node.js', 'TypeScript'], job: 2, stage: 'APPLIED' },
  ];

  let count = 0;
  for (const c of candDefs) {
    const job = jobs[c.job];
    const candidate = await CandidateModel.create({
      workspaceId, name: c.name, email: `${c.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: '+91 90000 00000', location: c.loc, expectedSalary: c.salary, resumeStatus: 'COMPLETED',
      parsedProfile: { summary: `${c.name} — experienced professional.`, yearsExperience: c.exp, skills: c.skills, education: [{ degree: 'B.Tech' }], workExperience: [], projects: [] },
    });

    const { breakdown, total } = computeScreeningScore({
      job: {
        requiredSkills: (job.structuredRequirements?.requiredSkills as string[]) ?? [],
        preferredSkills: (job.structuredRequirements?.preferredSkills as string[]) ?? [],
        experienceMin: job.experience?.min ?? null, experienceMax: job.experience?.max ?? null,
        location: job.location, workMode: job.workMode, salaryMin: job.salary?.min ?? null, salaryMax: job.salary?.max ?? null, education: [],
      },
      candidate: { skills: c.skills, yearsExperience: c.exp, location: c.loc, expectedSalary: c.salary, hasEducation: true },
      aiRelevance: Math.min(10, c.skills.length * 2),
    });
    const r = reasoning(breakdown);

    const status = c.stage === 'HIRED' ? 'HIRED' : c.stage === 'REJECTED' ? 'REJECTED' : 'ACTIVE';
    const app = await ApplicationModel.create({
      workspaceId, jobId: job._id, candidateId: candidate._id, status, stage: c.stage, source: 'DIRECT',
      score: total,
      screeningResult: { status: 'COMPLETED', score: total, breakdown, summary: r.summary, strengths: r.strengths, concerns: r.concerns, provider: 'seed', model: 'seed', promptVersion: 'seed-v1', version: 1, createdAt: new Date() },
      appliedAt: new Date(Date.now() - Math.floor(Math.random() * 20 + 1) * 86400000),
    });

    await EventModel.create({ workspaceId, type: 'application.created', entityType: 'application', entityId: app._id, applicationId: app._id, candidateId: candidate._id, actorLabel: 'candidate' });
    await EventModel.create({ workspaceId, type: 'screening.completed', entityType: 'application', entityId: app._id, applicationId: app._id, candidateId: candidate._id, payload: { score: total } });
    count++;
  }

  logger.info({ workspace: 'Acme', jobs: jobs.length, candidates: count }, 'Seed complete');
  logger.info('Log in locally with email: demo@fluxberry.dev (dev test-token path, no password needed)');
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
