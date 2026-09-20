import type { CreateCheckoutInput } from '../shared';
import { asyncHandler, ok } from '../utils/http';
import { billingService } from '../services/billing.service';

export const billingController = {
  createCheckout: asyncHandler(async (req, res) => {
    const { plan } = req.body as CreateCheckoutInput;
    const result = await billingService.createCheckout(req.auth!.workspaceId!, req.auth!.user.id, plan);
    ok(res, result);
  }),

  createPortalSession: asyncHandler(async (req, res) => {
    const result = await billingService.createPortalSession(req.auth!.workspaceId!);
    ok(res, result);
  }),

  getStatus: asyncHandler(async (req, res) => {
    const status = await billingService.getStatus(req.auth!.workspaceId!);
    ok(res, status);
  }),

  /**
   * Public webhook — no auth middleware, gated only by signature verification.
   * Mounted with a raw-body parser BEFORE the app's global express.json(), so
   * `req.body` here is a Buffer, not a parsed object.
   */
  webhook: asyncHandler(async (req, res) => {
    const signature = req.header('x-dodo-signature');
    await billingService.handleWebhook(req.body as Buffer, signature);
    ok(res, { received: true });
  }),
};
