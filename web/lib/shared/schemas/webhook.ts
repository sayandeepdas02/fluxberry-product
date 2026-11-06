import { z } from 'zod';
import { EVENT_TYPES } from '../enums';

export const createWebhookEndpointSchema = z.object({
  url: z.string().url().startsWith('https://', { message: 'Webhook URL must use HTTPS' }),
  description: z.string().max(200).optional(),
  eventTypes: z.array(z.enum(EVENT_TYPES)).min(1),
});
export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url().startsWith('https://').optional(),
  description: z.string().max(200).optional(),
  eventTypes: z.array(z.enum(EVENT_TYPES)).min(1).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
