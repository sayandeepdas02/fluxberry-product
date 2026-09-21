'use client';

import { cn } from '@/lib/utils';
import type { BillingCycle } from '@/lib/shared';

const OPTIONS: { value: BillingCycle; label: string; price: string }[] = [
  { value: 'MONTHLY', label: 'Monthly', price: '$40/mo' },
  { value: 'ANNUAL', label: 'Annual', price: '$200/yr — save $280' },
];

export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-input p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label} <span className="opacity-80">{opt.price}</span>
        </button>
      ))}
    </div>
  );
}
