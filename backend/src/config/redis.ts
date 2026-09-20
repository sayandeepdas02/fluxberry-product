import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (config.isTest || !config.redis.url) return null;

  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      logger.warn({ err }, 'Redis connection error (rate limiting will fall back to in-memory)');
    });

    client.connect().catch(() => {
      // Swallowed — the 'error' listener already logs.
    });
  }

  return client;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const c = getRedisClient();
    if (!c) return false;
    const reply = await c.ping();
    return reply === 'PONG';
  } catch {
    return false;
  }
}
