import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { config } from '../config/env';

/**
 * Simple in-memory rate limiting (fine for a single-instance API, spec §101).
 * Architected as named limiters so they can move to a shared store later.
 */
function make(options: { windowMs: number; max: number; message?: string }): RequestHandler {
  // Effectively disabled in tests to keep them deterministic.
  const max = config.isTest ? 100000 : options.max;
  return rateLimit({
    windowMs: options.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: options.message ?? 'Too many requests, please slow down',
        },
      });
    },
  });
}

export const generalLimiter = make({ windowMs: 60_000, max: 300 });
export const authLimiter = make({ windowMs: 15 * 60_000, max: 30, message: 'Too many attempts' });
export const publicApplyLimiter = make({ windowMs: 60_000, max: 10, message: 'Too many applications from this network' });
export const uploadLimiter = make({ windowMs: 60_000, max: 20 });
export const aiLimiter = make({ windowMs: 60_000, max: 20, message: 'AI is busy, try again shortly' });
export const assessmentLimiter = make({ windowMs: 60_000, max: 60 });
