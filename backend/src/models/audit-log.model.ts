import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** Records important workspace actions (spec §65). */
const auditLogSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'audit_logs' },
);

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel =
  (models.AuditLog as Model<AuditLogDoc>) || model<AuditLogDoc>('AuditLog', auditLogSchema);
