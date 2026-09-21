import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireActiveSubscription } from '../middleware/auth';
import { asyncHandler, ok } from '../utils/http';
import { notificationService } from '../services/notification.service';

export const notificationRouter = Router();

notificationRouter.use(
  '/notifications',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
);

function actor(req: any) {
  return req.auth!.user.id as string;
}

notificationRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const result = await notificationService.list(req.auth!.workspaceId!, actor(req));
    ok(res, result);
  }),
);

notificationRouter.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.auth!.workspaceId!, actor(req), req.params.id);
    ok(res, { ok: true });
  }),
);

notificationRouter.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.auth!.workspaceId!, actor(req));
    ok(res, { ok: true });
  }),
);
