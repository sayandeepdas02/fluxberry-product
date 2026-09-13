import { asyncHandler, ok, created } from '../utils/http';
import { messageService } from '../services/message.service';
import type { SendMessageInput } from '@fluxberry/shared';

export const messageController = {
  list: asyncHandler(async (req, res) => {
    const messages = await messageService.listByApplication(req.auth!.workspaceId!, req.params.applicationId);
    ok(res, messages);
  }),

  send: asyncHandler(async (req, res) => {
    const message = await messageService.sendAdHoc(
      req.auth!.workspaceId!,
      req.params.applicationId,
      req.auth!.user.id,
      req.body as SendMessageInput,
    );
    created(res, message);
  }),

  /** Public webhook — no auth, gated only by the URL secret. Untrusted payload. */
  inboundWebhook: asyncHandler(async (req, res) => {
    await messageService.receiveInbound(req.params.secret, req.body);
    ok(res, { received: true });
  }),
};
