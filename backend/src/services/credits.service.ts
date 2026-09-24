import type { WorkspacePlan, CreditsDto, CreditAction, CreditTransactionReason } from '../shared';
import { PLAN_CREDIT_ALLOWANCE, CREDIT_COSTS } from '../shared';
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

function toDto(account: AccountDoc): CreditsDto {
  const c = account.credits ?? { allowanceRemaining: 0, allowancePerPeriod: 0, purchasedBalance: 0, periodResetAt: null };
  return {
    allowanceRemaining: c.allowanceRemaining ?? 0,
    allowancePerPeriod: c.allowancePerPeriod ?? 0,
    purchasedBalance: c.purchasedBalance ?? 0,
    total: (c.allowanceRemaining ?? 0) + (c.purchasedBalance ?? 0),
    periodResetAt: c.periodResetAt ? new Date(c.periodResetAt).toISOString() : null,
  };
}

export const creditsService = {
  /**
   * Read the account's balance, lazily resetting the monthly allowance first if
   * the period has elapsed (a fallback for a late/missing renewal webhook). The
   * reset is atomic and recorded once per period in the ledger.
   */
  async getBalance(accountId: string): Promise<CreditsDto> {
    let account = await creditsRepo.findAccount(accountId);
    if (!account) throw notFound('Account not found');

    const c = account.credits;
    if (c?.periodResetAt && Date.now() >= new Date(c.periodResetAt).getTime()) {
      const currentResetAt = new Date(c.periodResetAt);
      const nextResetAt = nextMonthlyReset(currentResetAt);
      const updated = await creditsRepo.resetAllowanceIfDue(
        accountId,
        c.allowancePerPeriod ?? 0,
        currentResetAt,
        nextResetAt,
      );
      if (updated) {
        account = updated;
        await this.recordLedger(accountId, {
          delta: (updated.credits?.allowanceRemaining ?? 0) - (c.allowanceRemaining ?? 0),
          reason: 'RESET',
          balanceAfter: (updated.credits?.allowanceRemaining ?? 0) + (updated.credits?.purchasedBalance ?? 0),
          idempotencyKey: `reset-${accountId}-${currentResetAt.toISOString()}`,
        });
      } else {
        // Another request reset it first — re-read for the fresh balance.
        account = (await creditsRepo.findAccount(accountId)) ?? account;
      }
    }
    return toDto(account);
  },

  /**
   * (Re)grant a plan's monthly allowance and anchor the reset to the period end.
   * Called on subscription activate/renew/downgrade. Idempotent per event key.
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
      balanceAfter: (updated.credits?.allowanceRemaining ?? 0) + (updated.credits?.purchasedBalance ?? 0),
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
      balanceAfter: (updated.credits?.allowanceRemaining ?? 0) + (updated.credits?.purchasedBalance ?? 0),
      idempotencyKey,
      meta,
    });
  },

  /**
   * Debit credits for a user-initiated AI action. Atomically spends allowance
   * first, then purchased; throws INSUFFICIENT_CREDITS if the pool is short.
   * Returns the resulting balance so callers can echo it to the client.
   */
  async consume(accountId: string, action: CreditAction, idempotencyKey?: string): Promise<CreditsDto> {
    const amount = CREDIT_COSTS[action];
    const updated = await creditsRepo.consume(accountId, amount);
    if (!updated) {
      const account = await creditsRepo.findAccount(accountId);
      const available = (account?.credits?.allowanceRemaining ?? 0) + (account?.credits?.purchasedBalance ?? 0);
      throw insufficientCredits(action, amount, available);
    }
    await this.recordLedger(accountId, {
      delta: -amount,
      reason: 'CONSUME',
      feature: action,
      balanceAfter: (updated.credits?.allowanceRemaining ?? 0) + (updated.credits?.purchasedBalance ?? 0),
      idempotencyKey: idempotencyKey ?? null,
    });
    return toDto(updated);
  },

  /** Return credits after a debited action failed (e.g. the AI provider errored). */
  async refund(accountId: string, action: CreditAction, meta?: Record<string, unknown>): Promise<void> {
    const amount = CREDIT_COSTS[action];
    const updated = await creditsRepo.refundToAllowance(accountId, amount);
    if (!updated) return;
    await this.recordLedger(accountId, {
      delta: amount,
      reason: 'REFUND',
      feature: action,
      balanceAfter: (updated.credits?.allowanceRemaining ?? 0) + (updated.credits?.purchasedBalance ?? 0),
    });
  },

  async history(accountId: string, limit = 50) {
    return creditsRepo.listTransactions(accountId, limit);
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
