import { Types } from 'mongoose';
import type {
  AnalyticsDto,
  JobAnalyticsDto,
  ApplicationStage,
  CandidateSource,
  CohortComparisonDto,
  CohortMetrics,
  RecruiterLeaderboardDto,
  FunnelBenchmarkDto,
} from '@fluxberry/shared';
import { PIPELINE_STAGES, CANDIDATE_SOURCES } from '@fluxberry/shared';
import { ApplicationModel } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { CandidateModel } from '../models/candidate.model';
import { AnalyticsCacheModel } from '../models/analytics-cache.model';
import { applyJobAccessFilter, bypassesJobAccess, jobAccessClause } from '../utils/job-access';
import { notFound } from '../utils/errors';
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
        { $unwind: { path: '$ca', preserveNullAndEmptyArrays: true } },
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

  // ---- Advanced analytics (Phase 3.3) — all gated by requirePlanFeature('ADVANCED_ANALYTICS') ----

  /** One date-range slice of the cohort comparison: metrics + funnel, scoped by `appliedAt`. */
  async _computeCohortSlice(
    workspaceId: string,
    auth: AuthContext,
    start: Date,
    end: Date,
  ): Promise<{ metrics: CohortMetrics; funnel: AnalyticsDto['funnel'] }> {
    const wsId = new Types.ObjectId(workspaceId);
    const baseMatch = applyJobAccessFilter(
      { workspaceId: wsId, appliedAt: { $gte: start, $lte: end } },
      auth,
      'jobRestrictedTo',
    );

    const [stageRows, hireTimes] = await Promise.all([
      ApplicationModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      ApplicationModel.find({ ...baseMatch, status: 'HIRED' }).select('appliedAt updatedAt').lean(),
    ]);

    const stageCount = new Map<string, number>(stageRows.map((r: any) => [r._id, r.count]));
    const totalApplicants = stageRows.reduce((s: number, r: any) => s + r.count, 0);
    const countFor = (stage: ApplicationStage) => stageCount.get(stage) ?? 0;
    const funnel = PIPELINE_STAGES.map((stage) => ({ stage, count: countFor(stage) }));
    const shortlisted = ['SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'HIRED'].reduce(
      (s, st) => s + countFor(st as ApplicationStage),
      0,
    );

    let timeToHireDays: number | null = null;
    if (hireTimes.length) {
      const totalDays = hireTimes.reduce((s: number, a: any) => {
        const d = (new Date(a.updatedAt).getTime() - new Date(a.appliedAt).getTime()) / 86_400_000;
        return s + Math.max(0, d);
      }, 0);
      timeToHireDays = Math.round((totalDays / hireTimes.length) * 10) / 10;
    }

    return {
      metrics: { totalApplicants, shortlisted, hired: countFor('HIRED'), timeToHireDays },
      funnel,
    };
  },

  /** Side-by-side comparison of two arbitrary date ranges — reruns the same aggregations, parameterized. */
  async computeCohortComparison(
    workspaceId: string,
    auth: AuthContext,
    range: { aStart: Date; aEnd: Date; bStart: Date; bEnd: Date },
  ): Promise<CohortComparisonDto> {
    // The frontend sends plain dates (an <input type="date">), which parse to
    // midnight — treat the *end* of a range as inclusive of that whole
    // calendar day, not the first instant of it.
    const endOfDay = (d: Date) => new Date(d.getTime() + 24 * 3600_000 - 1);
    const [a, b] = await Promise.all([
      this._computeCohortSlice(workspaceId, auth, range.aStart, endOfDay(range.aEnd)),
      this._computeCohortSlice(workspaceId, auth, range.bStart, endOfDay(range.bEnd)),
    ]);
    return {
      rangeA: { start: range.aStart.toISOString(), end: range.aEnd.toISOString(), ...a },
      rangeB: { start: range.bStart.toISOString(), end: range.bEnd.toISOString(), ...b },
      deltas: {
        totalApplicants: b.metrics.totalApplicants - a.metrics.totalApplicants,
        shortlisted: b.metrics.shortlisted - a.metrics.shortlisted,
        hired: b.metrics.hired - a.metrics.hired,
        timeToHireDays:
          a.metrics.timeToHireDays != null && b.metrics.timeToHireDays != null
            ? Math.round((b.metrics.timeToHireDays - a.metrics.timeToHireDays) * 10) / 10
            : null,
      },
    };
  },

  /**
   * Approximation, not a precise metric (see RecruiterLeaderboardDto.isApproximate):
   * attributed by `Job.createdBy` since no per-application ownership model
   * exists yet. Owner/admin only (see analytics.routes.ts) — this is
   * workspace-wide activity, not something a restricted recruiter should see
   * about their peers.
   */
  async computeLeaderboard(workspaceId: string): Promise<RecruiterLeaderboardDto> {
    const wsId = new Types.ObjectId(workspaceId);
    // Aggregate scalars *inside* the $lookup pipeline rather than pulling every
    // application document into a job's `apps` array — a job with a large
    // applicant pool could otherwise push the whole aggregation past Mongo's
    // 16MB per-document limit.
    const rows = await JobModel.aggregate([
      { $match: { workspaceId: wsId, createdBy: { $ne: null } } },
      {
        $lookup: {
          from: 'applications',
          let: { jobId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$jobId', '$$jobId'] } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                hired: { $sum: { $cond: [{ $eq: ['$status', 'HIRED'] }, 1, 0] } },
                hireDurationDaysSum: {
                  $sum: {
                    $cond: [
                      { $eq: ['$status', 'HIRED'] },
                      { $max: [0, { $divide: [{ $subtract: ['$updatedAt', '$appliedAt'] }, 86_400_000] }] },
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'appStats',
        },
      },
      { $unwind: { path: '$appStats', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$createdBy',
          jobsCreated: { $sum: 1 },
          totalApplicants: { $sum: { $ifNull: ['$appStats.count', 0] } },
          hired: { $sum: { $ifNull: ['$appStats.hired', 0] } },
          hireDurationDaysSum: { $sum: { $ifNull: ['$appStats.hireDurationDaysSum', 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $sort: { totalApplicants: -1 } },
    ]);

    const toRow = (r: any) => ({
      userId: String(r._id),
      name: r.user?.name ?? 'Unknown',
      jobsCreated: r.jobsCreated,
      totalApplicants: r.totalApplicants,
      hired: r.hired,
      avgTimeToHireDays: r.hired > 0 ? Math.round((r.hireDurationDaysSum / r.hired) * 10) / 10 : null,
    });

    return { rows: rows.map(toRow), isApproximate: true };
  },

  /**
   * A job's cumulative stage-reach vs. the same metric across the whole
   * workspace — each rate is "% of applicants who reached this stage or
   * further" (see FunnelBenchmarkPoint). An application currently sitting at
   * OFFER has necessarily already passed SCREENING/ASSESSMENT/INTERVIEW, so
   * it counts toward those buckets too. The one thing we can't reconstruct
   * without a stage-history log is *where* a REJECTED (or custom-stage)
   * application actually got to — those only count toward APPLIED, the one
   * stage every application unambiguously reached.
   */
  async computeFunnelBenchmark(workspaceId: string, jobId: string, auth: AuthContext): Promise<FunnelBenchmarkDto> {
    const job = await JobModel.findOne({ _id: jobId, workspaceId }).select('_id').lean();
    if (!job) throw notFound('Job not found');

    const wsId = new Types.ObjectId(workspaceId);
    const jId = new Types.ObjectId(jobId);

    const [jobRows, workspaceRows] = await Promise.all([
      ApplicationModel.aggregate([
        { $match: { workspaceId: wsId, jobId: jId } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      ApplicationModel.aggregate([
        // Workspace-wide comparator must respect the caller's job access too —
        // otherwise a restricted recruiter could infer volume on jobs they
        // can't otherwise see.
        { $match: applyJobAccessFilter({ workspaceId: wsId }, auth, 'jobRestrictedTo') },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
    ]);

    const rate = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);
    const { total: jobTotal, cumulative: jobCumulative } = cumulativeStageReach(jobRows);
    const { total: wsTotal, cumulative: wsCumulative } = cumulativeStageReach(workspaceRows);

    const points = PIPELINE_STAGES.map((stage, i) => ({
      stage,
      jobRate: rate(jobCumulative[i], jobTotal),
      workspaceRate: rate(wsCumulative[i], wsTotal),
    }));

    return { points };
  },
};

/**
 * Reverse-cumulative stage counts from a `{_id: stage, count}[]` aggregation:
 * `cumulative[i]` = applications currently at PIPELINE_STAGES[i] or later.
 * Stages outside PIPELINE_STAGES (REJECTED, or a job's custom stage ids) only
 * count at index 0 — every application reached APPLIED, but we can't know how
 * much further they got without a stage-history log.
 */
function cumulativeStageReach(rows: Array<{ _id: string; count: number }>): { total: number; cumulative: number[] } {
  const stageIndex = new Map(PIPELINE_STAGES.map((s, i) => [s as string, i]));
  const perStage = new Array(PIPELINE_STAGES.length).fill(0);
  let total = 0;
  let unmapped = 0;
  for (const r of rows) {
    total += r.count;
    const idx = stageIndex.get(r._id);
    if (idx !== undefined) perStage[idx] += r.count;
    else unmapped += r.count;
  }
  const cumulative = new Array(PIPELINE_STAGES.length).fill(0);
  let running = 0;
  for (let i = PIPELINE_STAGES.length - 1; i >= 0; i -= 1) {
    running += perStage[i];
    cumulative[i] = running;
  }
  // Unmapped (REJECTED / custom-stage) applications only count at APPLIED —
  // they don't inflate later-stage buckets whose actual reach is unknown.
  cumulative[0] += unmapped;
  return { total, cumulative };
}
