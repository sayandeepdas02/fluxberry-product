import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CREDIT_TRANSACTION_REASONS } from '../shared';

/**
 * Append-only ledger of every AI-credit balance change on an account. The
 * account's cached `credits` sub-doc is the fast-path balance; this ledger is the
 * audit trail and the idempotency guard: a unique `idempotencyKey` makes grants,
 * consumes, and refunds safe to retry (a webhook replay or a re-submitted action
 * never double-counts).
 */
const creditTransactionSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    /** Signed change to the balance (negative for CONSUME, positive for GRANT/PURCHASE/REFUND/RESET). */
    delta: { type: Number, required: true },
    reason: { type: String, enum: CREDIT_TRANSACTION_REASONS, required: true },
    /** For CONSUME/REFUND: which feature spent/returned the credits (e.g. JD_GENERATION). */
    feature: { type: String, default: null },
    /** Total balance (allowanceRemaining + purchasedBalance) immediately after applying this delta. */
    balanceAfter: { type: Number, required: true },
    /** Idempotency key — a second write with the same key is a no-op. */
    idempotencyKey: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'credit_transactions' },
);

creditTransactionSchema.index({ accountId: 1, createdAt: -1 });
creditTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export type CreditTransactionDoc = InferSchemaType<typeof creditTransactionSchema>;
export const CreditTransactionModel =
  (models.CreditTransaction as Model<CreditTransactionDoc>) ||
  model<CreditTransactionDoc>('CreditTransaction', creditTransactionSchema);
