import * as Sentry from '@sentry/node';
import { connectDatabase } from '../config/db';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { startWorker, stopWorker } from './runner';

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

/** Standalone worker process entrypoint (`npm run dev:worker`). */
async function main() {
  await connectDatabase();
  await startWorker();
}

process.on('SIGINT', () => {
  stopWorker();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopWorker();
  process.exit(0);
});

main().catch((err) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
