'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { ACTIVE_BILLING_STATUSES } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useBillingStatus } from '@/hooks/use-billing';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

/**
 * Fluxberry is paid-only — no free tier. This wraps every product route
 * (not /app/settings/* or /app/pricing, since an unpaid owner must still
 * be able to reach billing to subscribe) and shows a translucent overlay
 * over the real content until the workspace has an active subscription.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();
  const { data: status, isLoading, isError, refetch } = useBillingStatus();

  if (pathname.startsWith('/app/settings') || pathname.startsWith('/app/pricing')) {
    return <>{children}</>;
  }

  if (isLoading) return <PageSpinner label="Loading…" />;

  if (isError || !status) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Could not load the subscription status.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (ACTIVE_BILLING_STATUSES.includes(status.subscriptionStatus)) return <>{children}</>;

  const isOwner = currentWorkspace.role === 'owner';

  return (
    <div className="relative min-h-[70vh]">
      <div aria-hidden className="pointer-events-none select-none opacity-40">
        {children}
      </div>

      <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="flex max-w-sm flex-col items-center rounded-xl border bg-white p-8 text-center shadow-lg">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">Subscribe to get access</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock jobs, candidates, and everything else in Fluxberry Pro.
          </p>
          <div className="mt-6">
            {isOwner ? (
              <Button asChild>
                <Link href="/app/pricing">View plans</Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only the workspace owner can start a subscription.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
