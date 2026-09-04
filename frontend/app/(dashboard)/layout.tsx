'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { PageSpinner } from '@/components/ui/spinner';
import { CommandMenu } from '@/components/command-menu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (!session) router.replace('/login');
    else if (session.needsOnboarding) router.replace('/onboarding');
  }, [isLoading, session, router]);

  if (isLoading) return <PageSpinner label="Loading…" />;
  if (!session || session.needsOnboarding) return <PageSpinner />;

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
