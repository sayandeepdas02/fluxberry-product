'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AnalyticsDto,
  JobAnalyticsDto,
  CohortComparisonDto,
  RecruiterLeaderboardDto,
  FunnelBenchmarkDto,
} from '@fluxberry/shared';
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
