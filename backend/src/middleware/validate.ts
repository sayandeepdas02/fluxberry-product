import type { RequestHandler } from 'express';
import type { ZodTypeAny, infer as ZInfer } from 'zod';
import { validationError } from '../utils/errors';

type Part = 'body' | 'query' | 'params';

/** Parse and replace a request part with the validated, typed result. */
function make(part: Part) {
  return function validate<S extends ZodTypeAny>(schema: S): RequestHandler {
    return (req, _res, next) => {
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(
          validationError(
            'Validation failed',
            result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          ),
        );
      }
      // Express 4 `query`/`params` are read-only getters in some setups; assign safely.
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
      next();
    };
  };
}

export const validateBody = make('body');
export const validateQuery = make('query');
export const validateParams = make('params');

/** Helper to read a strongly-typed body after validateBody(schema). */
export type Validated<S extends ZodTypeAny> = ZInfer<S>;
