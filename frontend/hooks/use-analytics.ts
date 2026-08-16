'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useAnalytics() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['analytics', currentWorkspace.id],
    queryFn: () => api.get<AnalyticsDto>('/api/v1/analytics'),
  });
}
