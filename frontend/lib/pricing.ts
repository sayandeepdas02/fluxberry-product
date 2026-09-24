import type { WorkspacePlan, BillingCycle } from '@/lib/shared';
import { PLAN_CREDIT_ALLOWANCE } from '@/lib/shared';

/** Human labels for each plan. */
export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  MAX: 'Max',
};

/** Purchasable plans and their prices (USD). Single source of truth for every pricing surface. */
export const PLAN_PRICING: Record<'PRO' | 'MAX', { monthly: number; annual: number }> = {
  PRO: { monthly: 40, annual: 200 },
  MAX: { monthly: 60, annual: 300 },
};

/** Percentage saved by paying annually vs 12× monthly, per plan (rounded). */
export function annualDiscount(plan: 'PRO' | 'MAX'): number {
  const { monthly, annual } = PLAN_PRICING[plan];
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

/** Compact price label for a plan + cycle, e.g. "$40/mo" or "$200/yr". */
export function priceLabel(plan: WorkspacePlan, cycle: BillingCycle): string {
  if (plan === 'FREE') return '$0';
  const p = PLAN_PRICING[plan];
  return cycle === 'ANNUAL' ? `$${p.annual}/yr` : `$${p.monthly}/mo`;
}

export const PLAN_TAGLINE: Record<'PRO' | 'MAX', string> = {
  PRO: 'Everything you need to hire',
  MAX: 'Pro, plus outbound sourcing & referrals',
};

/** Features shown on the Pro card. */
export const PRO_FEATURES: string[] = [
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
  `${PLAN_CREDIT_ALLOWANCE.PRO} AI credits / month`,
];

/** Max = everything in Pro, plus the Max-only features and a bigger credit allowance. */
export const MAX_EXTRA_FEATURES: string[] = [
  'Talent Sourcing (outbound)',
  'Employee referrals',
  `${PLAN_CREDIT_ALLOWANCE.MAX} AI credits / month`,
];

export const MAX_FEATURES: string[] = [
  'Everything in Pro',
  ...MAX_EXTRA_FEATURES,
];
