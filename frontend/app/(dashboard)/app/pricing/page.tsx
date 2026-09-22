'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useCreateCheckout } from '@/hooks/use-billing';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';

const PRO_FEATURES = [
  'Unlimited job posts',
  'Unlimited candidates',
  'AI applicant scoring',
  'Custom pipeline stages',
  'Application forms',
  'Team collaboration',
  'Advanced analytics',
  'Bulk candidate import',
  'GDPR tools',
  'Outbound webhooks',
];

export default function PricingPage() {
  const { currentWorkspace } = useWorkspace();
  const isOwner = currentWorkspace.role === 'owner';
  const monthlyCheckout = useCreateCheckout();
  const annualCheckout = useCreateCheckout();

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

  const startCheckout = async (billingCycle: 'MONTHLY' | 'ANNUAL') => {
    const mutation = billingCycle === 'MONTHLY' ? monthlyCheckout : annualCheckout;
    try {
      const { url } = await mutation.mutateAsync({ plan: 'PRO', billingCycle });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Simple plans. Everything you need.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The best investment for hiring the best talent. Select the one which suits you.
        </p>
      </div>

      {isOwner ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PricingCard
            label="Monthly"
            price="40"
            period="/ month"
            features={PRO_FEATURES}
            filled
            loading={monthlyCheckout.isPending}
            onSelect={() => startCheckout('MONTHLY')}
          />
          <PricingCard
            label="Annual"
            price="200"
            period="/ year"
            discount="58%"
            featured
            features={PRO_FEATURES}
            loading={annualCheckout.isPending}
            onSelect={() => startCheckout('ANNUAL')}
          />
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Only the workspace owner can start a subscription.
        </p>
      )}
    </div>
  );
}

function PricingCard({
  label,
  price,
  period,
  features,
  discount,
  featured = false,
  filled = false,
  loading,
  onSelect,
}: {
  label: string;
  price: string;
  period: string;
  features: string[];
  discount?: string;
  featured?: boolean;
  filled?: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-6',
        featured ? 'border-primary bg-primary text-white' : 'border-border bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className={cn('text-base font-semibold', featured ? 'text-white' : 'text-foreground')}>
          {label}
        </h2>
        {featured && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">
            Most Recommended
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className={cn('mb-1 text-xl', featured ? 'text-white/60' : 'text-muted-foreground')}>$</span>
        <span className={cn('text-5xl font-semibold leading-none tracking-tight', featured ? 'text-white' : 'text-foreground')}>
          {price}
        </span>
        <span className={cn('mb-1 text-sm', featured ? 'text-white/60' : 'text-muted-foreground')}>{period}</span>
        {discount && (
          <span className="mb-1 ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
            {discount} off
          </span>
        )}
      </div>

      <div className={cn('my-5 border-t', featured ? 'border-white/20' : 'border-border')} />
      <p className={cn('mb-3 font-mono text-[11px] uppercase tracking-[0.08em]', featured ? 'text-white/60' : 'text-muted-foreground')}>
        Includes
      </p>

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
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
          featured
            ? 'bg-white text-primary hover:bg-white/90'
            : filled
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border text-foreground hover:bg-accent',
        )}
      >
        {loading ? 'Redirecting…' : 'Get started'}
        {!loading && <span aria-hidden>→</span>}
      </button>
    </div>
  );
}
