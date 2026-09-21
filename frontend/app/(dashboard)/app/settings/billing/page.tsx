'use client';

import { useEffect, useRef } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { WORKSPACE_PLANS, PLAN_FEATURES } from '@/lib/shared';
import type { WorkspacePlan } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useBillingStatus, useCreateCheckout, useCreatePortalSession } from '@/hooks/use-billing';
import { FEATURE_FLAG_LABELS } from '@/lib/labels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';

const PLAN_LABELS: Record<WorkspacePlan, string> = { FREE: 'Free', PRO: 'Pro' };
const PLAN_PRICE: Record<WorkspacePlan, string> = { FREE: '$0', PRO: '$40/mo' };

export default function BillingSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const canManage = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';
  const isOwner = currentWorkspace.role === 'owner';

  const { data: status, isLoading } = useBillingStatus();
  const createCheckout = useCreateCheckout();
  const createPortal = useCreatePortalSession();

  // One-time toast for the ?checkout=success|cancel redirect back from Dodo.
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') toast.success('Upgrade complete — welcome to Pro');
    else if (checkout === 'cancel') toast.error('Checkout canceled');
    if (checkout) {
      params.delete('checkout');
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    }
  }, []);

  const upgrade = async () => {
    try {
      const { url } = await createCheckout.mutateAsync({ plan: 'PRO' });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
    }
  };

  const openPortal = async () => {
    try {
      const { url } = await createPortal.mutateAsync();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="sr-only">Billing</h2>
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !status ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant={status.plan === 'PRO' ? 'primary' : 'muted'} className="text-sm">
                  {PLAN_LABELS[status.plan]}
                </Badge>
                {status.subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive">Payment failed — update your card</Badge>
                )}
                {status.currentPeriodEnd && status.plan === 'PRO' && (
                  <span className="text-sm text-muted-foreground">
                    Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {status.hasBillingAccount && (
                    <Button variant="outline" loading={createPortal.isPending} onClick={openPortal}>
                      Manage billing
                      <ExternalLink className="size-4" />
                    </Button>
                  )}
                  {status.plan === 'FREE' && isOwner && (
                    <Button loading={createCheckout.isPending} onClick={upgrade}>
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          {status?.plan === 'FREE' && !isOwner && canManage && (
            <p className="pt-2 text-xs text-muted-foreground">
              Only the workspace owner can start an upgrade.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {WORKSPACE_PLANS.map((plan) => (
          <Card key={plan} className={plan === status?.plan ? 'border-primary' : undefined}>
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <CardTitle>{PLAN_LABELS[plan]}</CardTitle>
                <span className="text-sm font-medium text-muted-foreground">{PLAN_PRICE[plan]}</span>
              </div>
              <CardDescription>
                {plan === status?.plan ? 'Your current plan' : plan === 'PRO' ? 'For growing teams' : 'To get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {PLAN_FEATURES[plan].map((flag) => (
                  <li key={flag} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-success" />
                    {FEATURE_FLAG_LABELS[flag]}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
