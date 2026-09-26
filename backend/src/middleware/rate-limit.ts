import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RequestHandler } from 'express';
import { config } from '../config/env';
import { getRedisClient } from '../config/redis';

function buildStore(prefix: string): RedisStore | undefined {
  const client = getRedisClient();
  if (!client) return undefined;
  try {
    if ((client as any).status !== 'ready' && (client as any).status !== 'connect') return undefined;
    return new RedisStore({
      sendCommand: (...args: string[]) => client.call(args[0], ...args.slice(1)) as any,
      prefix: `rl:${prefix}:`,
    });
  } catch {
    return undefined;
  }
}

function make(options: { windowMs: number; max: number; message?: string; prefix: string }): RequestHandler {
  const max = config.isTest ? 100000 : options.max;
  return rateLimit({
    windowMs: options.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore(options.prefix),
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: options.message ?? 'Too many requests, please slow down' },
      });
    },
  });
}

export const generalLimiter = make({ windowMs: 60_000, max: 300, prefix: 'general' });
export const authLimiter = make({ windowMs: 15 * 60_000, max: 30, message: 'Too many attempts', prefix: 'auth' });
export const publicApplyLimiter = make({ windowMs: 60_000, max: 10, message: 'Too many applications from this network', prefix: 'apply' });
export const uploadLimiter = make({ windowMs: 60_000, max: 20, prefix: 'upload' });
export const aiLimiter = make({ windowMs: 60_000, max: 20, message: 'AI is busy, try again shortly', prefix: 'ai' });
/** Campaign test sends — members' own inboxes only, and never a bulk channel. */
export const testEmailLimiter = make({ windowMs: 60 * 60_000, max: 10, message: 'Test email limit reached — try again in an hour', prefix: 'test-email' });
