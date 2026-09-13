import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const labelSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'labels' },
);

// Case-insensitive-ish uniqueness is enforced in the service layer (normalized lowercase compare);
// this index just prevents exact-string duplicates at the DB level.
labelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export type LabelDoc = InferSchemaType<typeof labelSchema>;
export const LabelModel = (models.Label as Model<LabelDoc>) || model<LabelDoc>('Label', labelSchema);
