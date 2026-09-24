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
 * Credit cost of each user-initiated generative-AI action. The automatic
 * per-applicant resume-parse + screening pipeline is intentionally NOT here —
 * it is included in the plan and never debits credits (so intake never blocks).
 * Starting values; tune freely.
 */
export const CREDIT_COSTS = {
  JD_GENERATION: 5,
  /** Per page (25 results) of a Talent Sourcing search. */
  SOURCING_SEARCH: 10,
  /** Per contact enriched from a sourcing result. */
  SOURCING_ENRICH: 1,
} as const;
export type CreditAction = keyof typeof CREDIT_COSTS;

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
}
