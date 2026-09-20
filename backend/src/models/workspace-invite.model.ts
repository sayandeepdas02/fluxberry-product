import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ROLES } from '@fluxberry/shared';

const INVITE_ROLES = ROLES.filter((r) => r !== 'owner');

const WORKSPACE_INVITE_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;

const workspaceInviteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: INVITE_ROLES, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Unguessable public token, same generator as assessment/interview links. */
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: WORKSPACE_INVITE_STATUSES, default: 'PENDING' },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'workspace_invites' },
);

workspaceInviteSchema.index({ workspaceId: 1, email: 1 });
workspaceInviteSchema.index({ workspaceId: 1, status: 1 });

export type WorkspaceInviteDoc = InferSchemaType<typeof workspaceInviteSchema>;
export const WorkspaceInviteModel =
  (models.WorkspaceInvite as Model<WorkspaceInviteDoc>) ||
  model<WorkspaceInviteDoc>('WorkspaceInvite', workspaceInviteSchema);
