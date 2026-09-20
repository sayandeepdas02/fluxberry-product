import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import type { CreateWebhookEndpointInput, UpdateWebhookEndpointInput } from '@fluxberry/shared';
import { webhookEndpointRepository, webhookDeliveryRepository } from '../repositories/webhook-endpoint.repository';
import { auditService } from './audit.service';
import { notFound, badRequest } from '../utils/errors';
import { logger } from '../utils/logger';

const BLOCKED_IP_PREFIXES = ['127.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
  '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '169.254.', '0.', '::1', 'fc00:', 'fe80:'];

async function validateUrlNotSSRF(url: string): Promise<void> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  if (hostname === 'localhost' || hostname === '[::1]') {
    throw badRequest('Webhook URL cannot point to localhost');
  }

  try {
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    const all = [...addresses, ...addresses6];
    for (const addr of all) {
      if (BLOCKED_IP_PREFIXES.some((prefix) => addr.startsWith(prefix))) {
        throw badRequest('Webhook URL resolves to a private/internal IP address');
      }
    }
  } catch (err) {
    if ((err as any)?.code === 'RATE_LIMITED' || (err as any)?.message?.includes('private')) throw err;
  }
}

function generateSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

export function signPayload(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export const webhookEndpointService = {
  async create(workspaceId: string, actorUserId: string, input: CreateWebhookEndpointInput) {
    await validateUrlNotSSRF(input.url);
    const secret = generateSecret();
    const endpoint = await webhookEndpointRepository.create({
      workspaceId: workspaceId as any,
      url: input.url,
      description: input.description ?? null,
      eventTypes: input.eventTypes,
      secret,
      createdBy: actorUserId as any,
    });
    await auditService.log({
      workspaceId,
      userId: actorUserId,
      action: 'webhook_endpoint.created',
      resourceType: 'webhook_endpoint',
      resourceId: String(endpoint._id),
    });
    return { endpoint, secret };
  },

  async update(workspaceId: string, endpointId: string, input: UpdateWebhookEndpointInput) {
    if (input.url) await validateUrlNotSSRF(input.url);
    const endpoint = await webhookEndpointRepository.findById(endpointId);
    if (!endpoint || String(endpoint.workspaceId) !== workspaceId) throw notFound('Webhook endpoint not found');
    return webhookEndpointRepository.update(endpointId, input);
  },

  async remove(workspaceId: string, endpointId: string) {
    const endpoint = await webhookEndpointRepository.findById(endpointId);
    if (!endpoint || String(endpoint.workspaceId) !== workspaceId) throw notFound('Webhook endpoint not found');
    await webhookEndpointRepository.remove(endpointId);
    await auditService.log({
      workspaceId,
      action: 'webhook_endpoint.deleted',
      resourceType: 'webhook_endpoint',
      resourceId: endpointId,
    });
  },

  async list(workspaceId: string) {
    return webhookEndpointRepository.findByWorkspace(workspaceId);
  },

  async rotateSecret(workspaceId: string, endpointId: string) {
    const endpoint = await webhookEndpointRepository.findById(endpointId);
    if (!endpoint || String(endpoint.workspaceId) !== workspaceId) throw notFound('Webhook endpoint not found');
    const secret = generateSecret();
    await webhookEndpointRepository.update(endpointId, { secret } as any);
    return secret;
  },

  async sendTest(workspaceId: string, endpointId: string) {
    const endpoint = await webhookEndpointRepository.findById(endpointId);
    if (!endpoint || String(endpoint.workspaceId) !== workspaceId) throw notFound('Webhook endpoint not found');

    const envelope = {
      id: `test_${crypto.randomBytes(8).toString('hex')}`,
      type: 'webhook.test',
      apiVersion: 'v1',
      createdAt: new Date().toISOString(),
      data: { message: 'This is a test event from Fluxberry' },
    };
    const body = JSON.stringify(envelope);
    const signature = signPayload(endpoint.secret, body);

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fluxberry-Signature': `sha256=${signature}`,
          'X-Fluxberry-Event': 'webhook.test',
          'X-Fluxberry-Delivery': envelope.id,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const reader = response.body?.getReader();
      let responseBody = '';
      if (reader) {
        const decoder = new TextDecoder();
        let bytes = 0;
        while (bytes < 2048) {
          const { done, value } = await reader.read();
          if (done) break;
          responseBody += decoder.decode(value, { stream: true });
          bytes += value.length;
        }
        reader.cancel();
      }

      await webhookDeliveryRepository.create({
        webhookEndpointId: endpoint._id,
        workspaceId,
        eventType: 'webhook.test',
        status: response.ok ? 'SUCCESS' : 'FAILED',
        requestPayload: envelope,
        responseStatus: response.status,
        responseBodySnippet: responseBody.slice(0, 2048),
        deliveredAt: new Date(),
      });

      return { status: response.status, ok: response.ok };
    } catch (err) {
      await webhookDeliveryRepository.create({
        webhookEndpointId: endpoint._id,
        workspaceId,
        eventType: 'webhook.test',
        status: 'FAILED',
        requestPayload: envelope,
        error: (err as Error).message,
        deliveredAt: new Date(),
      });
      return { status: 0, ok: false, error: (err as Error).message };
    }
  },

  async getDeliveries(workspaceId: string, endpointId: string, { page = 1, limit = 20 } = {}) {
    const endpoint = await webhookEndpointRepository.findById(endpointId);
    if (!endpoint || String(endpoint.workspaceId) !== workspaceId) throw notFound('Webhook endpoint not found');
    return webhookDeliveryRepository.findByEndpoint(endpointId, { page, limit });
  },
};
