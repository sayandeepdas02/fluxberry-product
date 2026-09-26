import type { WorkspacePlan, CreditsDto, CreditAction, CreditTransactionReason, CreditTransactionDto } from '../shared';
import { PLAN_CREDIT_ALLOWANCE, PLAN_SCREENING_QUOTA, CREDIT_CATALOG, creditsFor } from '../shared';
import { credits as creditsRepo } from '../repositories/credits.repository';
import type { AccountDoc } from '../models/account.model';
import { insufficientCredits, notFound } from '../utils/errors';
import { logger } from '../utils/logger';

/** Advance a monthly reset anchor forward by whole months until it's in the future. */
function nextMonthlyReset(from: Date): Date {
  const next = new Date(from);
  const now = Date.now();
  // Guard the loop; a subscription period is ~1 month, so this runs once normally.
  for (let i = 0; i < 120 && next.getTime() <= now; i++) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function totalOf(account: { credits?: { allowanceRemaining?: number | null; purchasedBalance?: number | null } | null } | null): number {
  return (account?.credits?.allowanceRemaining ?? 0) + (account?.credits?.purchasedBalance ?? 0);
}

function toDto(account: AccountDoc): CreditsDto {
  const c = account.credits ?? { allowanceRemaining: 0, allowancePerPeriod: 0, purchasedBalance: 0, periodResetAt: null, screeningsUsed: 0 };
  const plan = (account.plan as WorkspacePlan) ?? 'FREE';
  return {
    allowanceRemaining: c.allowanceRemaining ?? 0,
    allowancePerPeriod: c.allowancePerPeriod ?? 0,
    purchasedBalance: c.purchasedBalance ?? 0,
    total: (c.allowanceRemaining ?? 0) + (c.purchasedBalance ?? 0),
    periodResetAt: c.periodResetAt ? new Date(c.periodResetAt).toISOString() : null,
    screeningsUsed: c.screeningsUsed ?? 0,
    screeningQuota: PLAN_SCREENING_QUOTA[plan] ?? 0,
  };
}

export interface ChargeOptions {
  /** Makes the charge safe to retry: a second call with the same key returns the first result and debits nothing. */
  idempotencyKey?: string;
  /** Who triggered it (shown in usage history); null for system-initiated charges. */
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
}

export interface ChargeResult {
  /** Ledger row id — pass to settle()/refund(). Null when nothing was charged (quantity 0). */
  txId: string | null;
  credits: number;
  balance: number;
  /** True when this call hit an existing idempotency key — nothing new was debited, so don't settle/refund it again. */
  replayed: boolean;
}

type ConsumeMeta = {
  quantity?: number;
  fromAllowance?: number;
  fromPurchased?: number;
  refundedAllowance?: number;
  refundedPurchased?: number;
  periodResetAt?: string | null;
};

export const creditsService = {
  /**
   * Lazily reset the monthly allowance (and screening quota) if the period has
   * elapsed — a fallback for a late/missing renewal webhook. Atomic and recorded
   * once per period in the ledger. Runs before every read AND every spend.
   */
  async ensurePeriodCurrent(accountId: string): Promise<AccountDoc> {
    let account = await creditsRepo.findAccount(accountId);
    if (!account) throw notFound('Account not found');

    const c = account.credits;
    if (c?.periodResetAt && Date.now() >= new Date(c.periodResetAt).getTime()) {
      const currentResetAt = new Date(c.periodResetAt);
      const nextResetAt = nextMonthlyReset(currentResetAt);
      const updated = await creditsRepo.resetAllowanceIfDue(accountId, c.allowancePerPeriod ?? 0, currentResetAt, nextResetAt);
      if (updated) {
        account = updated;
        await this.recordLedger(accountId, {
          delta: (updated.credits?.allowanceRemaining ?? 0) - (c.allowanceRemaining ?? 0),
          reason: 'RESET',
          balanceAfter: totalOf(updated),
          idempotencyKey: `reset-${accountId}-${currentResetAt.toISOString()}`,
        });
      } else {
        // Another request reset it first — re-read for the fresh balance.
        account = (await creditsRepo.findAccount(accountId)) ?? account;
      }
    }
    return account;
  },

  async getBalance(accountId: string): Promise<CreditsDto> {
    return toDto(await this.ensurePeriodCurrent(accountId));
  },

  /**
   * Grant the plan's monthly allowance and anchor the reset to the period end.
   * Callers decide WHEN (a new billing period, a plan change, or a reactivation) —
   * a routine same-period webhook must not refill the allowance. Idempotent per key.
   */
  async grantPlanAllowance(
    accountId: string,
    plan: WorkspacePlan,
    currentPeriodEnd: string | null,
    idempotencyKey: string,
  ): Promise<void> {
    if (await creditsRepo.ledgerExists(idempotencyKey)) return;

    const allowance = PLAN_CREDIT_ALLOWANCE[plan] ?? 0;
    const resetAt = currentPeriodEnd ? new Date(currentPeriodEnd) : nextMonthlyReset(new Date());
    const before = await creditsRepo.findAccount(accountId);
    const beforeRemaining = before?.credits?.allowanceRemaining ?? 0;
    const updated = await creditsRepo.setAllowance(accountId, allowance, resetAt);
    if (!updated) return;

    await this.recordLedger(accountId, {
      delta: allowance - beforeRemaining,
      reason: 'GRANT',
      balanceAfter: totalOf(updated),
      idempotencyKey,
      meta: { plan },
    });
  },

  /** Grant purchased (never-expiring) credits from a top-up pack. Idempotent per event key. */
  async grantPurchase(
    accountId: string,
    amount: number,
    idempotencyKey: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (await creditsRepo.ledgerExists(idempotencyKey)) return;
    const updated = await creditsRepo.addPurchased(accountId, amount);
    if (!updated) {
      logger.warn({ accountId, idempotencyKey }, 'grantPurchase: account not found');
      return;
    }
    await this.recordLedger(accountId, {
      delta: amount,
      reason: 'PURCHASE',
      balanceAfter: totalOf(updated),
      idempotencyKey,
      meta,
    });
  },

  /**
   * Debit credits for `quantity` units of a catalog action (see CREDIT_CATALOG):
   * resets the period if due, then atomically spends allowance first and purchased
   * second. Throws INSUFFICIENT_CREDITS when the pool is short. For variable-cost
   * work, reserve the maximum here and call settle() once the real quantity is known.
   */
  async charge(accountId: string, action: CreditAction, quantity: number, opts: ChargeOptions = {}): Promise<ChargeResult> {
    const amount = creditsFor(action, quantity);
    if (amount === 0) return { txId: null, credits: 0, balance: totalOf(await creditsRepo.findAccount(accountId)), replayed: false };

    if (opts.idempotencyKey) {
      const prior = await creditsRepo.findByKey(opts.idempotencyKey);
      if (prior) return { txId: String(prior._id), credits: -prior.delta, balance: prior.balanceAfter, replayed: true };
    }

    await this.ensurePeriodCurrent(accountId);
    const before = await creditsRepo.consume(accountId, amount);
    if (!before) {
      const account = await creditsRepo.findAccount(accountId);
      throw insufficientCredits(action, amount, totalOf(account));
    }

    const fromAllowance = Math.min(before.credits?.allowanceRemaining ?? 0, amount);
    const fromPurchased = amount - fromAllowance;
    const entry = CREDIT_CATALOG[action];
    try {
      const tx = await creditsRepo.recordTransaction({
        accountId,
        delta: -amount,
        reason: 'CONSUME',
        feature: action,
        balanceAfter: totalOf(before) - amount,
        idempotencyKey: opts.idempotencyKey ?? null,
        meta: {
          ...opts.meta,
          quantity,
          unit: entry.unit,
          providerCostUsd: entry.providerCostUsd,
          fromAllowance,
          fromPurchased,
          refundedAllowance: 0,
          refundedPurchased: 0,
          periodResetAt: before.credits?.periodResetAt ? new Date(before.credits.periodResetAt).toISOString() : null,
          actorUserId: opts.actorUserId ?? null,
        },
      });
      return { txId: String(tx._id), credits: amount, balance: totalOf(before) - amount, replayed: false };
    } catch (err) {
      // Lost an idempotency race to a concurrent identical call: undo our debit
      // exactly and return the winner's result.
      if ((err as { code?: number }).code === 11000 && opts.idempotencyKey) {
        await creditsRepo.restoreBuckets(accountId, fromAllowance, fromPurchased);
        const prior = await creditsRepo.findByKey(opts.idempotencyKey);
        if (prior) return { txId: String(prior._id), credits: -prior.delta, balance: prior.balanceAfter, replayed: true };
      }
      throw err;
    }
  },

  /**
   * Settle a reservation to what was actually used: refunds the difference between
   * the reserved credits and creditsFor(action, actualQuantity). No-op if the real
   * cost is ≥ the reservation (never charges more than was reserved).
   */
  async settle(txId: string | null, actualQuantity: number): Promise<number> {
    if (!txId) return 0;
    const tx = await creditsRepo.findTransaction(txId);
    if (!tx || tx.reason !== 'CONSUME' || !tx.feature) return 0;
    const meta = (tx.meta ?? {}) as ConsumeMeta;
    // Net of what's already been refunded, so settling twice (e.g. two workers
    // finishing a campaign at once) never returns credits twice.
    const net = -tx.delta - (meta.refundedAllowance ?? 0) - (meta.refundedPurchased ?? 0);
    const owed = creditsFor(tx.feature as CreditAction, actualQuantity);
    await creditsRepo.setQuantity(txId, actualQuantity);
    return this.refundAmount(tx, Math.max(0, net - owed));
  },

  /** Refund whatever is left of a charge (e.g. the provider call failed). Safe to call twice. */
  async refund(txId: string | null): Promise<number> {
    if (!txId) return 0;
    const tx = await creditsRepo.findTransaction(txId);
    if (!tx || tx.reason !== 'CONSUME') return 0;
    return this.refundAmount(tx, -tx.delta);
  },

  /**
   * Return `amount` credits of a CONSUME row to the buckets they came from —
   * purchased first (it never expires, so it's the more valuable one to restore),
   * then allowance. Allowance is only restored within the same period; after a
   * reset the allowance was refilled anyway. Returns credits actually refunded.
   */
  async refundAmount(
    tx: { _id: unknown; accountId: unknown; delta: number; feature?: string | null; meta?: unknown },
    amount: number,
  ): Promise<number> {
    const meta = (tx.meta ?? {}) as ConsumeMeta;
    const charged = -tx.delta;
    const already = (meta.refundedAllowance ?? 0) + (meta.refundedPurchased ?? 0);
    const refundable = Math.min(amount, charged - already);
    if (refundable <= 0) return 0;

    const purchasedLeft = (meta.fromPurchased ?? 0) - (meta.refundedPurchased ?? 0);
    const toPurchased = Math.min(refundable, Math.max(0, purchasedLeft));
    const toAllowance = refundable - toPurchased;

    const claimed = await creditsRepo.claimRefund(String(tx._id), toAllowance, toPurchased, charged);
    if (!claimed) return 0; // a concurrent refund got there first

    const accountId = String(tx.accountId);
    const account = await creditsRepo.findAccount(accountId);
    const samePeriod =
      (account?.credits?.periodResetAt ? new Date(account.credits.periodResetAt).toISOString() : null) === (meta.periodResetAt ?? null);
    const allowanceBack = samePeriod ? toAllowance : 0;
    const updated = await creditsRepo.restoreBuckets(accountId, allowanceBack, toPurchased);

    await this.recordLedger(accountId, {
      delta: allowanceBack + toPurchased,
      reason: 'REFUND',
      feature: tx.feature ?? null,
      balanceAfter: totalOf(updated),
      meta: { txId: String(tx._id) },
    });
    return allowanceBack + toPurchased;
  },

  /**
   * Count one applicant against the plan's included AI-screening quota. Returns
   * true if it fit (no credits needed), false once the quota is used up.
   */
  async claimScreeningQuota(accountId: string): Promise<boolean> {
    const account = await this.ensurePeriodCurrent(accountId);
    const quota = PLAN_SCREENING_QUOTA[(account.plan as WorkspacePlan) ?? 'FREE'] ?? 0;
    if (quota <= 0) return false;
    return (await creditsRepo.claimScreening(accountId, quota)) != null;
  },

  /**
   * Usage history, newest first. Refunds are folded into the charge they belong
   * to (a reservation settled down, or a failed call refunded), so each row shows
   * the net cost — a search that surfaced only known people reads "0", not
   * "−38" followed by "+38".
   */
  async history(accountId: string, limit = 50): Promise<CreditTransactionDto[]> {
    const rows = await creditsRepo.listTransactions(accountId, limit * 2);
    const consumeIds = new Set(rows.filter((r) => r.reason === 'CONSUME').map((r) => String(r._id)));
    const latestRefundBalance = new Map<string, number>();
    for (const r of rows) {
      const txId = (r.meta as { txId?: string } | null)?.txId;
      // rows are newest-first, so the first refund seen per charge is the latest.
      if (r.reason === 'REFUND' && txId && !latestRefundBalance.has(txId)) latestRefundBalance.set(txId, r.balanceAfter);
    }
    return rows
      .filter((r) => !(r.reason === 'REFUND' && consumeIds.has(String((r.meta as { txId?: string } | null)?.txId))))
      .slice(0, limit)
      .map((r) => {
        const meta = (r.meta ?? {}) as ConsumeMeta & { unit?: string };
        const id = String(r._id);
        const refunded = r.reason === 'CONSUME' ? (meta.refundedAllowance ?? 0) + (meta.refundedPurchased ?? 0) : 0;
        return {
          id,
          delta: r.delta + refunded,
          reason: r.reason,
          feature: r.feature ?? null,
          quantity: meta.quantity ?? null,
          unit: meta.unit ?? null,
          balanceAfter: latestRefundBalance.get(id) ?? r.balanceAfter,
          createdAt: new Date(r.createdAt as unknown as string).toISOString(),
        };
      });
  },

  /** Write a ledger row; swallow duplicate-key races (idempotency already applied). */
  async recordLedger(
    accountId: string,
    entry: {
      delta: number;
      reason: CreditTransactionReason;
      feature?: string | null;
      balanceAfter: number;
      idempotencyKey?: string | null;
      meta?: unknown;
    },
  ): Promise<void> {
    try {
      await creditsRepo.recordTransaction({ accountId, ...entry });
    } catch (err) {
      // A unique-index violation on idempotencyKey means the row already exists —
      // the balance mutation is the source of truth, so this is a safe no-op.
      if ((err as { code?: number }).code === 11000) return;
      throw err;
    }
  },
};
