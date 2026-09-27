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

/**
 * One row of the plan comparison. `true` = included, `false` = not included
 * (shown crossed out, so buyers see what the next plan adds), a string = the
 * plan's specific amount of it (e.g. its monthly AI credits).
 */
export interface PlanFeatureRow {
  label: string;
  /** Short qualifier shown after the label, e.g. "(outbound)". */
  note?: string;
  /** Unit shown after a per-plan amount, e.g. "/ month". */
  suffix?: string;
  PRO: boolean | string;
  MAX: boolean | string;
}

/** The plan comparison — the single source for every pricing surface. */
export const PLAN_FEATURE_MATRIX: PlanFeatureRow[] = [
  { label: 'Job board', PRO: true, MAX: true },
  { label: 'Applicant tracking system', PRO: true, MAX: true },
  { label: 'Unlimited candidates', PRO: true, MAX: true },
  { label: 'Unlimited team members', PRO: true, MAX: true },
  { label: 'Careers page', PRO: true, MAX: true },
  { label: 'Analytics', PRO: true, MAX: true },
  { label: 'AI credits', suffix: '/ month', PRO: String(PLAN_CREDIT_ALLOWANCE.PRO), MAX: String(PLAN_CREDIT_ALLOWANCE.MAX) },
  { label: 'Talent sourcing', note: '(outbound)', PRO: false, MAX: true },
  { label: 'Candidate referrals', PRO: false, MAX: true },
  { label: '24/7 priority customer support', PRO: false, MAX: true },
];

/** Plain-text line for a row on a given plan, e.g. "250 AI credits / month". */
export function featureText(row: PlanFeatureRow, plan: 'PRO' | 'MAX'): string {
  const value = row[plan];
  if (typeof value === 'string') return [value, row.label, row.suffix].filter(Boolean).join(' ');
  return row.note ? `${row.label} ${row.note}` : row.label;
}

/** Included features as plain lines (for compact check-list surfaces in the app). */
export const PRO_FEATURES: string[] = PLAN_FEATURE_MATRIX.filter((r) => r.PRO !== false).map((r) => featureText(r, 'PRO'));

export const MAX_FEATURES: string[] = PLAN_FEATURE_MATRIX.filter((r) => r.MAX !== false).map((r) => featureText(r, 'MAX'));
