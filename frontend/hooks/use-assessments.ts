'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssessmentDto,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  CandidateAssessmentDto,
  SendAssessmentInput,
  JobAssessmentRowDto,
} from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useAssessments() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['assessments', currentWorkspace.id],
    queryFn: () => api.get<AssessmentDto[]>('/api/v1/assessments'),
  });
}

export function useAssessment(id: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['assessment', currentWorkspace.id, id],
    queryFn: () => api.get<AssessmentDto>(`/api/v1/assessments/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssessmentInput) => api.post<AssessmentDto>('/api/v1/assessments', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function useUpdateAssessment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAssessmentInput) => api.patch<AssessmentDto>(`/api/v1/assessments/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessment'] });
    },
  });
}

export function usePublishAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AssessmentDto>(`/api/v1/assessments/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessment'] });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/assessments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function useApplicationAssessments(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['app-assessments', currentWorkspace.id, applicationId],
    queryFn: () => api.get<CandidateAssessmentDto[]>(`/api/v1/applications/${applicationId}/assessments`),
    enabled: Boolean(applicationId),
    // Poll while a coding submission is still grading so the score appears live.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((ca) => ca.status === 'GRADING') ? 3000 : false,
  });
}

export function useJobAssessments(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['job-assessments', currentWorkspace.id, jobId],
    queryFn: () => api.get<JobAssessmentRowDto[]>(`/api/v1/jobs/${jobId}/assessments`),
    enabled: Boolean(jobId),
    // Poll while a coding submission is still grading so the score appears live.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => r.status === 'GRADING') ? 3000 : false,
  });
}

export function useSendAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; input: SendAssessmentInput }) =>
      api.post<CandidateAssessmentDto>(`/api/v1/applications/${v.applicationId}/assessments`, v.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
