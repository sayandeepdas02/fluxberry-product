import { Types } from 'mongoose';
import type { AnalyticsDto, JobAnalyticsDto, ApplicationStage, CandidateSource } from '@fluxberry/shared';
import { PIPELINE_STAGES, CANDIDATE_SOURCES } from '@fluxberry/shared';
import { ApplicationModel } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { CandidateModel } from '../models/candidate.model';
import { AnalyticsCacheModel } from '../models/analytics-cache.model';
import { applyJobAccessFilter, bypassesJobAccess, jobAccessClause } from '../utils/job-access';
import type { AuthContext } from '../types/auth-context';

const CACHE_TTL_MS = 15 * 60 * 1000;

/** Salary buckets (INR) for the expected-salary distribution. */
const SALARY_BUCKETS = [
  { label: '< ₹5L', max: 500_000 },
  { label: '₹5–10L', max: 1_000_000 },
  { label: '₹10–20L', max: 2_000_000 },
  { label: '₹20–30L', max: 3_000_000 },
  { label: '₹30L+', max: Infinity },
];

export const analyticsService = {
  /**
   * Workspace analytics with 15-minute cache (spec §55-56). Re-computes on
   * first hit after TTL expires; stale-while-revalidate keeps latency low.
   *
   * The cache is shared per-workspace and holds the *unrestricted* view, so it
   * is only used for owner/admin (who always see everything). A recruiter
   * scoped by per-job `restrictedTo` always gets a fresh, auth-aware
   * computation instead — caching a per-viewer-restricted result would either
   * leak the full numbers to a restricted viewer (if an owner populated the
   * cache first) or serve a stale, narrower view to an owner (if a restricted
   * recruiter populated it first).
   */
  async compute(workspaceId: string, auth: AuthContext): Promise<AnalyticsDto> {
    if (!bypassesJobAccess(auth.role)) return this._computeFresh(workspaceId, auth);

    const cached = await AnalyticsCacheModel.findOne({ workspaceId: new Types.ObjectId(workspaceId) }).lean();
    if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
      return cached.data as AnalyticsDto;
    }
    const result = await this._computeFresh(workspaceId, auth);
    await AnalyticsCacheModel.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(workspaceId) },
      { data: result, computedAt: new Date() },
      { upsert: true },
    );
    return result;
  },

  async _computeFresh(workspaceId: string, auth: AuthContext): Promise<AnalyticsDto> {
    const wsId = new Types.ObjectId(workspaceId);
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

    // `null` for owner/admin (no restriction); otherwise the $or clause
    // limiting to jobs/applications this viewer is allowed to see.
    const accessClause = jobAccessClause(auth, 'jobRestrictedTo');
    const candidateVisibilityStages = accessClause
      ? [
          {
            $lookup: {
              from: 'applications',
              let: { cid: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$candidateId', '$$cid'] } } },
                { $match: accessClause },
                { $limit: 1 },
              ],
              as: '_visibleApp',
            },
          },
          { $match: { '_visibleApp.0': { $exists: true } } },
        ]
      : [];

    const [
      activeJobs,
      stageRows,
      last30,
      hired,
      locationRows,
      salaryRows,
      sourceRows,
      hireTimes,
    ] = await Promise.all([
      JobModel.countDocuments(applyJobAccessFilter({ workspaceId: wsId, status: { $in: ['PUBLISHED', 'PAUSED'] } }, auth, 'restrictedTo')),
      ApplicationModel.aggregate([
        { $match: applyJobAccessFilter({ workspaceId: wsId }, auth, 'jobRestrictedTo') },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      ApplicationModel.countDocuments(applyJobAccessFilter({ workspaceId: wsId, appliedAt: { $gte: since30 } }, auth, 'jobRestrictedTo')),
      ApplicationModel.countDocuments(applyJobAccessFilter({ workspaceId: wsId, status: 'HIRED' }, auth, 'jobRestrictedTo')),
      CandidateModel.aggregate([
        { $match: { workspaceId: wsId, location: { $ne: null } } },
        ...candidateVisibilityStages,
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      CandidateModel.aggregate([
        { $match: { workspaceId: wsId, expectedSalary: { $ne: null } } },
        ...candidateVisibilityStages,
        { $project: { expectedSalary: 1 } },
      ]),
      ApplicationModel.aggregate([
        { $match: applyJobAccessFilter({ workspaceId: wsId }, auth, 'jobRestrictedTo') },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      ApplicationModel.find(applyJobAccessFilter({ workspaceId: wsId, status: 'HIRED' }, auth, 'jobRestrictedTo'))
        .select('appliedAt updatedAt')
        .lean(),
    ]);
    const salaryDocs = salaryRows as Array<{ expectedSalary: number }>;

    const stageCount = new Map<string, number>(stageRows.map((r: any) => [r._id, r.count]));
    const totalApplicants = stageRows.reduce((s: number, r: any) => s + r.count, 0);
    const countFor = (stage: ApplicationStage) => stageCount.get(stage) ?? 0;

    const funnel = PIPELINE_STAGES.map((stage) => ({ stage, count: countFor(stage) }));
    const shortlisted = ['SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'HIRED'].reduce(
      (s, st) => s + countFor(st as ApplicationStage),
      0,
    );

    // Salary buckets
    const salaryDistribution = SALARY_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
    for (const c of salaryDocs) {
      const idx = SALARY_BUCKETS.findIndex((b) => (c.expectedSalary as number) < b.max);
      if (idx >= 0) salaryDistribution[idx].count += 1;
    }

    // Sources (ensure all source keys present, zero-filled)
    const srcCount = new Map<string, number>(sourceRows.map((r: any) => [r._id, r.count]));
    const sources = CANDIDATE_SOURCES.map((source) => ({ source: source as CandidateSource, count: srcCount.get(source) ?? 0 }));

    // Time to hire (avg days)
    let timeToHireDays: number | null = null;
    if (hireTimes.length) {
      const totalDays = hireTimes.reduce((s: number, a: any) => {
        const d = (new Date(a.updatedAt).getTime() - new Date(a.appliedAt).getTime()) / 86_400_000;
        return s + Math.max(0, d);
      }, 0);
      timeToHireDays = Math.round((totalDays / hireTimes.length) * 10) / 10;
    }

    return {
      metrics: {
        activeJobs,
        totalApplicants,
        applicantsLast30Days: last30,
        shortlisted,
        interviews: countFor('INTERVIEW'),
        hired,
      },
      funnel,
      byLocation: locationRows.map((r: any) => ({ label: r._id as string, count: r.count })),
      salaryDistribution: salaryDistribution.filter((s) => s.count > 0),
      timeToHireDays,
      sources: sources.filter((s) => s.count > 0),
    };
  },

  async computeForJob(workspaceId: string, jobId: string): Promise<JobAnalyticsDto> {
    const wsId = new Types.ObjectId(workspaceId);
    const jId = new Types.ObjectId(jobId);
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

    const [stageRows, timeRows, locationRows, scoreRows, assessmentRows, sourceRows] = await Promise.all([
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId, appliedAt: { $gte: since30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appliedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId } },
        { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'c' } },
        { $unwind: '$c' },
        { $match: { 'c.location': { $ne: null } } },
        { $group: { _id: '$c.location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId, 'screeningResult.score': { $ne: null } } },
        { $bucket: { groupBy: '$screeningResult.score', boundaries: [0, 3, 5, 7, 9, 11], default: 'Other',
          output: { count: { $sum: 1 } } } },
      ]),
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId } },
        { $lookup: { from: 'candidate_assessments', localField: '_id', foreignField: 'applicationId', as: 'ca' } },
        { $unwind: { path: '$ca', preserveNullAndEmpty: true } },
        { $group: {
          _id: null,
          totalSent: { $sum: { $cond: [{ $ifNull: ['$ca._id', false] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$ca.status', 'COMPLETED'] }, 1, 0] } },
          totalScore: { $sum: { $cond: [{ $eq: ['$ca.status', 'COMPLETED'] }, { $ifNull: ['$ca.score', 0] }, 0] } },
        } },
      ]),
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ]);

    const stageCount = new Map(stageRows.map((r: any) => [r._id as string, r.count as number]));
    const funnel = PIPELINE_STAGES.map((stage) => ({ stage, count: stageCount.get(stage) ?? 0 }));

    const scoreBucketLabels: Record<string, string> = { '0': '0–2', '3': '3–4', '5': '5–6', '7': '7–8', '9': '9–10' };
    const screeningScoreDistribution = scoreRows
      .filter((r: any) => r._id !== 'Other')
      .map((r: any) => ({ label: scoreBucketLabels[String(r._id)] ?? String(r._id), count: r.count }));

    const srcCount = new Map(sourceRows.map((r: any) => [r._id as string, r.count as number]));
    const sources = CANDIDATE_SOURCES
      .map((source) => ({ source: source as CandidateSource, count: srcCount.get(source) ?? 0 }))
      .filter((s) => s.count > 0);

    const agg = assessmentRows[0] as any;
    const totalSent = agg?.totalSent ?? 0;
    const completed = agg?.completed ?? 0;
    const avgScore = completed > 0 ? Math.round((agg.totalScore / completed) * 10) / 10 : null;
    const completionRate = totalSent > 0 ? Math.round((completed / totalSent) * 100) : null;

    return {
      funnel,
      applicantsOverTime: timeRows.map((r: any) => ({ date: r._id as string, count: r.count })),
      topLocations: locationRows.map((r: any) => ({ label: r._id as string, count: r.count })),
      screeningScoreDistribution,
      assessments: { totalSent, completed, avgScore, completionRate },
      sources,
    };
  },
};
