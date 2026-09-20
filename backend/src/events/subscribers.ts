import { config } from '../config/env';
import { webhookEndpointRepository } from '../repositories/webhook-endpoint.repository';
import { jobQueue } from '../queue/job-queue';
import { logger } from '../utils/logger';
import { eventBus } from './event-bus';

export function registerEventSubscribers(): void {
  if (!config.features.OUTBOUND_WEBHOOKS) return;

  eventBus.subscribe('*', async (event) => {
    try {
      const workspaceId = String(event.workspaceId);
      if (!workspaceId) return;

      const endpoints = await webhookEndpointRepository.findEnabledForEvent(workspaceId, event.type);

      for (const endpoint of endpoints) {
        await jobQueue.enqueue(
          'SEND_WEBHOOK',
          {
            webhookEndpointId: String(endpoint._id),
            workspaceId,
            eventType: event.type,
            payload: event.payload ?? {},
            entityType: event.entityType,
            entityId: String(event.entityId ?? ''),
            occurredAt: event.createdAt.toISOString(),
          },
          { idempotencyKey: `webhook:${endpoint._id}:${event.id}` },
        );
      }
    } catch (err) {
      logger.warn({ err, eventType: event.type }, 'webhook dispatch failed (non-fatal)');
    }
  });

  logger.info('Outbound webhook subscriber registered');
}
