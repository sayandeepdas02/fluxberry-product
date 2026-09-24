import type { CreateCheckoutInput, CreateCreditPackCheckoutInput } from '../shared';
import { asyncHandler, ok } from '../utils/http';
import { billingService } from '../services/billing.service';

export const billingController = {
  createCheckout: asyncHandler(async (req, res) => {
    const { plan, billingCycle } = req.body as CreateCheckoutInput;
    const result = await billingService.createCheckout(req.auth!.workspaceId!, req.auth!.user.id, plan, billingCycle);
    ok(res, result);
  }),

  createCreditPackCheckout: asyncHandler(async (req, res) => {
    const { packId } = req.body as CreateCreditPackCheckoutInput;
    const result = await billingService.createCreditPackCheckout(req.auth!.workspaceId!, req.auth!.user.id, packId);
    ok(res, result);
  }),

  creditHistory: asyncHandler(async (req, res) => {
    const items = await billingService.getCreditHistory(req.auth!.workspaceId!);
    ok(res, { items });
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
    await billingService.handleWebhook(req.body as Buffer, {
      'webhook-id': req.header('webhook-id'),
      'webhook-signature': req.header('webhook-signature'),
      'webhook-timestamp': req.header('webhook-timestamp'),
    });
    ok(res, { received: true });
  }),
};
