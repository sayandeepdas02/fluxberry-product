import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { EVENT_TYPES } from '@fluxberry/shared';

const statsSchema = new Schema(
  {
    totalDeliveries: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 },
    lastDeliveryAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
  },
  { _id: false },
);

const webhookEndpointSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    url: { type: String, required: true },
    description: { type: String, default: null },
    eventTypes: { type: [{ type: String, enum: EVENT_TYPES }], required: true },
    secret: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    stats: { type: statsSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'webhook_endpoints' },
);

webhookEndpointSchema.index({ workspaceId: 1 });

export type WebhookEndpointDoc = InferSchemaType<typeof webhookEndpointSchema>;
export const WebhookEndpointModel =
  (models.WebhookEndpoint as Model<WebhookEndpointDoc>) ||
  model<WebhookEndpointDoc>('WebhookEndpoint', webhookEndpointSchema);
