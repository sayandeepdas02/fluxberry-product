'use client';

import { useQuery } from '@tanstack/react-query';
import type { WorkspaceMemberDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['members', currentWorkspace.id],
    queryFn: () => api.get<WorkspaceMemberDto[]>(`/api/v1/workspaces/${currentWorkspace.id}/members`),
  });
}
