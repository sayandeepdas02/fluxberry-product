import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config/env';

/** 404 for unmatched routes. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
};

/** Central error middleware — maps every error to the standard envelope. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Invalid identifier';
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    code = 'CONFLICT';
    message = 'A record with these details already exists';
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload failed';
  }

  // Log full detail server-side; never expose stack traces to clients (spec §80).
  const logLevel = status >= 500 ? 'error' : 'warn';
  logger[logLevel](
    { reqId: req.id, status, code, err: status >= 500 ? err : undefined },
    `${req.method} ${req.originalUrl} -> ${status} ${code}`,
  );

  const body: Record<string, unknown> = { code, message };
  if (details !== undefined) body.details = details;
  if (!config.isProd && status >= 500 && err instanceof Error) {
    body.stack = err.stack;
  }

  res.status(status).json({ success: false, error: body });
};

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}
