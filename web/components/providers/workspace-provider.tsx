'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionDto, UserDto, WorkspaceDto } from '@/lib/shared';
import { getWorkspaceId, setWorkspaceId } from '@/lib/api-client';

interface WorkspaceContextValue {
  user: UserDto;
  workspaces: WorkspaceDto[];
  currentWorkspace: WorkspaceDto;
  switchWorkspace: (id: string) => void;
  refreshSession: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  session,
  children,
}: {
  session: SessionDto;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const [currentId, setCurrentId] = useState<string>(() => {
    const stored = getWorkspaceId();
    const valid = stored && session.workspaces.some((w) => w.id === stored) ? stored : session.workspaces[0]?.id;
    // Ensure the API client sends the header on the very first query.
    if (valid) setWorkspaceId(valid);
    return valid ?? '';
  });

  // Keep the selection valid if the workspace list changes.
  useEffect(() => {
    if (!session.workspaces.some((w) => w.id === currentId)) {
      const first = session.workspaces[0]?.id;
      if (first) {
        setCurrentId(first);
        setWorkspaceId(first);
      }
    }
  }, [session.workspaces, currentId]);

  const currentWorkspace =
    session.workspaces.find((w) => w.id === currentId) ?? session.workspaces[0];

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      user: session.user,
      workspaces: session.workspaces,
      currentWorkspace,
      switchWorkspace: (id: string) => {
        setCurrentId(id);
        setWorkspaceId(id);
        // Everything is workspace-scoped, so drop cached data on switch.
        queryClient.invalidateQueries();
      },
      refreshSession: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
    }),
    [session.user, session.workspaces, currentWorkspace, queryClient],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
