import { Types } from 'mongoose';
import type { AnalyticsDto, ApplicationStage, CandidateSource } from '@fluxberry/shared';
import { PIPELINE_STAGES, CANDIDATE_SOURCES } from '@fluxberry/shared';
import { ApplicationModel } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { CandidateModel } from '../models/candidate.model';

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
   * Workspace analytics via indexed aggregation (spec §55-56). Fine for MVP
   * datasets; can move to precomputed tables later without changing the API.
   */
  async compute(workspaceId: string): Promise<AnalyticsDto> {
    const wsId = new Types.ObjectId(workspaceId);
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

    const [
      activeJobs,
      stageRows,
      last30,
      hired,
      locationRows,
      salaryDocs,
      sourceRows,
      hireTimes,
    ] = await Promise.all([
      JobModel.countDocuments({ workspaceId: wsId, status: { $in: ['PUBLISHED', 'PAUSED'] } }),
      ApplicationModel.aggregate([{ $match: { workspaceId: wsId } }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      ApplicationModel.countDocuments({ workspaceId: wsId, appliedAt: { $gte: since30 } }),
      ApplicationModel.countDocuments({ workspaceId: wsId, status: 'HIRED' }),
      CandidateModel.aggregate([
        { $match: { workspaceId: wsId, location: { $ne: null } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      CandidateModel.find({ workspaceId: wsId, expectedSalary: { $ne: null } }).select('expectedSalary').lean(),
      ApplicationModel.aggregate([{ $match: { workspaceId: wsId } }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
      ApplicationModel.find({ workspaceId: wsId, status: 'HIRED' }).select('appliedAt updatedAt').lean(),
    ]);

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
};
