import type { Response, Request, NextFunction, RequestHandler } from 'express';
import { config } from '../config/env';

/**
 * The externally-reachable origin for this request. Prefers an operator-set
 * `PUBLIC_API_URL` (needed when the app sits behind infra where the request's
 * own host doesn't match the public one), otherwise derives it from the
 * request itself — correct behind a reverse proxy since `trust proxy` is
 * configured in `app.ts`. Used to build absolute links (e.g. signed file
 * URLs) that must work from the browser, not just from this server's own
 * view of `localhost`.
 */
export function requestOrigin(req: Request): string {
  return config.publicApiUrlExplicit || `${req.protocol}://${req.get('host')}`;
}

/** Reads `?disposition=` off the query string, defaulting to 'inline'. */
export function requestDisposition(req: Request): 'inline' | 'attachment' {
  return req.query.disposition === 'attachment' ? 'attachment' : 'inline';
}

/** Success envelope helper: res + data (+ optional status). */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Wraps an async route handler so thrown errors flow to the error middleware
 * instead of crashing the process (spec §80).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
