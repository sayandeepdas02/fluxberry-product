'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { WorkspacePlan } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useBillingStatus, useCreateCheckout, useCreatePortalSession } from '@/hooks/use-billing';
import { PLAN_LABELS, priceLabel } from '@/lib/pricing';
import { landingFonts } from '@/components/marketing/landing/fonts';
import { BillingSwitch, PlanCard } from '@/components/marketing/landing/pricing-section';
import { CreditUsageCard } from '@/components/billing/credit-usage-card';
import { CreditsCard } from '@/components/billing/credits-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const PAID_PLANS: Array<'PRO' | 'MAX'> = ['PRO', 'MAX'];

export default function BillingSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const canManage = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';
  const isOwner = currentWorkspace.role === 'owner';
  const [yearly, setYearly] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<WorkspacePlan | null>(null);

  const { data: status, isLoading } = useBillingStatus();
  const createCheckout = useCreateCheckout();
  const createPortal = useCreatePortalSession();

  // One-time toast for the ?checkout=success|cancel|credits_success redirect back from Dodo.
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') toast.success('Subscription updated');
    else if (checkout === 'credits_success') toast.success('Credits added to your account');
    else if (checkout === 'cancel') toast.error('Checkout canceled');
    if (checkout) {
      params.delete('checkout');
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    }
  }, []);

  const startCheckout = async (plan: WorkspacePlan) => {
    setPendingPlan(plan);
    try {
      const { url } = await createCheckout.mutateAsync({ plan, billingCycle: yearly ? 'ANNUAL' : 'MONTHLY' });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
      setPendingPlan(null);
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

  const currentPlan = status?.plan ?? 'FREE';

  return (
    <div className="space-y-6">
      <h2 className="sr-only">Billing</h2>

      {/* Current plan */}
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
              {canManage && status.hasBillingAccount && (
                <Button variant="outline" loading={createPortal.isPending} onClick={openPortal}>
                  Manage billing
                  <ExternalLink className="size-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI credits */}
      <CreditsCard canManage={canManage} />
      {canManage && <CreditUsageCard />}

      {/* Plans: the landing page's cards, with checkout buttons. */}
      {isOwner ? (
        <div className={cn(landingFonts, 'space-y-4')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {currentPlan === 'FREE' ? 'Choose a plan' : 'Change plan'}
            </h3>
            <BillingSwitch yearly={yearly} onChange={setYearly} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            {PAID_PLANS.map((plan) => {
              const isCurrent = currentPlan === plan;
              return (
                <PlanCard
                  key={plan}
                  plan={plan}
                  yearly={yearly}
                  reveal={false}
                  action={{
                    label: isCurrent
                      ? 'Current plan'
                      : pendingPlan === plan
                        ? 'Redirecting…'
                        : `Choose ${PLAN_LABELS[plan]}`,
                    onClick: () => startCheckout(plan),
                    disabled: isCurrent || pendingPlan !== null,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only the workspace owner can change the plan.</p>
      )}
    </div>
  );
}
