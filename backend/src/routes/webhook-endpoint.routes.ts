import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole,
  requirePlanFeature,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { webhookEndpointController } from '../controllers/webhook-endpoint.controller';
import { createWebhookEndpointSchema, updateWebhookEndpointSchema } from '@fluxberry/shared';

export const webhookEndpointRouter = Router();

const auth = [authenticate, resolveWorkspace, requireWorkspace, requireRole('admin'), requirePlanFeature('OUTBOUND_WEBHOOKS')];

webhookEndpointRouter.get('/webhook-endpoints', ...auth, webhookEndpointController.list);
webhookEndpointRouter.post('/webhook-endpoints', ...auth, validateBody(createWebhookEndpointSchema), webhookEndpointController.create);
webhookEndpointRouter.patch('/webhook-endpoints/:endpointId', ...auth, validateBody(updateWebhookEndpointSchema), webhookEndpointController.update);
webhookEndpointRouter.delete('/webhook-endpoints/:endpointId', ...auth, webhookEndpointController.remove);
webhookEndpointRouter.post('/webhook-endpoints/:endpointId/rotate-secret', ...auth, webhookEndpointController.rotateSecret);
webhookEndpointRouter.post('/webhook-endpoints/:endpointId/test', ...auth, webhookEndpointController.sendTest);
webhookEndpointRouter.get('/webhook-endpoints/:endpointId/deliveries', ...auth, webhookEndpointController.deliveries);
