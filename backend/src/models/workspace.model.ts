import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { WORKSPACE_PLANS } from '@fluxberry/shared';

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    /** Public careers-page URL slug; unique across workspaces (set in the Careers builder). */
    careersSlug: { type: String, default: null },
    logoUrl: { type: String, default: null },
    plan: { type: String, enum: WORKSPACE_PLANS, default: 'FREE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'workspaces' },
);

workspaceSchema.index({ careersSlug: 1 }, { unique: true, partialFilterExpression: { careersSlug: { $type: 'string' } } });

export type WorkspaceDoc = InferSchemaType<typeof workspaceSchema>;
export const WorkspaceModel =
  (models.Workspace as Model<WorkspaceDoc>) || model<WorkspaceDoc>('Workspace', workspaceSchema);
