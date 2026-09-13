import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** One thread per application: Message.find({applicationId}).sort({createdAt:1}). */
const messageSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    sender: { type: String, enum: ['recruiter', 'candidate'], required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, default: null },
    body: { type: String, required: true },
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    /** Provider message id — outbound send id, or inbound id, for idempotency. */
    providerMessageId: { type: String, default: null },
    readByRecruiter: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'messages' },
);

messageSchema.index({ applicationId: 1, createdAt: 1 });
messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index(
  { providerMessageId: 1 },
  { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);

export type MessageDoc = InferSchemaType<typeof messageSchema>;
export const MessageModel =
  (models.Message as Model<MessageDoc>) || model<MessageDoc>('Message', messageSchema);
