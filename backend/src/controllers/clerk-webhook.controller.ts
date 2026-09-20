import type { Request as ExpressRequest } from 'express';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { asyncHandler, ok } from '../utils/http';
import { config } from '../config/env';
import { clerkSyncService } from '../services/clerk-sync.service';
import { badRequest } from '../utils/errors';
import { logger } from '../utils/logger';

/** Builds a Fetch API `Request` from the raw Express request — `verifyWebhook` reads standard headers/body. */
function toFetchRequest(req: ExpressRequest): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const url = `${config.publicApiUrl}${req.originalUrl}`;
  return new Request(url, { method: 'POST', headers, body: req.body as Buffer });
}

export const clerkWebhookController = {
  /**
   * Public webhook — no auth middleware, gated only by Svix signature
   * verification. Mounted with a raw-body parser BEFORE the app's global
   * express.json(), so `req.body` here is a Buffer, not a parsed object.
   */
  webhook: asyncHandler(async (req, res) => {
    let event;
    try {
      event = await verifyWebhook(toFetchRequest(req), {
        signingSecret: config.auth.clerkWebhookSecret,
      });
    } catch (err) {
      logger.warn({ err }, 'clerk webhook signature verification failed');
      throw badRequest('Invalid webhook signature');
    }
    await clerkSyncService.handle(event);
    ok(res, { received: true });
  }),
};
