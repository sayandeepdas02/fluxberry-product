import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    /** Identity from the auth provider (Supabase user id). */
    supabaseId: { type: String, default: null },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.index({ supabaseId: 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = (models.User as Model<UserDoc>) || model<UserDoc>('User', userSchema);
