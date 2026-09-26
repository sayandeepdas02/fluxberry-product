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
   * negative and the caller can surface INSUFFICIENT_CREDITS. Returns the account
   * as it was BEFORE the debit (so the caller can derive the allowance/purchased
   * split and the resulting balance), or null on insufficient funds.
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
      { new: false },
    ),

  /** Undo a debit that lost an idempotency race — restore both buckets exactly. */
  restoreBuckets: (accountId: string, allowance: number, purchased: number) =>
    AccountModel.findByIdAndUpdate(
      accountId,
      { $inc: { 'credits.allowanceRemaining': allowance, 'credits.purchasedBalance': purchased } },
      { new: true },
    ),

  /** Add to the never-expiring purchased bucket (top-up packs). */
  addPurchased: (accountId: string, amount: number) =>
    AccountModel.findByIdAndUpdate(accountId, { $inc: { 'credits.purchasedBalance': amount } }, { new: true }),

  /**
   * Count one AI-screened applicant against the period quota, atomically — only
   * succeeds (returns the account) while screeningsUsed < quota.
   */
  claimScreening: (accountId: string, quota: number) =>
    AccountModel.findOneAndUpdate(
      { _id: accountId, $expr: { $lt: [{ $ifNull: ['$credits.screeningsUsed', 0] }, quota] } },
      { $inc: { 'credits.screeningsUsed': 1 } },
      { new: true },
    ),

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
          'credits.screeningsUsed': 0,
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
          'credits.screeningsUsed': 0,
        },
      },
      { new: true },
    ),

  findAccount: (accountId: string) => AccountModel.findById(accountId),

  // ---- Ledger --------------------------------------------------------------

  ledgerExists: async (idempotencyKey: string) =>
    (await CreditTransactionModel.exists({ idempotencyKey })) != null,

  findByKey: (idempotencyKey: string) => CreditTransactionModel.findOne({ idempotencyKey }).lean(),

  /**
   * Free a fully refunded charge's idempotency key (renaming it on the old row)
   * so the next attempt is debited afresh instead of replaying a charge that
   * was given back. Only matches while the row is still fully refunded.
   */
  retireRefundedKey: (txId: string, idempotencyKey: string) =>
    CreditTransactionModel.updateOne(
      {
        _id: txId,
        idempotencyKey,
        reason: 'CONSUME',
        $expr: {
          $gte: [
            { $add: [{ $ifNull: ['$meta.refundedAllowance', 0] }, { $ifNull: ['$meta.refundedPurchased', 0] }] },
            { $multiply: ['$delta', -1] },
          ],
        },
      },
      { $set: { idempotencyKey: `${idempotencyKey}:refunded:${txId}` } },
    ),

  /** Record the settled (actual) quantity on a CONSUME row, for usage history. */
  setQuantity: (txId: string, quantity: number) =>
    CreditTransactionModel.updateOne({ _id: txId }, { $set: { 'meta.quantity': quantity } }),

  findTransaction: (txId: string) => CreditTransactionModel.findById(txId).lean(),

  /**
   * Atomically record a partial refund against a CONSUME row. The guard ensures
   * total refunds never exceed `ceiling` (the full charge for a refund, or
   * charged − owed for a settle), so concurrent settle/refund calls can't
   * double-return credits. Returns the updated row or null.
   */
  claimRefund: (txId: string, allowance: number, purchased: number, ceiling: number) =>
    CreditTransactionModel.findOneAndUpdate(
      {
        _id: txId,
        reason: 'CONSUME',
        $expr: {
          $lte: [
            {
              $add: [
                { $ifNull: ['$meta.refundedAllowance', 0] },
                { $ifNull: ['$meta.refundedPurchased', 0] },
                allowance,
                purchased,
              ],
            },
            ceiling,
          ],
        },
      },
      { $inc: { 'meta.refundedAllowance': allowance, 'meta.refundedPurchased': purchased } },
      { new: true },
    ).lean(),

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
