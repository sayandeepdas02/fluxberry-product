import { asyncHandler, ok, created } from '../utils/http';
import { webhookEndpointService } from '../services/webhook-endpoint.service';
import type { CreateWebhookEndpointInput, UpdateWebhookEndpointInput } from '@fluxberry/shared';

export const webhookEndpointController = {
  list: asyncHandler(async (req, res) => {
    const endpoints = await webhookEndpointService.list(req.auth!.workspaceId!);
    ok(res, endpoints);
  }),

  create: asyncHandler(async (req, res) => {
    const { endpoint, secret } = await webhookEndpointService.create(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.body as CreateWebhookEndpointInput,
    );
    created(res, { ...endpoint.toObject(), secret });
  }),

  update: asyncHandler(async (req, res) => {
    const endpoint = await webhookEndpointService.update(
      req.auth!.workspaceId!,
      req.params.endpointId,
      req.body as UpdateWebhookEndpointInput,
    );
    ok(res, endpoint);
  }),

  remove: asyncHandler(async (req, res) => {
    await webhookEndpointService.remove(req.auth!.workspaceId!, req.params.endpointId);
    ok(res, { deleted: true });
  }),

  rotateSecret: asyncHandler(async (req, res) => {
    const secret = await webhookEndpointService.rotateSecret(req.auth!.workspaceId!, req.params.endpointId);
    ok(res, { secret });
  }),

  sendTest: asyncHandler(async (req, res) => {
    const result = await webhookEndpointService.sendTest(req.auth!.workspaceId!, req.params.endpointId);
    ok(res, result);
  }),

  deliveries: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const deliveries = await webhookEndpointService.getDeliveries(
      req.auth!.workspaceId!,
      req.params.endpointId,
      { page, limit },
    );
    ok(res, deliveries);
  }),
};
