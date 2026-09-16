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
import { getStorageProvider, type DownloadUrlOptions } from '../integrations';
import { notFound } from '../utils/errors';
import { applyJobAccessFilter, bypassesJobAccess } from '../utils/job-access';
import type { AuthContext } from '../types/auth-context';

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
    auth: AuthContext,
  ): Promise<Paginated<CandidateListItemDto>> {
    const limit = query.limit;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    let match: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
    if (query.jobId) match.jobId = new Types.ObjectId(query.jobId);
    if (query.stage) match.stage = query.stage;
    if (query.source) match.source = query.source;
    if (query.minScore != null) match.score = { $gte: query.minScore };
    if (query.labelId) match.labelIds = new Types.ObjectId(query.labelId);
    match = applyJobAccessFilter(match, auth, 'jobRestrictedTo');

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
      { $lookup: { from: 'labels', localField: 'labelIds', foreignField: '_id', as: 'labels' } },
      ...(query.assessmentStatus ? [
        { $lookup: { from: 'candidate_assessments', localField: '_id', foreignField: 'applicationId', as: '_ca' } },
        { $match: { '_ca.status': query.assessmentStatus } },
      ] : []),
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
      labels: (a.labels ?? [])
        .map((l: any) => ({
          id: String(l._id),
          workspaceId: String(l.workspaceId),
          name: l.name,
          color: l.color,
          createdAt: new Date(l.createdAt).toISOString(),
        }))
        .sort((x: { name: string }, y: { name: string }) => x.name.localeCompare(y.name)),
    }));

    return { items, total: res?.total?.[0]?.count ?? 0, page, limit };
  },

  async getProfile(workspaceId: string, candidateId: string, auth: AuthContext): Promise<CandidateProfileDto> {
    const candidate = await candidateRepository.findInWorkspace(workspaceId, candidateId);
    if (!candidate) throw notFound('Candidate not found');

    const apps = await ApplicationModel.find(applyJobAccessFilter({ workspaceId, candidateId }, auth, 'jobRestrictedTo'))
      .sort({ appliedAt: -1 })
      .populate('labelIds')
      .lean();
    // A candidate whose only applications are to jobs this viewer can't see
    // must appear not-found, not merely empty — same "invisible" rule as jobs.
    if (apps.length === 0 && !bypassesJobAccess(auth.role)) {
      const totalApps = await ApplicationModel.countDocuments({ workspaceId, candidateId });
      if (totalApps > 0) throw notFound('Candidate not found');
    }
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

  /** A signed download URL for a custom FILE_UPLOAD/VIDEO_RECORDING question's answer file. */
  async getAnswerFileUrl(
    workspaceId: string,
    applicationId: string,
    questionId: string,
    opts?: DownloadUrlOptions,
  ): Promise<string> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    const answersDoc = await answersRepository.findByApplication(applicationId);
    const answer = answersDoc?.answers.find((a: any) => a.questionId === questionId);
    const value = answer?.value as { storageKey?: string; fileName?: string; mimeType?: string } | undefined;
    if (!value?.storageKey) throw notFound('No file on this answer');
    const storage = getStorageProvider();
    return storage.createDownloadUrl(
      { storageKey: value.storageKey, fileName: value.fileName ?? 'file', mimeType: value.mimeType ?? 'application/octet-stream' },
      300,
      opts,
    );
  },

  async getResumeUrl(
    workspaceId: string,
    candidateId: string,
    auth: AuthContext,
    opts?: DownloadUrlOptions,
  ): Promise<string> {
    const candidate = await candidateRepository.findInWorkspace(workspaceId, candidateId);
    if (!candidate || !candidate.resume) throw notFound('No resume on file');
    if (!bypassesJobAccess(auth.role)) {
      const totalApps = await ApplicationModel.countDocuments({ workspaceId, candidateId });
      if (totalApps > 0) {
        const visible = await ApplicationModel.exists(
          applyJobAccessFilter({ workspaceId, candidateId }, auth, 'jobRestrictedTo'),
        );
        if (!visible) throw notFound('No resume on file');
      }
    }
    const storage = getStorageProvider();
    return storage.createDownloadUrl(
      {
        storageKey: candidate.resume.storageKey,
        fileName: candidate.resume.fileName,
        mimeType: candidate.resume.mimeType,
      },
      300,
      opts,
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
