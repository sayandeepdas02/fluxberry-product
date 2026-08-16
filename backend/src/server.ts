import { createApp } from './app';
import { connectDatabase, registerShutdown } from './config/db';
import { config } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, `${config.appName} API listening`);
  });
  registerShutdown(server);
}

main().catch((err) => {
  logger.error({ err }, 'API failed to start');
  process.exit(1);
});
