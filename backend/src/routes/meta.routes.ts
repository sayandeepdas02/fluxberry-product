import { Router } from 'express';
import { ok } from '../utils/http';
import { config } from '../config/env';

export const metaRouter = Router();

/** Public bootstrap info for the web app (branding + feature flags). */
metaRouter.get('/meta', (_req, res) => {
  ok(res, {
    appName: config.appName,
    features: config.features,
    env: config.nodeEnv,
  });
});
