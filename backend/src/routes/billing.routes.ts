import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { billingController } from '../controllers/billing.controller';
import { createCheckoutSchema } from '@fluxberry/shared';

export const billingRouter = Router();

const guard = [authenticate, resolveWorkspace, requireWorkspace] as const;

billingRouter.get('/workspaces/:workspaceId/billing', ...guard, requireRole('admin'), billingController.getStatus);

billingRouter.post(
  '/workspaces/:workspaceId/billing/checkout',
  ...guard,
  requireRole('owner'),
  validateBody(createCheckoutSchema),
  billingController.createCheckout,
);

billingRouter.post(
  '/workspaces/:workspaceId/billing/portal',
  ...guard,
  requireRole('owner'),
  billingController.createPortalSession,
);

// Note: the webhook route (POST /api/v1/webhooks/dodo) is intentionally NOT
// mounted here — it needs a raw request body for signature verification,
// which must be wired before the app's global express.json() middleware.
// See backend/src/app.ts.
