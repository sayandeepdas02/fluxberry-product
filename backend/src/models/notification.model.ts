import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const NOTIFICATION_TYPES = [
  'new_candidate',
  'assessment_completed',
  'interview_completed',
  'candidate_hired',
  'screening_completed',
  'new_message',
] as const;

const notificationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    entityType: { type: String, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.index({ workspaceId: 1, userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });
// Auto-delete after 30 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const NotificationModel =
  (models.Notification as Model<NotificationDoc>) ||
  model<NotificationDoc>('Notification', notificationSchema);
