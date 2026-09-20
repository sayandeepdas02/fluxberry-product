import type { Condition } from '../shared';

export type WorkflowContext = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function looseEq(a: unknown, b: unknown): boolean {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }
  return a === b;
}

/**
 * Evaluate a structured workflow condition against the run context.
 * Only allow-listed fields/operators — never eval user input (spec §97).
 * A missing value fails numeric comparisons (candidate does not qualify).
 */
export function evaluateCondition(cond: Condition, ctx: WorkflowContext): boolean {
  const actual = ctx[cond.field];
  switch (cond.op) {
    case 'gte': return num(actual) >= num(cond.value);
    case 'lte': return num(actual) <= num(cond.value);
    case 'gt': return num(actual) > num(cond.value);
    case 'lt': return num(actual) < num(cond.value);
    case 'eq': return looseEq(actual, cond.value);
    case 'neq': return !looseEq(actual, cond.value);
    default: return false;
  }
}
