import { z } from 'zod';
import type { ApplicationStage, CandidateSource, RejectionReason } from '../enums';

export type FunnelPoint = { stage: ApplicationStage; count: number };
export type CountPoint = { label: string; count: number };
export type SourcePoint = { source: CandidateSource; count: number };

export type AnalyticsDto = {
  metrics: {
    activeJobs: number;
    totalApplicants: number;
    applicantsLast30Days: number;
    shortlisted: number;
    hired: number;
    inOfferStage: number;
  };
  funnel: FunnelPoint[];
  byLocation: CountPoint[];
  salaryDistribution: CountPoint[];
  timeToHireDays: number | null;
  sources: SourcePoint[];
};

export type JobAnalyticsDto = {
  funnel: FunnelPoint[];
  applicantsOverTime: Array<{ date: string; count: number }>;
  topLocations: CountPoint[];
  screeningScoreDistribution: CountPoint[];
  sources: SourcePoint[];
};

// ---- Advanced analytics (Phase 3.3, behind requirePlanFeature('ADVANCED_ANALYTICS')) ----

export const cohortComparisonQuerySchema = z
  .object({
    aStart: z.coerce.date(),
    aEnd: z.coerce.date(),
    bStart: z.coerce.date(),
    bEnd: z.coerce.date(),
  })
  .refine(({ aStart, aEnd }) => aStart <= aEnd, { path: ['aEnd'], message: 'aEnd must not be before aStart' })
  .refine(({ bStart, bEnd }) => bStart <= bEnd, { path: ['bEnd'], message: 'bEnd must not be before bStart' });
export type CohortComparisonQuery = z.infer<typeof cohortComparisonQuerySchema>;

export type CohortMetrics = {
  totalApplicants: number;
  shortlisted: number;
  hired: number;
  timeToHireDays: number | null;
};

export type CohortComparisonDto = {
  rangeA: { start: string; end: string } & { metrics: CohortMetrics; funnel: FunnelPoint[] };
  rangeB: { start: string; end: string } & { metrics: CohortMetrics; funnel: FunnelPoint[] };
  /** B minus A — positive means range B is higher. */
  deltas: { totalApplicants: number; shortlisted: number; hired: number; timeToHireDays: number | null };
};

export type LeaderboardRow = {
  userId: string;
  name: string;
  jobsCreated: number;
  totalApplicants: number;
  hired: number;
  avgTimeToHireDays: number | null;
};

export type RecruiterLeaderboardDto = {
  rows: LeaderboardRow[];
  /**
   * v1 approximation: there's no per-application ownership model yet, so
   * activity is attributed to whoever created the job (`Job.createdBy`), not
   * necessarily whoever is actually working each application. See
   * IMPLEMENTATION.md Phase 3.3 — revisit once Phase 2's `restrictedTo`
   * naturally evolves into real per-application assignment.
   */
  isApproximate: true;
};

export type FunnelBenchmarkPoint = {
  stage: ApplicationStage;
  /** % of this job's applicants who reached this stage or further. */
  jobRate: number;
  /** Same metric computed across every job in the workspace. */
  workspaceRate: number;
};

export type FunnelBenchmarkDto = {
  points: FunnelBenchmarkPoint[];
};

// ---- Phase 1: Pipeline Health, Stage Dwell Times, Offer Metrics ----

export type PipelineHealthStage = {
  stage: ApplicationStage;
  active: number;
  completed: number;
  passthroughRate: number | null;
};

export type PipelineHealthDto = {
  stages: PipelineHealthStage[];
  totalApplications: number;
};

export type StageDwellPoint = {
  stage: string;
  medianDays: number | null;
  p75Days: number | null;
  count: number;
};

export type StageDwellTimeDto = {
  stages: StageDwellPoint[];
};

export type OfferMetricsDto = {
  totalSent: number;
  accepted: number;
  declined: number;
  expired: number;
  rescinded: number;
  pending: number;
  acceptanceRate: number | null;
  avgResponseDays: number | null;
};

// ---- Phase 2: Advanced analytics (PRO-gated) ----

export type SourceQualityRow = {
  source: CandidateSource;
  total: number;
  shortlisted: number;
  hired: number;
  hireRate: number | null;
  shortlistRate: number | null;
  avgScreeningScore: number | null;
};

export type SourceQualityDto = {
  sources: SourceQualityRow[];
};

export type RejectionDistributionDto = {
  reasons: Array<{ reason: RejectionReason; count: number }>;
  totalRejected: number;
  withReason: number;
  withoutReason: number;
};

export type JobFillRateRow = {
  jobId: string;
  title: string;
  openings: number;
  hired: number;
  fillRate: number;
  timeToFillDays: number | null;
};

export type JobFillRateDto = {
  jobs: JobFillRateRow[];
};
