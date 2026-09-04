import type { ApplicationStage, CandidateSource } from '../enums';

export type FunnelPoint = { stage: ApplicationStage; count: number };
export type CountPoint = { label: string; count: number };
export type SourcePoint = { source: CandidateSource; count: number };

export type AnalyticsDto = {
  metrics: {
    activeJobs: number;
    totalApplicants: number;
    applicantsLast30Days: number;
    shortlisted: number;
    interviews: number;
    hired: number;
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
  assessments: {
    totalSent: number;
    completed: number;
    avgScore: number | null;
    completionRate: number | null;
  };
  sources: SourcePoint[];
};
