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
import { config } from './config/env';
import { logger } from './utils/logger';

if (config.observability?.sentryDsn && !config.isTest) {
  Sentry.init({
    dsn: config.observability.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: 0.1,
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
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(generalLimiter);

  // Signed mock-storage file serving (no-op in prod / with real S3).
  app.use(mockStorageRouter);

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', app: config.appName } });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  if (config.observability?.sentryDsn && !config.isTest) {
    app.use(Sentry.expressErrorHandler());
  }
  app.use(errorHandler);
  return app;
}
