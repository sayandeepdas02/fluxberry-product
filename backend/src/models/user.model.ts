import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    /** Identity from the auth provider (Supabase user id). */
    supabaseId: { type: String, default: null },
    clerkId: { type: String, default: null },
  },
  { timestamps: true, collection: 'users' },
);

// Partial (not sparse): these fields default to `null` (a stored value), and a
// sparse-unique index only excludes MISSING fields — so two test/legacy users
// with a null id would collide. Only real string ids are indexed for uniqueness,
// matching the clerkOrgId pattern on account/workspace.
userSchema.index({ supabaseId: 1 }, { unique: true, partialFilterExpression: { supabaseId: { $type: 'string' } } });
userSchema.index({ clerkId: 1 }, { unique: true, partialFilterExpression: { clerkId: { $type: 'string' } } });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = (models.User as Model<UserDoc>) || model<UserDoc>('User', userSchema);
