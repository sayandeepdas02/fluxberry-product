import type { RequestHandler } from 'express';
import type { Role, FeatureFlag, WorkspacePlan, BillingSubscriptionStatus } from '../shared';
import { ROLE_RANK, planIncludesFeature, ACTIVE_BILLING_STATUSES } from '../shared';
import * as Sentry from '@sentry/node';
import { authService } from '../services/auth.service';
import { memberRepository } from '../repositories/member.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { accountRepository } from '../repositories/account.repository';
import { jobRepository } from '../repositories/job.repository';
import { applicationRepository } from '../repositories/application.repository';
import { getTokenVerifier } from '../auth';
import { config } from '../config/env';
import { unauthorized, forbidden, planUpgradeRequired, subscriptionRequired, notFound } from '../utils/errors';
import { isJobAccessible } from '../utils/job-access';

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
      Sentry.setUser({ id: user.id, email: user.email });
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
    Sentry.setUser({ id: user.id, email: user.email });
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
    Sentry.setTag('workspaceId', wsId);
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

/**
 * Guard: reject with 404 (not 403) when the job at `:jobId` restricts
 * visibility and the caller isn't in `restrictedTo` — a restricted job must be
 * invisible to an excluded recruiter, not merely blocked, so its existence
 * (title, whether it exists at all) isn't leaked. Owner/admin always pass.
 */
export const requireJobAccess: RequestHandler = async (req, _res, next) => {
  try {
    const auth = req.auth!;
    const job = await jobRepository.findInWorkspace(auth.workspaceId!, req.params.jobId);
    if (!job) return next(notFound('Job not found'));
    if (!isJobAccessible(auth, job.restrictedTo)) return next(notFound('Job not found'));
    next();
  } catch (err) {
    next(err);
  }
};

/** Same as `requireJobAccess`, but for routes keyed by `:applicationId` — resolves the owning job via the application's denormalized `jobRestrictedTo`. */
export const requireApplicationJobAccess: RequestHandler = async (req, _res, next) => {
  try {
    const auth = req.auth!;
    const application = await applicationRepository.findInWorkspace(auth.workspaceId!, req.params.applicationId);
    if (!application) return next(notFound('Application not found'));
    if (!isJobAccessible(auth, application.jobRestrictedTo)) return next(notFound('Application not found'));
    next();
  } catch (err) {
    next(err);
  }
};

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
 * Guard: reject unless the workspace's owning ACCOUNT plan unlocks this flag (and
 * the global kill-switch is also on — plan can only narrow, never override,
 * requireFeature). Plan + subscription live on the Account (per-subscription, not
 * per-workspace). Distinct 403 code (PLAN_UPGRADE_REQUIRED) so the frontend shows
 * an upsell modal instead of a generic "forbidden" error.
 */
export function requirePlanFeature(flag: FeatureFlag): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!config.features[flag]) return next(forbidden(`The ${flag} feature is not enabled`));
      if (!req.auth?.workspaceId) return next(forbidden('You do not have access to this workspace'));

      const account = await accountRepository.findByWorkspaceId(req.auth.workspaceId);
      if (!account) return next(notFound('Billing account not found'));

      const plan = (account.plan as WorkspacePlan) ?? 'FREE';
      if (!planIncludesFeature(plan, flag)) {
        return next(planUpgradeRequired(flag));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Hard paywall gate: reject unless the workspace's owning ACCOUNT has an active
 * (or dunning-grace-period) subscription. Fluxberry has no free tier — this is
 * the single gate almost every product route sits behind. Distinct 403 code
 * (SUBSCRIPTION_REQUIRED) so the frontend shows a "subscribe to continue"
 * prompt instead of a generic "forbidden" error.
 */
export const requireActiveSubscription: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth?.workspaceId) return next(forbidden('You do not have access to this workspace'));

    const account = await accountRepository.findByWorkspaceId(req.auth.workspaceId);
    if (!account) return next(notFound('Billing account not found'));

    const status = (account.billing?.subscriptionStatus as BillingSubscriptionStatus) ?? 'none';
    if (!ACTIVE_BILLING_STATUSES.includes(status)) {
      return next(subscriptionRequired());
    }
    next();
  } catch (err) {
    next(err);
  }
};
