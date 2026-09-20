'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AnalyticsDto,
  JobAnalyticsDto,
  CohortComparisonDto,
  RecruiterLeaderboardDto,
  FunnelBenchmarkDto,
  PipelineHealthDto,
  StageDwellTimeDto,
  OfferMetricsDto,
  SourceQualityDto,
  RejectionDistributionDto,
  JobFillRateDto,
} from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useFeature } from './use-features';

export function useAnalytics() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id],
    queryFn: () => api.get<AnalyticsDto>('/api/v1/analytics'),
  });
}

export function useJobAnalytics(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'job', jobId],
    queryFn: () => api.get<JobAnalyticsDto>(`/api/v1/jobs/${jobId}/analytics`),
    enabled: Boolean(jobId),
  });
}

export interface CohortRange {
  start: string;
  end: string;
}

/** Advanced analytics — behind requirePlanFeature('ADVANCED_ANALYTICS'); callers should show PlanUpgradeModal on a PLAN_UPGRADE_REQUIRED error. */
export function useCohortComparison(a: CohortRange, b: CohortRange) {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  const ready = Boolean(a.start && a.end && b.start && b.end);
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'cohort', a, b],
    queryFn: () => {
      const qs = new URLSearchParams({ aStart: a.start, aEnd: a.end, bStart: b.start, bEnd: b.end });
      return api.get<CohortComparisonDto>(`/api/v1/analytics/advanced/cohort?${qs.toString()}`);
    },
    enabled: advancedAnalytics && ready,
    retry: false,
  });
}

export function useLeaderboard() {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'leaderboard'],
    queryFn: () => api.get<RecruiterLeaderboardDto>('/api/v1/analytics/advanced/leaderboard'),
    enabled: advancedAnalytics && currentWorkspace.role !== 'viewer' && currentWorkspace.role !== 'recruiter',
    retry: false,
  });
}

export function useFunnelBenchmark(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'job', jobId, 'benchmark'],
    queryFn: () => api.get<FunnelBenchmarkDto>(`/api/v1/jobs/${jobId}/analytics/benchmark`),
    enabled: advancedAnalytics && Boolean(jobId),
    retry: false,
  });
}

// ---- Phase 1: Pipeline Health, Stage Dwell Times, Offer Metrics ----

export function usePipelineHealth() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'pipeline-health'],
    queryFn: () => api.get<PipelineHealthDto>('/api/v1/analytics/pipeline-health'),
  });
}

export function useStageDwellTimes() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'stage-dwell-times'],
    queryFn: () => api.get<StageDwellTimeDto>('/api/v1/analytics/stage-dwell-times'),
  });
}

export function useOfferMetrics() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'offer-metrics'],
    queryFn: () => api.get<OfferMetricsDto>('/api/v1/analytics/offer-metrics'),
  });
}

// ---- Phase 2: Advanced analytics (PRO-gated, behind requirePlanFeature('ADVANCED_ANALYTICS')) ----

export function useSourceQuality() {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'source-quality'],
    queryFn: () => api.get<SourceQualityDto>('/api/v1/analytics/advanced/source-quality'),
    enabled: advancedAnalytics,
    retry: false,
  });
}

export function useRejectionDistribution() {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'rejection-reasons'],
    queryFn: () => api.get<RejectionDistributionDto>('/api/v1/analytics/advanced/rejection-reasons'),
    enabled: advancedAnalytics,
    retry: false,
  });
}

export function useJobFillRates() {
  const { currentWorkspace } = useWorkspace();
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id, 'job-fill-rates'],
    queryFn: () => api.get<JobFillRateDto>('/api/v1/analytics/advanced/job-fill-rates'),
    enabled: advancedAnalytics,
    retry: false,
  });
}
