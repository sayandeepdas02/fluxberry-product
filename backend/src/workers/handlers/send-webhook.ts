import crypto from 'node:crypto';
import { webhookEndpointRepository, webhookDeliveryRepository } from '../../repositories/webhook-endpoint.repository';
import { signPayload } from '../../services/webhook-endpoint.service';
import type { JobHandler } from './index';

export const sendWebhookHandler: JobHandler = async (payload, ctx) => {
  const { webhookEndpointId, workspaceId, eventType, payload: eventPayload, entityType, entityId, occurredAt } = payload;

  const endpoint = await webhookEndpointRepository.findById(webhookEndpointId);
  if (!endpoint || !endpoint.enabled) {
    ctx.logger.debug('endpoint disabled or deleted — skipping');
    return;
  }

  const deliveryId = crypto.randomBytes(12).toString('hex');
  const envelope = {
    id: deliveryId,
    type: eventType,
    apiVersion: 'v1',
    createdAt: occurredAt,
    data: { entityType, entityId, ...eventPayload },
  };

  const body = JSON.stringify(envelope);
  const signature = signPayload(endpoint.secret, body);

  const delivery = await webhookDeliveryRepository.create({
    webhookEndpointId: endpoint._id,
    workspaceId,
    eventType,
    status: 'PENDING',
    requestPayload: envelope,
  });

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fluxberry-Signature': `sha256=${signature}`,
        'X-Fluxberry-Event': eventType,
        'X-Fluxberry-Delivery': deliveryId,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      await webhookDeliveryRepository.update(String(delivery._id), {
        status: 'SUCCESS',
        responseStatus: response.status,
        responseBodySnippet: responseBody.slice(0, 2048),
        deliveredAt: new Date(),
      });
      await webhookEndpointRepository.incrementStats(webhookEndpointId, true);
    } else {
      await webhookDeliveryRepository.update(String(delivery._id), {
        status: 'FAILED',
        responseStatus: response.status,
        responseBodySnippet: responseBody.slice(0, 2048),
        deliveredAt: new Date(),
      });
      await webhookEndpointRepository.incrementStats(webhookEndpointId, false);
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }
  } catch (err) {
    if (!(err as any)?.message?.startsWith('Webhook delivery failed')) {
      await webhookDeliveryRepository.update(String(delivery._id), {
        status: 'FAILED',
        error: (err as Error).message,
        deliveredAt: new Date(),
      });
      await webhookEndpointRepository.incrementStats(webhookEndpointId, false);
    }
    throw err;
  }
};
