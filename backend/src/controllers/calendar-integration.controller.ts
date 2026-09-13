import { asyncHandler, ok } from '../utils/http';
import { calendarConnectionService } from '../services/calendar-connection.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const calendarIntegrationController = {
  connect: asyncHandler(async (req, res) => {
    const url = calendarConnectionService.getAuthUrl(req.auth!.workspaceId!, req.auth!.user.id);
    ok(res, { url });
  }),

  /** Public — Google (or the mock provider) redirects the browser here directly, no auth header available. */
  callback: asyncHandler(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      res.redirect(`${config.publicAppUrl}/app/settings/integrations?calendar=error`);
      return;
    }
    try {
      const { redirectUrl } = await calendarConnectionService.handleCallback(code, state);
      res.redirect(redirectUrl);
    } catch (err) {
      logger.error({ err }, 'google calendar callback failed');
      res.redirect(`${config.publicAppUrl}/app/settings/integrations?calendar=error`);
    }
  }),

  status: asyncHandler(async (req, res) => {
    ok(res, await calendarConnectionService.getStatus(req.auth!.workspaceId!, req.auth!.user.id));
  }),

  disconnect: asyncHandler(async (req, res) => {
    await calendarConnectionService.disconnect(req.auth!.workspaceId!, req.auth!.user.id);
    ok(res, { disconnected: true });
  }),
};
