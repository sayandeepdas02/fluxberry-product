import type { RequestHandler } from 'express';
import type { Role, FeatureFlag, WorkspacePlan } from '@fluxberry/shared';
import { ROLE_RANK, planIncludesFeature } from '@fluxberry/shared';
import { authService } from '../services/auth.service';
import { memberRepository } from '../repositories/member.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { getTokenVerifier } from '../auth';
import { config } from '../config/env';
import { unauthorized, forbidden, planUpgradeRequired, notFound } from '../utils/errors';

/**
 * Local/dev-only escape hatch (AUTH_BYPASS_ENABLED=true). Never a supported
 * production mode — production must run with this off so real tokens and real
 * workspace membership are enforced.
 */
const DEV_IDENTITY = { providerId: 'dev-bypass', email: 'dev@local.dev', name: 'Dev User' };

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    if (config.auth.bypassEnabled) {
      const user = await authService.ensureUser(DEV_IDENTITY);
      req.auth = { user };
      return next();
    }

    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized();
    }

    const identity = await getTokenVerifier().verify(token);
    const user = await authService.ensureUser(identity);
    req.auth = { user };
    next();
  } catch (err) {
    next(err);
  }
};

export const resolveWorkspace: RequestHandler = async (req, _res, next) => {
  try {
    const wsId = (req.header('x-workspace-id') ?? req.params.workspaceId ?? '').trim();
    if (!wsId || !/^[0-9a-fA-F]{24}$/.test(wsId)) {
      // No (or malformed) workspace context supplied — leave workspaceId/role
      // unset. requireWorkspace rejects routes that actually need one.
      return next();
    }

    if (config.auth.bypassEnabled) {
      req.auth!.workspaceId = wsId;
      req.auth!.role = 'owner' as Role;
      return next();
    }

    const membership = await memberRepository.find(wsId, req.auth!.user.id);
    if (!membership) {
      // Not a member of this workspace — leave unset so requireWorkspace 403s,
      // rather than 500ing or silently granting access.
      return next();
    }
    req.auth!.workspaceId = wsId;
    req.auth!.role = membership.role as Role;
    req.auth!.membershipId = String(membership._id);
    next();
  } catch (err) {
    next(err);
  }
};

export const requireWorkspace: RequestHandler = (req, _res, next) => {
  if (!req.auth?.workspaceId || !req.auth.role) {
    return next(forbidden('You do not have access to this workspace'));
  }
  next();
};

export function requireRole(min: Role): RequestHandler {
  return (req, _res, next) => {
    const role = req.auth?.role;
    if (!role || ROLE_RANK[role] < ROLE_RANK[min]) {
      return next(forbidden('You do not have permission to perform this action'));
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

/**
 * Guard: reject unless the workspace's PLAN unlocks this flag (and the global
 * kill-switch is also on — plan can only narrow, never override, requireFeature).
 * Distinct 403 code (PLAN_UPGRADE_REQUIRED) so the frontend shows an upsell
 * modal instead of a generic "forbidden" error.
 */
export function requirePlanFeature(flag: FeatureFlag): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!config.features[flag]) return next(forbidden(`The ${flag} feature is not enabled`));
      if (!req.auth?.workspaceId) return next(forbidden('You do not have access to this workspace'));

      const workspace = await workspaceRepository.findById(req.auth.workspaceId);
      if (!workspace) return next(notFound('Workspace not found'));

      const plan = (workspace.plan as WorkspacePlan) ?? 'FREE';
      if (!planIncludesFeature(plan, flag)) {
        return next(planUpgradeRequired(flag));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
