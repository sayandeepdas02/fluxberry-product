import { UserModel, type UserDoc } from '../models/user.model';
import type { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserDoc>;

export const userRepository = {
  findById: (id: string) => UserModel.findById(id),
  findByEmail: (email: string) => UserModel.findOne({ email: email.toLowerCase().trim() }),
  findBySupabaseId: (supabaseId: string) => UserModel.findOne({ supabaseId }),
  findByClerkId: (clerkId: string) => UserModel.findOne({ clerkId }),
  create: (data: Partial<UserDoc>) => UserModel.create(data),
  findByIds: (ids: string[]) => UserModel.find({ _id: { $in: ids } }).lean(),
};
