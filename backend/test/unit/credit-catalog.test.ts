import { describe, it, expect } from 'vitest';
import {
  CREDIT_CATALOG,
  CREDIT_VALUE_USD,
  TARGET_MARKUP,
  CREDIT_PACKS,
  PLAN_CREDIT_ALLOWANCE,
  creditsFor,
  type CreditAction,
} from '../../src/shared';

const actions = Object.keys(CREDIT_CATALOG) as CreditAction[];

describe('credit catalog — 3× margin guard', () => {
  it.each(actions)('%s charges at least TARGET_MARKUP × its provider cost', (action) => {
    const { creditsPerUnit, providerCostUsd } = CREDIT_CATALOG[action];
    // Compare in integer micro-dollars so float noise can't flip the result.
    const revenueMicros = Math.round(creditsPerUnit * CREDIT_VALUE_USD * 1e6);
    const floorMicros = Math.round(TARGET_MARKUP * providerCostUsd * 1e6);
    expect(revenueMicros).toBeGreaterThanOrEqual(floorMicros);
  });

  it('values a credit at or below every way one is actually bought', () => {
    for (const pack of CREDIT_PACKS) expect(pack.priceUsd / pack.credits).toBeGreaterThanOrEqual(CREDIT_VALUE_USD);
    // Plan allowances, valued at the plan's monthly price ($39 Pro, $59 Max).
    expect(39 / PLAN_CREDIT_ALLOWANCE.PRO).toBeGreaterThanOrEqual(CREDIT_VALUE_USD);
    expect(59 / PLAN_CREDIT_ALLOWANCE.MAX).toBeGreaterThanOrEqual(CREDIT_VALUE_USD);
  });
});

describe('creditsFor', () => {
  it('rounds up per charge and never charges for zero units', () => {
    expect(creditsFor('SOURCING_PROFILE', 0)).toBe(0);
    expect(creditsFor('SOURCING_PROFILE', 1)).toBe(2);
    expect(creditsFor('SOURCING_PROFILE', 25)).toBe(38);
    expect(creditsFor('SOURCING_PROFILE', 50)).toBe(75);
  });

  it('bills outreach at 1 credit per 25 recipients without float drift', () => {
    expect(creditsFor('OUTREACH_EMAIL', 1)).toBe(1);
    expect(creditsFor('OUTREACH_EMAIL', 25)).toBe(1);
    expect(creditsFor('OUTREACH_EMAIL', 26)).toBe(2);
    expect(creditsFor('OUTREACH_EMAIL', 250)).toBe(10);
  });

  it('prices the flat actions', () => {
    expect(creditsFor('PROFILE_ENRICH', 1)).toBe(9);
    expect(creditsFor('COMPENSATION_LOOKUP', 1)).toBe(1);
    expect(creditsFor('JD_GENERATION', 1)).toBe(1);
    expect(creditsFor('OUTREACH_DRAFT', 1)).toBe(1);
    expect(creditsFor('APPLICANT_SCREENING', 1)).toBe(1);
  });
});
