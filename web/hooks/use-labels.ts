'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LabelDto, CreateLabelInput, UpdateLabelInput } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useLabels() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['labels', currentWorkspace.id],
    queryFn: () => api.get<LabelDto[]>(`/api/v1/workspaces/${currentWorkspace.id}/labels`),
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (input: CreateLabelInput) =>
      api.post<LabelDto>(`/api/v1/workspaces/${currentWorkspace.id}/labels`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels', currentWorkspace.id] }),
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (v: { labelId: string; input: UpdateLabelInput }) =>
      api.patch<LabelDto>(`/api/v1/workspaces/${currentWorkspace.id}/labels/${v.labelId}`, v.input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels', currentWorkspace.id] }),
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (labelId: string) =>
      api.del(`/api/v1/workspaces/${currentWorkspace.id}/labels/${labelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
    },
  });
}

export function useSetApplicationLabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; labelIds: string[] }) =>
      api.put<LabelDto[]>(`/api/v1/applications/${v.applicationId}/labels`, { labelIds: v.labelIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      queryClient.invalidateQueries({ queryKey: ['application'] });
    },
  });
}
