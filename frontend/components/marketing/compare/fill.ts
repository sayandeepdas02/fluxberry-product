import { PLAN_PRICING } from '@/lib/pricing';

/** Fills `{pro}` and `{max}` in comparison copy with the live monthly prices ("$39"). */
export function fill(text: string): string {
  return text.replace(/\{pro\}/g, `$${PLAN_PRICING.PRO.monthly}`).replace(/\{max\}/g, `$${PLAN_PRICING.MAX.monthly}`);
}
