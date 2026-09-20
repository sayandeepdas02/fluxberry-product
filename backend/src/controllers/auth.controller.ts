import { z } from 'zod';
import { asyncHandler, ok } from '../utils/http';
import { authService } from '../services/auth.service';
import { mintTestToken } from '../auth';
import { config } from '../config/env';
import { notFound } from '../utils/errors';
import type { UpdateProfileInput } from '../shared';

export const authController = {
  me: asyncHandler(async (req, res) => {
    const session = await authService.buildSession(req.auth!.user.id);
    ok(res, session);
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.auth!.user.id, req.body as UpdateProfileInput);
    ok(res, user);
  }),

  /** Dev-only: mint a signed test token so local/E2E can auth without Supabase. */
  createTestToken: asyncHandler(async (req, res) => {
    if (!config.auth.allowTestTokens) throw notFound('Not found');
    const body = z
      .object({ email: z.string().email(), name: z.string().optional() })
      .parse(req.body);
    const token = mintTestToken({
      sub: `test:${body.email.toLowerCase()}`,
      email: body.email.toLowerCase(),
      name: body.name,
    });
    ok(res, { token });
  }),
};
