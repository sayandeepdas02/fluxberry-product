import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { requestId } from './middleware/request-id';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limit';
import { mockStorageRouter } from './integrations';
import { apiRouter } from './routes';
import { billingController } from './controllers/billing.controller';
import { clerkWebhookController } from './controllers/clerk-webhook.controller';
import { config } from './config/env';
import { pingRedis } from './config/redis';
import { logger } from './utils/logger';

if (config.observability?.sentryDsn && !config.isTest) {
  Sentry.init({
    dsn: config.observability.sentryDsn,
    environment: config.observability.sentryEnvironment ?? config.nodeEnv,
    release: config.observability.sentryRelease,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}

/** Builds the Express app (exported so tests can mount it without listening). */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Allow signed file URLs to be embedded/opened cross-origin from the web app.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(requestId);
  if (!config.isTest) {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => (req as any).id,
        autoLogging: { ignore: (req) => req.url === '/health' },
      }),
    );
  }
  // Billing webhook needs the raw body for signature verification — must be
  // registered BEFORE the global express.json() parser consumes it.
  app.post(
    '/api/v1/webhooks/dodo',
    express.raw({ type: 'application/json', limit: '1mb' }),
    billingController.webhook,
  );
  app.post(
    '/api/v1/webhooks/clerk',
    express.raw({ type: 'application/json', limit: '1mb' }),
    clerkWebhookController.webhook,
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(generalLimiter);

  // Signed mock-storage file serving (no-op in prod / with real S3).
  app.use(mockStorageRouter);

  app.get('/health', async (_req, res) => {
    const redis = config.redis.url ? await pingRedis() : undefined;
    res.json({
      success: true,
      data: { status: 'ok', app: config.appName, ...(redis !== undefined && { redis: redis ? 'ok' : 'down' }) },
    });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  if (config.observability?.sentryDsn && !config.isTest) {
    app.use(Sentry.expressErrorHandler() as unknown as express.ErrorRequestHandler);
  }
  app.use(errorHandler);
  return app;
}
