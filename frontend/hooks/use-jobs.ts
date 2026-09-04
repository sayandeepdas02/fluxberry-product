'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  JobDto,
  CreateJobInput,
  UpdateJobInput,
  GenerateJdInput,
  GenerateJdResult,
  JobStatus,
} from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

type JobFilter = { status?: 'all' | 'active' | 'draft' | 'closed'; search?: string };

export function useJobs(filter: JobFilter = {}) {
  const { currentWorkspace } = useWorkspace();
  const status = filter.status ?? 'all';
  return useQuery({
    queryKey: ['jobs', currentWorkspace.id, status, filter.search ?? ''],
    queryFn: () => {
      const qs = new URLSearchParams({ status });
      if (filter.search) qs.set('search', filter.search);
      return api.get<JobDto[]>(`/api/v1/jobs?${qs.toString()}`);
    },
  });
}

export function useJob(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['job', currentWorkspace.id, jobId],
    queryFn: () => api.get<JobDto>(`/api/v1/jobs/${jobId}`),
    enabled: Boolean(jobId),
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => api.post<JobDto>('/api/v1/jobs', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateJobInput) => api.patch<JobDto>(`/api/v1/jobs/${jobId}`, input),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', job.workspaceId, jobId] });
    },
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post<JobDto>(`/api/v1/jobs/${jobId}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useSetJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { jobId: string; status: JobStatus }) =>
      api.post<JobDto>(`/api/v1/jobs/${v.jobId}/status`, { status: v.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useCloneJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post<JobDto>(`/api/v1/jobs/${jobId}/clone`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function generateJd(input: GenerateJdInput): Promise<GenerateJdResult> {
  return api.post<GenerateJdResult>('/api/v1/jobs/generate-description', input);
}
