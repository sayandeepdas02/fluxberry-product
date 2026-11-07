'use client';

import { ArrowUpRight, CalendarDays, Check, Crown, Loader2 } from 'lucide-react';
import { PLAN_CREDIT_ALLOWANCE, PLAN_SCREENING_QUOTA, type BillingStatusDto, type BillingSubscriptionStatus } from '@/lib/shared';
import { useBillingStatus, useCreatePortalSession } from '@/hooks/use-billing';
import { PLAN_LABELS, PLAN_PRICING } from '@/lib/pricing';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Chip, FIGURE, Panel, PanelHeader, formatDate } from './billing-ui';

const STATUS: Partial<Record<BillingSubscriptionStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'gray' }>> = {
  active: { label: 'Active', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  on_hold: { label: 'On hold', tone: 'red' },
  past_due: { label: 'Payment failed', tone: 'red' },
  failed: { label: 'Payment failed', tone: 'red' },
  paused: { label: 'Paused', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  expired: { label: 'Expired', tone: 'gray' },
};

const NEEDS_PAYMENT: BillingSubscriptionStatus[] = ['on_hold', 'past_due', 'failed'];
const ENDING: BillingSubscriptionStatus[] = ['cancelled', 'expired'];

function priceLine(status: BillingStatusDto): string {
  if (status.plan === 'FREE' || !status.billingCycle) return 'No active subscription';
  const { monthly, annual } = PLAN_PRICING[status.plan];
  return status.billingCycle === 'ANNUAL' ? `$${annual} per year, billed yearly` : `$${monthly} per month, billed monthly`;
}

/**
 * The account's plan, its status, price and renewal date, with a way into the
 * billing provider's portal. Owners and admins only (billing status is
 * admin-gated), so the parent decides whether to render it.
 */
export function CurrentPlanCard({ className }: { className?: string }) {
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

  const chip = status ? STATUS[status.subscriptionStatus] : undefined;
  const paid = status && status.plan !== 'FREE';

  return (
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader
        icon={Crown}
        title="Current plan"
        aside={
          status?.hasBillingAccount && (
            <button
              type="button"
              onClick={openPortal}
              disabled={createPortal.isPending}
              className="-mr-2 inline-flex items-center gap-1 rounded-full px-2 py-1 font-manrope text-[13px] font-semibold text-lp-blue-600 outline-none transition-colors hover:bg-lp-blue-50 focus-visible:ring-2 focus-visible:ring-lp-blue-400 disabled:opacity-60"
            >
              Manage billing
              {createPortal.isPending ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2.25} />
              )}
            </button>
          )
        }
      />

      {isLoading || !status ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={cn(FIGURE, 'text-[34px]')}>
              {PLAN_LABELS[status.plan]}
            </p>
            {paid && chip && (
              <Chip tone={chip.tone} dot>
                {chip.label}
              </Chip>
            )}
          </div>
          <p className="mt-2.5 font-inter text-[15px] text-lp-gray-700">{priceLine(status)}</p>

          {paid && (
            <div className="mt-6">
              <p className="font-inter text-[12px] font-medium text-lp-gray-500">Included every month</p>
              <ul className="mt-2.5 space-y-2 font-inter text-[14px] text-lp-gray-700">
                {[
                  [PLAN_CREDIT_ALLOWANCE[status.plan], 'AI credits'],
                  [PLAN_SCREENING_QUOTA[status.plan], 'applicant screenings'],
                ].map(([n, what]) => (
                  <li key={what} className="flex items-center gap-2">
                    <Check aria-hidden className="size-4 shrink-0 text-lp-blue-500" strokeWidth={2.5} />
                    <span>
                      <span className="font-medium tabular-nums text-black">{n.toLocaleString()}</span> {what}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {paid && NEEDS_PAYMENT.includes(status.subscriptionStatus) && (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 font-inter text-[13px] leading-5 text-red-700">
              Your last payment didn&apos;t go through. Update your card in Manage billing to keep your plan.
            </p>
          )}

          {/* Pinned to the card's foot, level with the credits card beside it. */}
          {paid && status.currentPeriodEnd && (
            <div className="mt-auto pt-6">
              <p className="flex items-center gap-2 border-t border-lp-gray-100 pt-4 font-inter text-[13px] text-lp-gray-600">
                <CalendarDays aria-hidden className="size-4 text-lp-gray-400" />
                {ENDING.includes(status.subscriptionStatus) ? 'Access ends' : 'Renews'} on {formatDate(status.currentPeriodEnd)}
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
