import { connectDatabase, disconnectDatabase, mongoose } from '../config/db';
import '../models'; // register all models
import { logger } from '../utils/logger';

/**
 * "Migration" for MongoDB = ensure every model's indexes exist (spec §121).
 * Safe to run repeatedly.
 */
async function main() {
  await connectDatabase();
  const names = Object.keys(mongoose.models);
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    await mongoose.models[name].syncIndexes();
  }
  logger.info({ models: names }, 'Indexes synced');
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
