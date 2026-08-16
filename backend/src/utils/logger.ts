import pino from 'pino';
import { config } from '../config/env';

/**
 * Structured logger. Pretty in dev, JSON in prod, silent in tests.
 * Never log secrets, tokens, or full candidate PII / resume content (spec §64).
 */
export const logger = pino({
  level: config.isTest ? 'silent' : config.isProd ? 'info' : 'debug',
  base: { service: 'fluxberry' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'apiKey',
      '*.apiKey',
      'resumeText',
      '*.resumeText',
    ],
    remove: true,
  },
  transport:
    config.isDev
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});

export type Logger = typeof logger;
