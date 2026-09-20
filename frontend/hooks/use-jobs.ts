'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  JobDto,
  CreateJobInput,
  UpdateJobInput,
  GenerateJdInput,
  GenerateJdResult,
  JobStatus,
  PipelineStage,
} from '@/lib/shared';
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
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', job.workspaceId, job.id] });
    },
  });
}

export function useSetJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { jobId: string; status: JobStatus }) =>
      api.post<JobDto>(`/api/v1/jobs/${v.jobId}/status`, { status: v.status }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', job.workspaceId, job.id] });
    },
  });
}

export function useCloneJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post<JobDto>(`/api/v1/jobs/${jobId}/clone`),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', job.workspaceId, job.id] });
    },
  });
}

export function generateJd(input: GenerateJdInput): Promise<GenerateJdResult> {
  return api.post<GenerateJdResult>('/api/v1/jobs/generate-description', input);
}

export function useJobStages(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['job-stages', currentWorkspace.id, jobId],
    queryFn: () => api.get<PipelineStage[]>(`/api/v1/jobs/${jobId}/stages`),
    enabled: Boolean(jobId),
  });
}

export function useUpdateJobAccess(jobId: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (restrictedTo: string[]) =>
      api.put<JobDto>(`/api/v1/jobs/${jobId}/access`, { restrictedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', currentWorkspace.id, jobId] });
    },
  });
}

export function useSetLinkedInPosted(jobId: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (posted: boolean) => api.post<JobDto>(`/api/v1/jobs/${jobId}/linkedin-posted`, { posted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', currentWorkspace.id, jobId] });
    },
  });
}

export function useUpdateJobStages(jobId: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (stages: PipelineStage[]) =>
      api.put<PipelineStage[]>(`/api/v1/jobs/${jobId}/stages`, { stages }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-stages', currentWorkspace.id, jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', currentWorkspace.id, jobId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
