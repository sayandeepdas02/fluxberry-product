import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rate-limit';
import { authController } from '../controllers/auth.controller';
import { updateProfileSchema } from '../shared';

export const authRouter = Router();

authRouter.get('/auth/me', authenticate, authController.me);
authRouter.patch('/auth/profile', authenticate, validateBody(updateProfileSchema), authController.updateProfile);

// Dev-only helper (gated in the controller by AUTH_ALLOW_TEST_TOKENS).
authRouter.post('/auth/test-token', authLimiter, authController.createTestToken);
