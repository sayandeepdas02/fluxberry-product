import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

/**
 * Single shared Mongoose connection for the whole process (API or worker).
 * Do not create a connection per request (spec: MONGODB CONNECTION).
 */
mongoose.set('strictQuery', true);

let connectingPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(uri: string = config.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectingPromise) return connectingPromise;

  connectingPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
      autoIndex: !config.isProd, // build indexes automatically outside prod
    })
    .then((m) => {
      logger.info({ db: m.connection.name }, 'MongoDB connected');
      return m;
    })
    .catch((err) => {
      connectingPromise = null;
      logger.error({ err }, 'MongoDB connection failed');
      throw err;
    });

  return connectingPromise;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectingPromise = null;
    logger.info('MongoDB disconnected');
  }
}

/** Wire graceful shutdown for a long-running process. */
export function registerShutdown(server?: { close: (cb?: () => void) => void }) {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    try {
      if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export { mongoose };
