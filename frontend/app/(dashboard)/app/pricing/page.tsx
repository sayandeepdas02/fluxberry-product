'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingCycle } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useCreateCheckout } from '@/hooks/use-billing';
import { PLAN_LABELS, PLAN_TAGLINE, PRO_FEATURES, MAX_FEATURES, priceLabel, annualDiscount } from '@/lib/pricing';
import { BillingCycleToggle } from '@/components/billing/billing-cycle-toggle';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';

const PAID_PLANS: Array<'PRO' | 'MAX'> = ['PRO', 'MAX'];
const PLAN_FEATURE_COPY: Record<'PRO' | 'MAX', string[]> = { PRO: PRO_FEATURES, MAX: MAX_FEATURES };

export default function PricingPage() {
  const { currentWorkspace } = useWorkspace();
  const isOwner = currentWorkspace.role === 'owner';
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [pendingPlan, setPendingPlan] = useState<'PRO' | 'MAX' | null>(null);
  const checkout = useCreateCheckout();

  // One-time toast for the ?checkout=success|cancel redirect back from Dodo.
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get('checkout');
    if (checkoutParam === 'success') toast.success('Subscription active — welcome aboard');
    else if (checkoutParam === 'cancel') toast.error('Checkout canceled');
    if (checkoutParam) {
      params.delete('checkout');
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    }
  }, []);

  const startCheckout = async (plan: 'PRO' | 'MAX') => {
    setPendingPlan(plan);
    try {
      const { url } = await checkout.mutateAsync({ plan, billingCycle });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
      setPendingPlan(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Simple plans. Everything you need.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The best investment for hiring the best talent. Select the one which suits you.
        </p>
      </div>

      {isOwner ? (
        <>
          <div className="mb-6 flex justify-center">
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PAID_PLANS.map((plan) => (
              <PricingCard
                key={plan}
                plan={plan}
                billingCycle={billingCycle}
                loading={pendingPlan === plan}
                onSelect={() => startCheckout(plan)}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Only the workspace owner can start a subscription.
        </p>
      )}
    </div>
  );
}

function PricingCard({
  plan,
  billingCycle,
  loading,
  onSelect,
}: {
  plan: 'PRO' | 'MAX';
  billingCycle: BillingCycle;
  loading: boolean;
  onSelect: () => void;
}) {
  const featured = plan === 'MAX';
  const discount = billingCycle === 'ANNUAL' ? annualDiscount(plan) : 0;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-6',
        featured ? 'border-primary bg-primary text-white' : 'border-border bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={cn('text-base font-semibold', featured ? 'text-white' : 'text-foreground')}>
            {PLAN_LABELS[plan]}
          </h2>
          <p className={cn('text-xs', featured ? 'text-white/70' : 'text-muted-foreground')}>{PLAN_TAGLINE[plan]}</p>
        </div>
        {featured && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">
            Most powerful
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className={cn('text-5xl font-semibold leading-none tracking-tight', featured ? 'text-white' : 'text-foreground')}>
          {priceLabel(plan, billingCycle).split('/')[0]}
        </span>
        <span className={cn('mb-1 text-sm', featured ? 'text-white/60' : 'text-muted-foreground')}>
          /{billingCycle === 'ANNUAL' ? 'year' : 'month'}
        </span>
        {discount > 0 && (
          <span className="mb-1 ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
            {discount}% off
          </span>
        )}
      </div>

      <div className={cn('my-5 border-t', featured ? 'border-white/20' : 'border-border')} />

      <ul className="flex-1 space-y-2.5">
        {PLAN_FEATURE_COPY[plan].map((f) => (
          <li key={f} className={cn('flex items-center gap-2.5 text-sm', featured ? 'text-white/90' : 'text-foreground/80')}>
            <Check className={cn('size-4 shrink-0', featured ? 'text-white' : 'text-primary')} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={loading}
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60',
          featured ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        {loading ? 'Redirecting…' : `Choose ${PLAN_LABELS[plan]}`}
        {!loading && <span aria-hidden>→</span>}
      </button>
    </div>
  );
}
