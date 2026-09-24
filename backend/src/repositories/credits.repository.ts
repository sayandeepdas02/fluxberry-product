import { AccountModel, type AccountDoc } from '../models/account.model';
import { CreditTransactionModel, type CreditTransactionDoc } from '../models/credit-transaction.model';
import type { CreditTransactionReason } from '../shared';

/**
 * Persistence for the AI-credits balance. All mutations are atomic
 * `findOneAndUpdate`s so concurrent AI actions can't oversell the balance; the
 * service layer wraps these with the append-only ledger for idempotency + audit.
 */
export const credits = {
  /**
   * Atomically debit `amount`, spending the monthly allowance first and the
   * never-expiring purchased bucket second. The `$expr` guard fails the update
   * (returns null) when the combined balance is short, so purchased can never go
   * negative and the caller can surface INSUFFICIENT_CREDITS. Returns the updated
   * account on success, null on insufficient funds.
   */
  consume: (accountId: string, amount: number) =>
    AccountModel.findOneAndUpdate(
      {
        _id: accountId,
        $expr: {
          $gte: [{ $add: ['$credits.allowanceRemaining', '$credits.purchasedBalance'] }, amount],
        },
      },
      [
        {
          $set: {
            // overflow = the part of `amount` the allowance can't cover.
            'credits.allowanceRemaining': {
              $max: [0, { $subtract: ['$credits.allowanceRemaining', amount] }],
            },
            'credits.purchasedBalance': {
              $subtract: [
                '$credits.purchasedBalance',
                { $max: [0, { $subtract: [amount, '$credits.allowanceRemaining'] }] },
              ],
            },
          },
        },
      ],
      { new: true },
    ),

  /** Add to the never-expiring purchased bucket (top-up packs). */
  addPurchased: (accountId: string, amount: number) =>
    AccountModel.findByIdAndUpdate(accountId, { $inc: { 'credits.purchasedBalance': amount } }, { new: true }),

  /** Return credits to the allowance bucket (e.g. an AI call failed after the debit). */
  refundToAllowance: (accountId: string, amount: number) =>
    AccountModel.findByIdAndUpdate(accountId, { $inc: { 'credits.allowanceRemaining': amount } }, { new: true }),

  /**
   * Set the monthly allowance to `allowancePerPeriod` and record the next reset
   * date. Used on plan activation/renewal (the authoritative grant from Dodo).
   */
  setAllowance: (accountId: string, allowancePerPeriod: number, periodResetAt: Date | null) =>
    AccountModel.findByIdAndUpdate(
      accountId,
      {
        $set: {
          'credits.allowanceRemaining': allowancePerPeriod,
          'credits.allowancePerPeriod': allowancePerPeriod,
          'credits.periodResetAt': periodResetAt,
        },
      },
      { new: true },
    ),

  /**
   * Lazy monthly reset: restore the allowance to `allowancePerPeriod` and move
   * the anchor forward — but only if `periodResetAt` still equals `currentResetAt`,
   * so exactly one concurrent reader performs the reset (the rest get null).
   */
  resetAllowanceIfDue: (
    accountId: string,
    allowancePerPeriod: number,
    currentResetAt: Date,
    nextResetAt: Date,
  ) =>
    AccountModel.findOneAndUpdate(
      { _id: accountId, 'credits.periodResetAt': currentResetAt },
      {
        $set: {
          'credits.allowanceRemaining': allowancePerPeriod,
          'credits.periodResetAt': nextResetAt,
        },
      },
      { new: true },
    ),

  findAccount: (accountId: string) => AccountModel.findById(accountId),

  // ---- Ledger --------------------------------------------------------------

  ledgerExists: async (idempotencyKey: string) =>
    (await CreditTransactionModel.exists({ idempotencyKey })) != null,

  recordTransaction: (data: {
    accountId: string;
    delta: number;
    reason: CreditTransactionReason;
    feature?: string | null;
    balanceAfter: number;
    idempotencyKey?: string | null;
    meta?: unknown;
  }) => CreditTransactionModel.create(data),

  listTransactions: (accountId: string, limit = 50) =>
    CreditTransactionModel.find({ accountId }).sort({ createdAt: -1 }).limit(limit).lean(),
};

export type { AccountDoc, CreditTransactionDoc };
