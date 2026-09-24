import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { billingController } from '../controllers/billing.controller';
import { createCheckoutSchema, createCreditPackCheckoutSchema } from '../shared';

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

// Buying AI-credit top-up packs — allowed for owners and admins (billing managers).
billingRouter.post(
  '/workspaces/:workspaceId/billing/credits/checkout',
  ...guard,
  requireRole('admin'),
  validateBody(createCreditPackCheckoutSchema),
  billingController.createCreditPackCheckout,
);

billingRouter.get(
  '/workspaces/:workspaceId/billing/credits/history',
  ...guard,
  requireRole('admin'),
  billingController.creditHistory,
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
