'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ACTIVE_BILLING_STATUSES } from '@/lib/shared';
import type { BillingCycle } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useBillingStatus, useCreateCheckout } from '@/hooks/use-billing';
import { BillingCycleToggle } from '@/components/billing/billing-cycle-toggle';
import { PageSpinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * Fluxberry is paid-only — no free tier. This wraps every product route
 * (not /app/settings/*, since an unpaid owner must still be able to reach
 * billing to subscribe) and shows a locked screen until the workspace has
 * an active subscription.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();
  const { data: status, isLoading, isError, refetch } = useBillingStatus();
  const createCheckout = useCreateCheckout();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');

  if (pathname.startsWith('/app/settings')) return <>{children}</>;

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

  const startSubscription = async () => {
    try {
      const { url } = await createCheckout.mutateAsync({ plan: 'PRO', billingCycle });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <CardTitle className="pt-2">Subscribe to Fluxberry Pro</CardTitle>
          <CardDescription>
            Your workspace doesn&apos;t have an active subscription. Subscribe to unlock jobs, candidates, and
            everything else in Fluxberry.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {isOwner ? (
            <>
              <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
              <Button loading={createCheckout.isPending} onClick={startSubscription}>
                Start subscription
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only the workspace owner can start a subscription.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
