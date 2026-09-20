import { asyncHandler, ok, created } from '../utils/http';
import { offerService } from '../services/offer.service';
import type { CreateOfferInput } from '@fluxberry/shared';

function actor(req: any) {
  return { userId: req.auth.user.id, label: req.auth.user.name };
}

export const offerController = {
  create: asyncHandler(async (req, res) => {
    const offer = await offerService.create(
      req.auth!.workspaceId!,
      req.params.applicationId,
      req.auth!.user.id,
      req.body as CreateOfferInput,
    );
    created(res, offer);
  }),
  send: asyncHandler(async (req, res) => {
    ok(res, await offerService.send(req.auth!.workspaceId!, req.params.offerId, actor(req)));
  }),
  rescind: asyncHandler(async (req, res) => {
    ok(res, await offerService.rescind(req.auth!.workspaceId!, req.params.offerId, actor(req)));
  }),
  listForApplication: asyncHandler(async (req, res) => {
    ok(res, await offerService.listForApplication(req.auth!.workspaceId!, req.params.applicationId));
  }),

  // ---- Public, token-gated ----
  getByToken: asyncHandler(async (req, res) => {
    ok(res, await offerService.getByToken(req.params.token));
  }),
  respond: asyncHandler(async (req, res) => {
    ok(res, await offerService.respond(req.params.token, req.body));
  }),
};
