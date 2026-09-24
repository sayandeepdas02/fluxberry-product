'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/use-billing';
import { cn } from '@/lib/utils';

/**
 * Compact AI-credit balance for the sidebar footer. Links to billing where the
 * user can see the breakdown and buy more. Amber when the pool is running low.
 */
export function CreditMeter() {
  const { credits, isLoading } = useCredits();
  if (isLoading || !credits) return null;

  const total = credits.total;
  const low = total <= 25;

  return (
    <Link
      href="/app/settings/billing"
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      title="AI credits — click to manage"
    >
      <Sparkles className={cn('size-4 shrink-0', low ? 'text-amber-500' : 'text-primary')} />
      <span className="flex-1">AI credits</span>
      <span className={cn('tabular-nums text-xs font-semibold', low ? 'text-amber-600' : 'text-foreground')}>
        {total.toLocaleString()}
      </span>
    </Link>
  );
}
