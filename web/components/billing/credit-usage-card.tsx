'use client';

import { History } from 'lucide-react';
import { CREDIT_CATALOG, type CreditAction } from '@/lib/shared';
import { useCreditHistory } from '@/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Aside, Panel, PanelHeader } from './billing-ui';

const REASON_LABELS: Record<string, string> = {
  GRANT: 'Monthly allowance',
  RESET: 'Allowance reset',
  PURCHASE: 'Top-up purchase',
  REFUND: 'Refund',
  CONSUME: 'Spent',
};

function labelFor(feature: string | null, reason: string): string {
  if (feature && feature in CREDIT_CATALOG) return CREDIT_CATALOG[feature as CreditAction].label;
  return REASON_LABELS[reason] ?? reason;
}

/** Recent changes to the account's credit balance (owners and admins). */
export function CreditUsageCard({ className }: { className?: string }) {
  const { data, isLoading } = useCreditHistory();
  const items = data?.items ?? [];

  return (
    <Panel className={className}>
      <PanelHeader icon={History} title="Credit activity" aside={<Aside>Last 50 changes</Aside>} />

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-lp-gray-150 px-6 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-lp-gray-50 text-lp-gray-400">
            <History aria-hidden className="size-5" />
          </span>
          <p className="mt-3 font-manrope text-[15px] font-semibold text-black">No credit activity yet</p>
          <p className="mt-1 font-inter text-[13px] text-lp-gray-500">Credits you spend or top up will show up here.</p>
        </div>
      ) : (
        // The table runs to the card's edges; its cells carry the card's padding.
        <div className="-mx-6 mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] font-inter text-[14px]">
            <caption className="sr-only">Credit activity, newest first</caption>
            <thead>
              <tr className="border-b border-lp-gray-100 text-left text-[12px] text-lp-gray-500">
                <th scope="col" className="px-6 pb-2.5 font-medium">Date</th>
                <th scope="col" className="px-3 pb-2.5 font-medium">Activity</th>
                <th scope="col" className="px-3 pb-2.5 text-right font-medium">Credits</th>
                <th scope="col" className="px-6 pb-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp-gray-100">
              {items.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-6 py-3 text-lp-gray-500">
                    {new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-3 text-black">
                    {t.reason === 'REFUND' ? `Refund · ${labelFor(t.feature, t.reason)}` : labelFor(t.feature, t.reason)}
                    {t.reason === 'CONSUME' && t.quantity != null && t.unit && (
                      <span className="text-lp-gray-500">
                        {' '}
                        · {t.quantity.toLocaleString()} {t.unit}
                        {t.quantity === 1 ? '' : 's'}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-3 text-right font-manrope font-semibold tabular-nums',
                      t.delta < 0 ? 'text-black' : 'text-emerald-600',
                    )}
                  >
                    {t.delta > 0 ? '+' : ''}
                    {t.delta.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-lp-gray-500">
                    {t.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
