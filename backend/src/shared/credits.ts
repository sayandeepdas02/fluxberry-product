import type { WorkspacePlan } from './enums';

/**
 * Monthly AI-credit allowance granted by each plan, pooled per account (shared
 * by every workspace and member under that subscription). Resets each billing
 * period; unused allowance expires.
 */
export const PLAN_CREDIT_ALLOWANCE: Record<WorkspacePlan, number> = {
  FREE: 0,
  PRO: 250,
  MAX: 500,
};

/**
 * Pricing rule: every paid action charges at least TARGET_MARKUP × what we pay
 * the upstream provider (Monid → Apollo/PDL/Levels.fyi, Anthropic, Resend).
 * A credit is valued at CREDIT_VALUE_USD — below every way a credit is actually
 * bought (Max allowance ≈ $0.12, Pro ≈ $0.16, packs $0.15–$0.24) — so pricing at
 * ⌈3 × cost / $0.10⌉ keeps ≥3× margin on every plan and pack. A unit test
 * (credit-catalog.test.ts) fails CI if any entry drops below that.
 */
export const CREDIT_VALUE_USD = 0.1;
export const TARGET_MARKUP = 3;

export type CreditUnit = 'profile' | 'contact' | 'generation' | 'draft' | 'applicant' | 'email';

export interface CreditCatalogEntry {
  /** What one unit of quantity is. */
  unit: CreditUnit;
  /** Credits per unit; fractional allowed — the total is rounded up per charge. */
  creditsPerUnit: number;
  /** Worst-case upstream cost of one unit, in USD. Update here if a provider reprices. */
  providerCostUsd: number;
  /** Where the cost comes from (for humans + the margin report). */
  provider: string;
  /** Short user-facing label for cost hints and usage history. */
  label: string;
}

export const CREDIT_CATALOG = {
  /** A newly retrieved sourcing profile (Apollo /people/match via Monid). Already-owned profiles are free. */
  SOURCING_PROFILE: { unit: 'profile', creditsPerUnit: 1.5, providerCostUsd: 0.05, provider: 'Apollo people/match (Monid)', label: 'Sourced profiles' },
  /** Explicit "Enrich profile" (PDL person/enrich via Monid); refunded when PDL has no match. */
  PROFILE_ENRICH: { unit: 'contact', creditsPerUnit: 9, providerCostUsd: 0.3, provider: 'PDL person/enrich (Monid)', label: 'Profile enrichment' },
  /** First compensation-band view for a contact (≈3 Levels.fyi calls on a cache miss). */
  COMPENSATION_LOOKUP: { unit: 'contact', creditsPerUnit: 1, providerCostUsd: 0.03, provider: 'Levels.fyi (Monid)', label: 'Compensation estimate' },
  /** Job-description generation (main model, ≤2.2k output tokens). */
  JD_GENERATION: { unit: 'generation', creditsPerUnit: 1, providerCostUsd: 0.024, provider: 'Claude Sonnet 5', label: 'Job description' },
  /** AI outreach draft/refine (main model, ≤800 output tokens). */
  OUTREACH_DRAFT: { unit: 'draft', creditsPerUnit: 1, providerCostUsd: 0.01, provider: 'Claude Sonnet 5', label: 'Outreach AI draft' },
  /** Resume parse + screening for one applicant beyond the plan quota, or a manual re-screen (fast model). */
  APPLICANT_SCREENING: { unit: 'applicant', creditsPerUnit: 1, providerCostUsd: 0.021, provider: 'Claude Haiku 4.5', label: 'Applicant AI screening' },
  /** One outreach campaign email (1 credit per 25 recipients). */
  OUTREACH_EMAIL: { unit: 'email', creditsPerUnit: 0.04, providerCostUsd: 0.001, provider: 'Resend', label: 'Outreach emails' },
} as const satisfies Record<string, CreditCatalogEntry>;
export type CreditAction = keyof typeof CREDIT_CATALOG;

/**
 * Credits charged for `quantity` units of `action`: rounded up, minimum 1 for
 * any non-zero quantity, and 0 for zero (e.g. a search that surfaced no new profiles).
 */
export function creditsFor(action: CreditAction, quantity: number): number {
  if (quantity <= 0) return 0;
  // Round to 6dp first so float noise (0.04 × 25 = 1.0000000000000002) can't bump a whole credit.
  return Math.max(1, Math.ceil(Number((quantity * CREDIT_CATALOG[action].creditsPerUnit).toFixed(6))));
}

/**
 * AI-screened applicants included per billing period before each one draws
 * APPLICANT_SCREENING credits. Past the quota with no credits, applications are
 * still accepted — they wait unscored ("awaiting credits"), never blocked.
 */
export const PLAN_SCREENING_QUOTA: Record<WorkspacePlan, number> = {
  FREE: 0,
  PRO: 300,
  MAX: 750,
};

/** Max outreach campaign emails an account may send per day (sender-reputation guard). */
export const PLAN_DAILY_OUTREACH_CAP: Record<WorkspacePlan, number> = {
  FREE: 0,
  PRO: 200,
  MAX: 1000,
};

/** Buyable top-up packs. `id` is round-tripped through Dodo metadata onto the webhook. */
export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
}
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_250', credits: 250, priceUsd: 60 },
  { id: 'pack_500', credits: 500, priceUsd: 90 },
  { id: 'pack_1000', credits: 1000, priceUsd: 150 },
];

export function findCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** Credit balance snapshot returned to the client (part of BillingStatusDto). */
export interface CreditsDto {
  /** Monthly allowance left this period. */
  allowanceRemaining: number;
  /** The plan's per-period allowance (0 on FREE). */
  allowancePerPeriod: number;
  /** Never-expiring purchased top-up balance. */
  purchasedBalance: number;
  /** allowanceRemaining + purchasedBalance — what a spend actually draws from. */
  total: number;
  /** When the allowance next resets (ISO), or null if no subscription period yet. */
  periodResetAt: string | null;
  /** AI-screened applicants used / included this period. */
  screeningsUsed: number;
  screeningQuota: number;
}

/** One ledger row as shown in usage history. */
export interface CreditTransactionDto {
  id: string;
  delta: number;
  reason: string;
  feature: string | null;
  quantity: number | null;
  unit: string | null;
  balanceAfter: number;
  createdAt: string;
}
