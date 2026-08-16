import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

/** Assigns a request id (from client header or generated) for tracing (spec §66). */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 100 ? incoming : crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
