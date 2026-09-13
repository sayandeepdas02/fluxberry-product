'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InterviewFeedbackDto,
  CreateInterviewFeedbackInput,
  InterviewerAccessDto,
  SubmitInterviewFeedbackInput,
} from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useInterviewFeedback(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['interview-feedback', currentWorkspace.id, applicationId],
    queryFn: () => api.get<InterviewFeedbackDto[]>(`/api/v1/applications/${applicationId}/interview-feedback`),
    enabled: Boolean(applicationId),
  });
}

export function useCreateInterviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; input: CreateInterviewFeedbackInput }) =>
      api.post<InterviewFeedbackDto>(`/api/v1/applications/${v.applicationId}/interview-feedback`, v.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ---- Public, token-gated interviewer access link (no Fluxberry account) ----

export async function fetchInterviewerAccess(token: string): Promise<InterviewerAccessDto> {
  return api.get<InterviewerAccessDto>(`/api/v1/public/interview-access/${token}`, { public: true });
}

export async function submitInterviewerFeedback(
  token: string,
  input: SubmitInterviewFeedbackInput,
): Promise<InterviewFeedbackDto> {
  return api.post<InterviewFeedbackDto>(`/api/v1/public/interview-access/${token}`, input, { public: true });
}
