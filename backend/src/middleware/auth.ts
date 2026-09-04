import type { RequestHandler } from 'express';
import type { Role } from '@fluxberry/shared';
import { authService } from '../services/auth.service';
import { config } from '../config/env';
import { forbidden } from '../utils/errors';

const DEV_IDENTITY = { providerId: 'dev-bypass', email: 'dev@local.dev', name: 'Dev User' };

/** AUTH BYPASSED — always injects a fixed dev user. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const user = await authService.ensureUser(DEV_IDENTITY);
    req.auth = { user };
    next();
  } catch (err) {
    next(err);
  }
};

/** AUTH BYPASSED — sets workspaceId from header/param without membership check. */
export const resolveWorkspace: RequestHandler = (req, _res, next) => {
  const wsId = (req.header('x-workspace-id') ?? req.params.workspaceId ?? '').trim();
  if (wsId && /^[0-9a-fA-F]{24}$/.test(wsId)) {
    req.auth!.workspaceId = wsId;
    req.auth!.role = 'owner' as Role;
  }
  next();
};

/** AUTH BYPASSED — always passes. */
export const requireWorkspace: RequestHandler = (_req, _res, next) => next();

/** AUTH BYPASSED — always passes. */
export function requireRole(_min: Role): RequestHandler {
  return (_req, _res, next) => next();
}

/** Guard: reject the request outright when a feature flag is off, instead of relying on frontend hiding. */
export function requireFeature(flag: keyof typeof config.features): RequestHandler {
  return (_req, _res, next) => {
    if (!config.features[flag]) {
      return next(forbidden(`The ${flag} feature is not enabled`));
    }
    next();
  };
}
