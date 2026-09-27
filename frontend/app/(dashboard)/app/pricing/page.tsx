'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useCreateCheckout } from '@/hooks/use-billing';
import { PLAN_LABELS } from '@/lib/pricing';
import { landingFonts } from '@/components/marketing/landing/fonts';
import { SectionHeader, TYPE } from '@/components/marketing/landing/primitives';
import { BillingSwitch, PlanCard } from '@/components/marketing/landing/pricing-section';
import { PRICING_COPY } from '@/components/marketing/landing/content';
import { toast } from '@/components/ui/sonner';

const PAID_PLANS: Array<'PRO' | 'MAX'> = ['PRO', 'MAX'];

/** The landing page's pricing block (header, Monthly/Yearly switch, plan cards) with checkout buttons. */
export default function PricingPage() {
  const { currentWorkspace } = useWorkspace();
  const isOwner = currentWorkspace.role === 'owner';
  const [yearly, setYearly] = useState(false);
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
      const { url } = await checkout.mutateAsync({ plan, billingCycle: yearly ? 'ANNUAL' : 'MONTHLY' });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
      setPendingPlan(null);
    }
  };

  return (
    <div className={cn(landingFonts, 'flex flex-col items-center py-6')}>
      <SectionHeader
        pill={PRICING_COPY.pill}
        title="Simple plans. Everything you need."
        titleAs="h1"
        titleClassName="max-w-[720px]"
        lead={
          <>
            {PRICING_COPY.lead[0]}
            <br />
            {PRICING_COPY.lead[1]}
          </>
        }
      />

      {isOwner ? (
        <>
          <BillingSwitch yearly={yearly} onChange={setYearly} className="mt-10" />
          <div className="mt-10 grid w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            {PAID_PLANS.map((plan) => {
              const isCurrent = currentWorkspace.plan === plan;
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
        </>
      ) : (
        <p className={cn('mt-10 text-lp-gray-700', TYPE.body)}>Only the workspace owner can start a subscription.</p>
      )}
    </div>
  );
}
