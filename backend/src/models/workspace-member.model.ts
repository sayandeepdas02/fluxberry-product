import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ROLES } from '../shared';

const workspaceMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true },
    clerkMembershipId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'workspace_members' },
);

// One membership per (workspace, user); also index by user for "my workspaces".
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ userId: 1 });

export type WorkspaceMemberDoc = InferSchemaType<typeof workspaceMemberSchema>;
export const WorkspaceMemberModel =
  (models.WorkspaceMember as Model<WorkspaceMemberDoc>) ||
  model<WorkspaceMemberDoc>('WorkspaceMember', workspaceMemberSchema);
