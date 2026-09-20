import { WebhookEndpointModel, type WebhookEndpointDoc } from '../models/webhook-endpoint.model';
import { WebhookDeliveryModel } from '../models/webhook-delivery.model';

export const webhookEndpointRepository = {
  create: (data: Partial<WebhookEndpointDoc>) => WebhookEndpointModel.create(data),

  findById: (id: string) => WebhookEndpointModel.findById(id),

  findByWorkspace: (workspaceId: string) =>
    WebhookEndpointModel.find({ workspaceId }).sort({ createdAt: -1 }),

  findEnabledForEvent: (workspaceId: string, eventType: string) =>
    WebhookEndpointModel.find({
      workspaceId,
      enabled: true,
      eventTypes: eventType,
    }),

  update: (id: string, patch: Partial<WebhookEndpointDoc>) =>
    WebhookEndpointModel.findByIdAndUpdate(id, patch, { new: true }),

  remove: (id: string) => WebhookEndpointModel.findByIdAndDelete(id),

  incrementStats: (id: string, success: boolean) =>
    WebhookEndpointModel.findByIdAndUpdate(id, {
      $inc: success
        ? { 'stats.totalDeliveries': 1 }
        : { 'stats.totalDeliveries': 1, 'stats.totalFailures': 1 },
      $set: success
        ? { 'stats.lastDeliveryAt': new Date(), 'stats.lastSuccessAt': new Date() }
        : { 'stats.lastDeliveryAt': new Date(), 'stats.lastFailureAt': new Date() },
    }),
};

export const webhookDeliveryRepository = {
  create: (data: any) => WebhookDeliveryModel.create(data),

  findByEndpoint: (endpointId: string, { page = 1, limit = 20 } = {}) =>
    WebhookDeliveryModel.find({ webhookEndpointId: endpointId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

  update: (id: string, patch: any) =>
    WebhookDeliveryModel.findByIdAndUpdate(id, patch, { new: true }),
};
