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
  PRO: { monthly: 39, annual: 199 },
  MAX: { monthly: 59, annual: 299 },
};

/** Percentage saved by paying annually vs 12× monthly, per plan (rounded). */
export function annualDiscount(plan: 'PRO' | 'MAX'): number {
  const { monthly, annual } = PLAN_PRICING[plan];
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

/** The best annual saving across plans, for the billing-cycle toggle ("Save up to 58%"). */
export function maxAnnualDiscount(): number {
  return Math.max(annualDiscount('PRO'), annualDiscount('MAX'));
}

/** Compact price label for a plan + cycle, e.g. "$39/mo" or "$199/yr". */
export function priceLabel(plan: WorkspacePlan, cycle: BillingCycle): string {
  if (plan === 'FREE') return '$0';
  const p = PLAN_PRICING[plan];
  return cycle === 'ANNUAL' ? `$${p.annual}/yr` : `$${p.monthly}/mo`;
}

export const PLAN_TAGLINE: Record<'PRO' | 'MAX', string> = {
  PRO: 'Perfect For Small Teams',
  MAX: 'For growing teams and startups',
};

/**
 * What each plan includes, as listed on every pricing surface. Max builds on
 * Pro, so its list opens with "Everything in Pro" and adds only what's new.
 */
export const PLAN_FEATURES: Record<'PRO' | 'MAX', string[]> = {
  PRO: [
    'Job board',
    'Applicant Tracking System (ATS)',
    'Custom Careers Page',
    'Analytics',
    `${PLAN_CREDIT_ALLOWANCE.PRO} AI Credits`,
    'Unlimited Team Members',
    'Unlimited Candidates',
  ],
  MAX: [
    'Everything in Pro',
    'Talent Sourcing (TalentGPT / Outbound)',
    'Candidate Referrals',
    `${PLAN_CREDIT_ALLOWANCE.MAX} AI Credits`,
    'Priority support',
  ],
};

export const PRO_FEATURES: string[] = PLAN_FEATURES.PRO;

export const MAX_FEATURES: string[] = PLAN_FEATURES.MAX;
