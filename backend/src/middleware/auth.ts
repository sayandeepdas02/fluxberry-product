import type { RequestHandler } from 'express';
import { ROLE_RANK, type Role } from '@fluxberry/shared';
import { getTokenVerifier } from '../auth';
import { authService } from '../services/auth.service';
import { memberRepository } from '../repositories/member.repository';
import { config } from '../config/env';
import { unauthorized, forbidden, badRequest } from '../utils/errors';

/** Verify the bearer token and mirror the identity into Mongo (spec §79 step 1). */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw unauthorized();
    const identity = await getTokenVerifier().verify(token);
    const user = await authService.ensureUser(identity);
    req.auth = { user };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Resolve the active workspace from the X-Workspace-Id header (or :workspaceId
 * route param) and confirm membership (spec §79 steps 2-4). Skips silently when
 * no workspace context is provided (e.g. /workspaces list, /auth/me).
 */
export const resolveWorkspace: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw unauthorized();
    const wsId = (req.header('x-workspace-id') ?? req.params.workspaceId ?? '').trim();
    if (!wsId) return next();
    if (!/^[0-9a-fA-F]{24}$/.test(wsId)) throw badRequest('Invalid workspace id');
    const member = await memberRepository.find(wsId, req.auth.user.id);
    if (!member) throw forbidden('You are not a member of this workspace');
    req.auth.workspaceId = wsId;
    req.auth.role = member.role as Role;
    req.auth.membershipId = String(member._id);
    next();
  } catch (err) {
    next(err);
  }
};

/** Guard: a workspace must be resolved. */
export const requireWorkspace: RequestHandler = (req, _res, next) => {
  if (!req.auth?.workspaceId) {
    return next(badRequest('Missing workspace context (X-Workspace-Id header)'));
  }
  next();
};

/** Guard: current member role must be >= `min` (spec §12 RBAC). */
export function requireRole(min: Role): RequestHandler {
  return (req, _res, next) => {
    const role = req.auth?.role;
    if (!role) return next(forbidden());
    if (ROLE_RANK[role] < ROLE_RANK[min]) {
      return next(forbidden('You do not have permission for this action'));
    }
    next();
  };
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
