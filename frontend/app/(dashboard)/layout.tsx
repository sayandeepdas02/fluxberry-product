'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { PageSpinner } from '@/components/ui/spinner';
import { CommandMenu } from '@/components/command-menu';
import { api, setWorkspaceId } from '@/lib/api-client';
import type { WorkspaceDto } from '@fluxberry/shared';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (!session?.needsOnboarding) return;
    api
      .post<WorkspaceDto>('/api/v1/workspaces/onboarding', { name: 'My Workspace', company: 'My Company' })
      .then((ws) => {
        setWorkspaceId(ws.id);
        queryClient.invalidateQueries({ queryKey: ['session'] });
      })
      .catch(() => {});
  }, [session?.needsOnboarding, queryClient]);

  if (isLoading || !session || session.needsOnboarding) return <PageSpinner label="Loading…" />;

  return (
    <WorkspaceProvider session={session}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1 bg-muted/20">
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </div>
      <CommandMenu />
    </WorkspaceProvider>
  );
}
