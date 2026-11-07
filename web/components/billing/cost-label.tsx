import { Sparkles } from 'lucide-react';
import { creditsFor, type CreditAction } from '@/lib/shared';
import { cn } from '@/lib/utils';

/** "1 credit" / "38 credits". */
export function creditsText(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? 'credit' : 'credits'}`;
}

/** Credits an action will cost, from the shared price catalog (same math the server charges). */
export function costOf(action: CreditAction, quantity = 1): number {
  return creditsFor(action, quantity);
}

/**
 * Inline cost hint for a button that spends AI credits, e.g.
 * `<Button>Enrich profile <CostLabel action="PROFILE_ENRICH" /></Button>`.
 * Pass `upTo` when the real charge can come in lower (e.g. a sourcing page
 * only bills profiles that are new to the workspace).
 */
export function CostLabel({
  action,
  quantity = 1,
  upTo = false,
  className,
}: {
  action: CreditAction;
  quantity?: number;
  upTo?: boolean;
  className?: string;
}) {
  const n = costOf(action, quantity);
  if (n === 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-normal opacity-80', className)}>
      <Sparkles className="size-3" aria-hidden />
      {upTo ? `up to ${creditsText(n)}` : creditsText(n)}
    </span>
  );
}
