'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageDto, SendMessageInput } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useMessages(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['messages', currentWorkspace.id, applicationId],
    queryFn: () => api.get<MessageDto[]>(`/api/v1/applications/${applicationId}/messages`),
    enabled: Boolean(applicationId),
    // No websocket layer in this app — poll gently so a candidate's reply shows up without a manual refresh.
    refetchInterval: 15_000,
  });
}

export function useSendMessage(applicationId: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      api.post<MessageDto>(`/api/v1/applications/${applicationId}/messages`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', currentWorkspace.id, applicationId] }),
  });
}
