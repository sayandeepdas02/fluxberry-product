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
