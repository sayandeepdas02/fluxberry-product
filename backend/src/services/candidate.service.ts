import { Types } from 'mongoose';
import type {
  PublicApplicationInput,
  CandidateListQuery,
  CandidateListItemDto,
  CandidateProfileDto,
  Paginated,
  TimelineEntryDto,
  JobFunnelCounts,
  ApplicationAnswersDto,
} from '@fluxberry/shared';
import { candidateRepository } from '../repositories/candidate.repository';
import { applicationRepository, answersRepository } from '../repositories/application.repository';
import { CandidateModel } from '../models/candidate.model';
import { ApplicationModel } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { EventModel } from '../models/event.model';
import { toCandidateDto } from '../serializers/candidate.serializer';
import { toApplicationDto } from '../serializers/application.serializer';
import { getStorageProvider } from '../integrations';
import { notFound } from '../utils/errors';

type CandidateCore = Pick<
  PublicApplicationInput,
  'name' | 'email' | 'phone' | 'location' | 'currentSalary' | 'expectedSalary' | 'linkedinUrl'
>;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const candidateService = {
  async findOrCreate(workspaceId: string, data: CandidateCore) {
    const existing = await candidateRepository.findByEmail(workspaceId, data.email);
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (!existing.phone && data.phone) patch.phone = data.phone;
      if (!existing.location && data.location) patch.location = data.location;
      if (existing.currentSalary == null && data.currentSalary != null) patch.currentSalary = data.currentSalary;
      if (existing.expectedSalary == null && data.expectedSalary != null) patch.expectedSalary = data.expectedSalary;
      if (!existing.linkedinUrl && data.linkedinUrl) patch.linkedinUrl = data.linkedinUrl;
      if (Object.keys(patch).length) return (await candidateRepository.update(String(existing._id), patch))!;
      return existing;
    }
    return candidateRepository.create({
      workspaceId,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone ?? null,
      location: data.location ?? null,
      currentSalary: data.currentSalary ?? null,
      expectedSalary: data.expectedSalary ?? null,
      linkedinUrl: data.linkedinUrl || null,
      resumeStatus: 'PENDING',
    });
  },

  /** One aggregation for the candidates table (avoids N+1, spec §157). */
  async list(
    workspaceId: string,
    query: CandidateListQuery,
  ): Promise<Paginated<CandidateListItemDto>> {
    const limit = query.limit;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
    if (query.jobId) match.jobId = new Types.ObjectId(query.jobId);
    if (query.stage) match.stage = query.stage;
    if (query.source) match.source = query.source;
    if (query.minScore != null) match.score = { $gte: query.minScore };

    const postMatch: Record<string, unknown> = {};
    if (query.location) postMatch['candidate.location'] = { $regex: escapeRegex(query.location), $options: 'i' };
    if (query.maxExpectedSalary != null) postMatch['candidate.expectedSalary'] = { $lte: query.maxExpectedSalary };
    if (query.minExperience != null) postMatch['candidate.parsedProfile.yearsExperience'] = { $gte: query.minExperience };
    if (query.search) {
      const rx = { $regex: escapeRegex(query.search), $options: 'i' };
      postMatch.$or = [{ 'candidate.name': rx }, { 'candidate.email': rx }, { 'job.title': rx }];
    }

    const sortField =
      query.sort === 'score' ? 'score'
      : query.sort === 'name' ? 'candidate.name'
      : query.sort === 'expectedSalary' ? 'candidate.expectedSalary'
      : 'appliedAt';
    const sortDir = query.order === 'asc' ? 1 : -1;

    const pipeline: any[] = [
      { $match: match },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'candidate' } },
      { $unwind: '$candidate' },
      { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      ...(Object.keys(postMatch).length ? [{ $match: postMatch }] : []),
      { $sort: { [sortField]: sortDir, _id: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [res] = await ApplicationModel.aggregate(pipeline);
    const items: CandidateListItemDto[] = (res?.items ?? []).map((a: any) => ({
      applicationId: String(a._id),
      candidateId: String(a.candidate._id),
      name: a.candidate.name,
      email: a.candidate.email,
      jobId: String(a.job._id),
      jobTitle: a.job.title,
      score: a.score ?? a.screeningResult?.score ?? null,
      stage: a.stage,
      location: a.candidate.location ?? null,
      expectedSalary: a.candidate.expectedSalary ?? null,
      appliedAt: new Date(a.appliedAt).toISOString(),
      screeningStatus: a.screeningResult?.status ?? 'PENDING',
    }));

    return { items, total: res?.total?.[0]?.count ?? 0, page, limit };
  },

  async getProfile(workspaceId: string, candidateId: string): Promise<CandidateProfileDto> {
    const candidate = await candidateRepository.findInWorkspace(workspaceId, candidateId);
    if (!candidate) throw notFound('Candidate not found');

    const apps = await ApplicationModel.find({ workspaceId, candidateId })
      .sort({ appliedAt: -1 })
      .lean();
    const jobIds = apps.map((a) => a.jobId);
    const jobs = await JobModel.find({ _id: { $in: jobIds } }).select('title').lean();
    const titleById = new Map(jobs.map((j) => [String(j._id), j.title]));

    return {
      candidate: toCandidateDto(candidate.toObject()),
      applications: apps.map((a) => ({
        ...toApplicationDto(a),
        jobTitle: titleById.get(String(a.jobId)) ?? 'Job',
      })),
    };
  },

  async getApplicationDetail(workspaceId: string, applicationId: string) {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    const candidate = await candidateRepository.findById(String(app.candidateId));
    const job = await JobModel.findById(app.jobId).select('title slug').lean();
    const answersDoc = await answersRepository.findByApplication(applicationId);
    const answers: ApplicationAnswersDto = {
      applicationId,
      answers: (answersDoc?.answers ?? []).map((a: any) => ({ questionId: a.questionId, value: a.value })),
    };
    return {
      application: { ...toApplicationDto(app.toObject()), jobTitle: job?.title ?? 'Job' },
      candidate: candidate ? toCandidateDto(candidate.toObject()) : null,
      answers,
    };
  },

  async getResumeUrl(workspaceId: string, candidateId: string): Promise<string> {
    const candidate = await candidateRepository.findInWorkspace(workspaceId, candidateId);
    if (!candidate || !candidate.resume) throw notFound('No resume on file');
    const storage = getStorageProvider();
    return storage.createDownloadUrl(
      {
        storageKey: candidate.resume.storageKey,
        fileName: candidate.resume.fileName,
        mimeType: candidate.resume.mimeType,
      },
      300,
    );
  },

  async getTimeline(workspaceId: string, applicationId: string): Promise<TimelineEntryDto[]> {
    const events = await EventModel.find({ workspaceId, applicationId })
      .sort({ createdAt: 1 })
      .lean();
    return events.map((e) => ({
      id: String(e._id),
      type: e.type,
      actor: e.actorLabel ?? null,
      createdAt: new Date(e.createdAt).toISOString(),
      metadata: (e.payload as Record<string, unknown>) ?? {},
    }));
  },

  /** Funnel counts per job (for job overview + jobs list enrichment). */
  async funnelCountsByJob(workspaceId: string): Promise<Record<string, JobFunnelCounts>> {
    const rows = await ApplicationModel.aggregate([
      { $match: { workspaceId: new Types.ObjectId(workspaceId) } },
      { $group: { _id: { jobId: '$jobId', stage: '$stage' }, count: { $sum: 1 } } },
    ]);
    const map: Record<string, JobFunnelCounts> = {};
    for (const r of rows) {
      const jobId = String(r._id.jobId);
      map[jobId] ??= emptyCounts();
      const c = map[jobId];
      c.applicants += r.count;
      applyStageCount(c, r._id.stage, r.count);
    }
    return map;
  },

  async funnelCountsForJob(workspaceId: string, jobId: string): Promise<JobFunnelCounts> {
    const rows = await ApplicationModel.aggregate([
      { $match: { workspaceId: new Types.ObjectId(workspaceId), jobId: new Types.ObjectId(jobId) } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const c = emptyCounts();
    for (const r of rows) {
      c.applicants += r.count;
      applyStageCount(c, r._id, r.count);
    }
    return c;
  },
};

function emptyCounts(): JobFunnelCounts {
  return { applicants: 0, screening: 0, shortlisted: 0, assessment: 0, interview: 0, offer: 0, hired: 0, rejected: 0 };
}

function applyStageCount(c: JobFunnelCounts, stage: string, n: number) {
  switch (stage) {
    case 'SCREENING': c.screening += n; c.shortlisted += n; break;
    case 'ASSESSMENT': c.assessment += n; break;
    case 'INTERVIEW': c.interview += n; break;
    case 'OFFER': c.offer += n; break;
    case 'HIRED': c.hired += n; break;
    case 'REJECTED': c.rejected += n; break;
    default: break;
  }
}
