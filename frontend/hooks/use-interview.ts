'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AiInterviewConfigDto,
  UpsertInterviewConfigInput,
  InterviewDto,
  SendInterviewInput,
} from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useInterviewConfig(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['interview-config', currentWorkspace.id, jobId],
    queryFn: () => api.get<AiInterviewConfigDto>(`/api/v1/jobs/${jobId}/interview-config`),
    enabled: Boolean(jobId),
  });
}

export function useSaveInterviewConfig(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertInterviewConfigInput) =>
      api.put<AiInterviewConfigDto>(`/api/v1/jobs/${jobId}/interview-config`, input),
    onSuccess: (cfg) => queryClient.setQueryData(['interview-config', currentWorkspace.id, jobId], cfg),
  });
}

export function useApplicationInterviews(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['app-interviews', currentWorkspace.id, applicationId],
    queryFn: () => api.get<InterviewDto[]>(`/api/v1/applications/${applicationId}/interviews`),
    enabled: Boolean(applicationId),
    // Poll while an interview is invited/started/in-progress so the score lands live.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((iv) => ['INVITED', 'STARTED', 'IN_PROGRESS'].includes(iv.status)) ? 4000 : false,
  });
}

export function useSendInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; input: SendInterviewInput }) =>
      api.post<InterviewDto>(`/api/v1/applications/${v.applicationId}/interview`, v.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
