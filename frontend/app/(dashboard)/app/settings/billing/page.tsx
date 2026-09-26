'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import type { WorkspacePlan, BillingCycle } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useBillingStatus, useCreateCheckout, useCreatePortalSession } from '@/hooks/use-billing';
import { PLAN_LABELS, PLAN_TAGLINE, PRO_FEATURES, MAX_FEATURES, priceLabel, annualDiscount } from '@/lib/pricing';
import { BillingCycleToggle } from '@/components/billing/billing-cycle-toggle';
import { CreditUsageCard } from '@/components/billing/credit-usage-card';
import { CreditsCard } from '@/components/billing/credits-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const PAID_PLANS: Array<'PRO' | 'MAX'> = ['PRO', 'MAX'];
const PLAN_FEATURE_COPY: Record<'PRO' | 'MAX', string[]> = { PRO: PRO_FEATURES, MAX: MAX_FEATURES };

export default function BillingSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const canManage = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';
  const isOwner = currentWorkspace.role === 'owner';
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
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
      const { url } = await createCheckout.mutateAsync({ plan, billingCycle });
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

      {/* Plans */}
      {isOwner ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {currentPlan === 'FREE' ? 'Choose a plan' : 'Change plan'}
            </h3>
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PAID_PLANS.map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                billingCycle={billingCycle}
                isCurrent={currentPlan === plan}
                loading={pendingPlan === plan}
                onSelect={() => startCheckout(plan)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only the workspace owner can change the plan.</p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  billingCycle,
  isCurrent,
  loading,
  onSelect,
}: {
  plan: 'PRO' | 'MAX';
  billingCycle: BillingCycle;
  isCurrent: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  const featured = plan === 'MAX';
  const discount = billingCycle === 'ANNUAL' ? annualDiscount(plan) : 0;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-6',
        featured ? 'border-primary' : 'border-border',
        isCurrent && 'ring-1 ring-primary',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">{PLAN_LABELS[plan]}</h4>
          <p className="text-xs text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
        </div>
        {featured && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            Most powerful
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-3xl font-semibold tracking-tight text-foreground">
          {priceLabel(plan, billingCycle).split('/')[0]}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">/{billingCycle === 'ANNUAL' ? 'yr' : 'mo'}</span>
        {discount > 0 && (
          <span className="mb-1 ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            {discount}% off
          </span>
        )}
      </div>

      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {PLAN_FEATURE_COPY[plan].map((f) => (
          <li key={f} className="flex items-center gap-2 text-muted-foreground">
            <Check className={cn('size-4 shrink-0', featured ? 'text-primary' : 'text-success')} />
            {f}
          </li>
        ))}
      </ul>

      <Button
        className="mt-6"
        variant={featured ? 'default' : 'outline'}
        disabled={isCurrent}
        loading={loading}
        onClick={onSelect}
      >
        {isCurrent ? 'Current plan' : `Choose ${PLAN_LABELS[plan]}`}
      </Button>
    </div>
  );
}
