'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionDto, WorkspaceDto } from '@fluxberry/shared';
import { useSession } from '@/hooks/use-session';
import { api, setWorkspaceId } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSession();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.needsOnboarding) {
      router.replace('/app');
      return;
    }
    setName((n) => n || session.user.name || '');
  }, [isLoading, session, router]);

  if (isLoading || !session) return <PageSpinner />;

  const finish = async () => {
    setSubmitting(true);
    try {
      const ws = await api.post<WorkspaceDto>('/api/v1/workspaces/onboarding', {
        name: name.trim(),
        company: company.trim(),
      });
      setWorkspaceId(ws.id);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.replace('/app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create workspace');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-sm font-medium text-muted-foreground">
          {publicConfig.appName}
        </div>
        <Card className="p-6">
          {step === 0 && (
            <StepShell
              title="What's your name?"
              onNext={() => name.trim() && setStep(1)}
              nextDisabled={!name.trim()}
            >
              <Field label="Your name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
              </Field>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title="What company do you work at?"
              onBack={() => setStep(0)}
              onNext={() => company.trim() && setStep(2)}
              nextDisabled={!company.trim()}
            >
              <Field label="Company">
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  autoFocus
                />
              </Field>
            </StepShell>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">Create your workspace</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is where your jobs and candidates live.
                </p>
              </div>
              <Field label="Workspace name" hint="Usually your company or team name.">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} autoFocus />
              </Field>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={finish} loading={submitting} disabled={!company.trim()}>
                  Create workspace
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StepShell({
  title,
  children,
  onNext,
  onBack,
  nextDisabled,
}: {
  title: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="space-y-5"
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
      <div className="flex items-center justify-between">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={nextDisabled}>
          Continue
        </Button>
      </div>
    </form>
  );
}
