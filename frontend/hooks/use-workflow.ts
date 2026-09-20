'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkflowDto, UpsertWorkflowInput, WorkflowRunDto } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useWorkflow(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['workflow', currentWorkspace.id, jobId],
    queryFn: () => api.get<WorkflowDto>(`/api/v1/jobs/${jobId}/workflow`),
    enabled: Boolean(jobId),
  });
}

export function useSaveWorkflow(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertWorkflowInput) => api.put<WorkflowDto>(`/api/v1/jobs/${jobId}/workflow`, input),
    onSuccess: (wf) => queryClient.setQueryData(['workflow', currentWorkspace.id, jobId], wf),
  });
}

export function useWorkflowRun(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['workflow-run', currentWorkspace.id, applicationId],
    queryFn: () => api.get<WorkflowRunDto | null>(`/api/v1/applications/${applicationId}/workflow-run`),
    enabled: Boolean(applicationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'WAITING' ? 4000 : false;
    },
  });
}
