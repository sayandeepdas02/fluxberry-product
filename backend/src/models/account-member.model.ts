import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ROLES } from '../shared';

/**
 * A user's membership of an Account (the billing entity). Mirrors WorkspaceMember
 * but at the account level — a member of an account can be granted access to the
 * account's workspaces. At the 1:1 account↔workspace stage this is a copy of the
 * corresponding WorkspaceMember; it becomes the source of truth once one account
 * owns multiple workspaces.
 */
const accountMemberSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true },
    clerkMembershipId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'account_members' },
);

// One membership per (account, user); also index by user for "my accounts".
accountMemberSchema.index({ accountId: 1, userId: 1 }, { unique: true });
accountMemberSchema.index({ userId: 1 });

export type AccountMemberDoc = InferSchemaType<typeof accountMemberSchema>;
export const AccountMemberModel =
  (models.AccountMember as Model<AccountMemberDoc>) ||
  model<AccountMemberDoc>('AccountMember', accountMemberSchema);
