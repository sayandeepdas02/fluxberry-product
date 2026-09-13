'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ScheduledInterviewDto, CreateScheduledInterviewInput } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useScheduledInterviews(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['scheduled-interviews', currentWorkspace.id, applicationId],
    queryFn: () => api.get<ScheduledInterviewDto[]>(`/api/v1/applications/${applicationId}/scheduled-interviews`),
    enabled: Boolean(applicationId),
  });
}

export function useCreateScheduledInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; input: CreateScheduledInterviewInput }) =>
      api.post<ScheduledInterviewDto>(`/api/v1/applications/${v.applicationId}/scheduled-interviews`, v.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
    },
  });
}

export function useDeleteScheduledInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; id: string }) =>
      api.del(`/api/v1/applications/${v.applicationId}/scheduled-interviews/${v.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
