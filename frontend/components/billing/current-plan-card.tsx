'use client';

import { ExternalLink } from 'lucide-react';
import { useBillingStatus, useCreatePortalSession } from '@/hooks/use-billing';
import { PLAN_LABELS, priceLabel } from '@/lib/pricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';

/**
 * The account's plan, billing cycle and renewal date, with a button into the
 * billing provider's portal. Owners and admins only (billing status is
 * admin-gated), so the parent decides whether to render it.
 */
export function CurrentPlanCard() {
  const { data: status, isLoading } = useBillingStatus();
  const createPortal = useCreatePortalSession();

  const openPortal = async () => {
    try {
      const { url } = await createPortal.mutateAsync();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current plan</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !status ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={status.plan === 'FREE' ? 'muted' : 'primary'} className="text-sm">
                {PLAN_LABELS[status.plan]}
              </Badge>
              {status.plan !== 'FREE' && status.billingCycle && (
                <span className="text-sm text-muted-foreground">
                  {status.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} — {priceLabel(status.plan, status.billingCycle)}
                </span>
              )}
              {status.subscriptionStatus === 'past_due' && (
                <Badge variant="destructive">Payment failed — update your card</Badge>
              )}
              {status.currentPeriodEnd && status.plan !== 'FREE' && (
                <span className="text-sm text-muted-foreground">
                  Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            {status.hasBillingAccount && (
              <Button variant="outline" loading={createPortal.isPending} onClick={openPortal}>
                Manage billing
                <ExternalLink className="size-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
