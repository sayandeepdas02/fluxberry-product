'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApplicationFormDto, FormQuestion } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useApplicationForm(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['form', currentWorkspace.id, jobId],
    queryFn: () => api.get<ApplicationFormDto>(`/api/v1/jobs/${jobId}/form`),
    enabled: Boolean(jobId),
  });
}

export function useUpdateForm(jobId: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questions: FormQuestion[]) =>
      api.patch<ApplicationFormDto>(`/api/v1/jobs/${jobId}/form`, { questions }),
    onSuccess: (form) => {
      queryClient.setQueryData(['form', currentWorkspace.id, jobId], form);
    },
  });
}
