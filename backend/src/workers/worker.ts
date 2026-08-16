import { connectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { startWorker, stopWorker } from './runner';

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
