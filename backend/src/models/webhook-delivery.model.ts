import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const webhookDeliverySchema = new Schema(
  {
    webhookEndpointId: { type: Schema.Types.ObjectId, ref: 'WebhookEndpoint', required: true },
    workspaceId: { type: Schema.Types.ObjectId, required: true },
    eventType: { type: String, required: true },
    attempt: { type: Number, default: 1 },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'DEAD'], default: 'PENDING' },
    requestPayload: { type: Schema.Types.Mixed, default: null },
    responseStatus: { type: Number, default: null },
    responseBodySnippet: { type: String, default: null },
    error: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'webhook_deliveries' },
);

webhookDeliverySchema.index({ webhookEndpointId: 1, createdAt: -1 });
webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export type WebhookDeliveryDoc = InferSchemaType<typeof webhookDeliverySchema>;
export const WebhookDeliveryModel =
  (models.WebhookDelivery as Model<WebhookDeliveryDoc>) ||
  model<WebhookDeliveryDoc>('WebhookDelivery', webhookDeliverySchema);
