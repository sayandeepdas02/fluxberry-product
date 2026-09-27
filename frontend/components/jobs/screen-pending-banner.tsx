'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useScreenPending, useScreenPendingCount } from '@/hooks/use-jobs';
import { useCreditErrorHandler } from '@/components/billing/credits-provider';
import { CostLabel } from '@/components/billing/cost-label';

/**
 * Shown on a job's candidates tab when applicants arrived after the plan's
 * included AI screenings (and credits) ran out. They were received normally;
 * this lets a recruiter score them now.
 */
export function ScreenPendingBanner({ jobId }: { jobId: string }) {
  const { data } = useScreenPendingCount(jobId);
  const screen = useScreenPending(jobId);
  const handleCreditError = useCreditErrorHandler();
  const pending = data?.pending ?? 0;
  if (pending === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
      <p className="text-amber-900 dark:text-amber-200">
        <Sparkles className="mr-1.5 inline size-4 align-text-bottom" />
        {pending.toLocaleString()} {pending === 1 ? 'applicant is' : 'applicants are'} waiting for AI screening — your
        plan&apos;s included screenings for this period are used up.
      </p>
      <Button
        size="sm"
        loading={screen.isPending}
        onClick={() =>
          screen.mutate(undefined, {
            onSuccess: (r) =>
              toast.success(
                r.remaining > 0
                  ? `Screening ${r.queued} — ${r.remaining} still waiting (out of credits)`
                  : `Screening ${r.queued} ${r.queued === 1 ? 'applicant' : 'applicants'}`,
              ),
            onError: (err) => {
              if (!handleCreditError(err)) toast.error(err instanceof Error ? err.message : 'Could not start screening');
            },
          })
        }
      >
        Screen {pending.toLocaleString()} now <CostLabel action="APPLICANT_SCREENING" quantity={pending} upTo />
      </Button>
    </div>
  );
}
