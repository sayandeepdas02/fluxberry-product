/**
 * Typed application errors. Controllers/services throw these; the central error
 * middleware turns them into the `{ success:false, error:{code,message} }`
 * envelope. Never leak stack traces to clients (spec §80).
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PROVIDER_ERROR'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    opts?: { details?: unknown; expose?: boolean },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = opts?.details;
    this.expose = opts?.expose ?? true;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message = 'Bad request', details?: unknown) =>
  new AppError('BAD_REQUEST', message, 400, { details });

export const validationError = (message = 'Validation failed', details?: unknown) =>
  new AppError('VALIDATION_ERROR', message, 422, { details });

export const unauthorized = (message = 'Not authenticated') =>
  new AppError('UNAUTHORIZED', message, 401);

export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError('FORBIDDEN', message, 403);

export const notFound = (message = 'Not found') =>
  new AppError('NOT_FOUND', message, 404);

export const conflict = (message = 'Conflict', details?: unknown) =>
  new AppError('CONFLICT', message, 409, { details });

export const payloadTooLarge = (message = 'File too large') =>
  new AppError('PAYLOAD_TOO_LARGE', message, 413);

export const unsupportedMediaType = (message = 'Unsupported file type') =>
  new AppError('UNSUPPORTED_MEDIA_TYPE', message, 415);

export const providerError = (message = 'Upstream provider failed') =>
  new AppError('PROVIDER_ERROR', message, 502, { expose: true });
