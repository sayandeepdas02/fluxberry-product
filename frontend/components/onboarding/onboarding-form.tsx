'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceDto } from '@fluxberry/shared';
import { useSession } from '@/hooks/use-session';
import { api, setWorkspaceId } from '@/lib/api-client';
import { publicConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';

export function OnboardingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSession();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session && !session.needsOnboarding) {
      router.replace('/app');
    }
  }, [session, router]);

  if (isLoading || !session) return <PageSpinner label="Loading…" />;
  if (!session.needsOnboarding) return <PageSpinner label="Loading…" />;

  const submit = async () => {
    if (!name.trim() || !company.trim()) return;
    setSubmitting(true);
    try {
      const ws = await api.post<WorkspaceDto>('/api/v1/workspaces/onboarding', {
        name: name.trim(),
        company: company.trim(),
      });
      setWorkspaceId(ws.id);
      await queryClient.refetchQueries({ queryKey: ['session'] });
      router.push('/app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not finish onboarding');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6 py-12">
      <p className="mb-8 text-lg font-semibold tracking-tight">{publicConfig.appName}</p>
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-card-title">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell us a bit about you to set up your workspace.</p>

        <div className="mt-6 space-y-4">
          <Field label="Your name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
          <Field label="Company name">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
          <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !company.trim()}>
            Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}
