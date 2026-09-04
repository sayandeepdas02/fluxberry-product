'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDto, JobAnalyticsDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

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
