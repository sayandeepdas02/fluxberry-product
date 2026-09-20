import { Router } from 'express';
import { organizerAvailabilityQuerySchema } from '../shared';
import { authenticate, resolveWorkspace, requireWorkspace } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { calendarIntegrationController } from '../controllers/calendar-integration.controller';

export const integrationsRouter = Router();

// Public — Google (or the mock provider) redirects the browser here directly
// after consent, with no auth header available. Registered before the
// authenticated group below so it matches first and never hits that middleware.
integrationsRouter.get('/integrations/google-calendar/callback', calendarIntegrationController.callback);

integrationsRouter.use('/integrations/google-calendar', authenticate, resolveWorkspace, requireWorkspace);
integrationsRouter.get('/integrations/google-calendar/status', calendarIntegrationController.status);
integrationsRouter.get('/integrations/google-calendar/connect', calendarIntegrationController.connect);
integrationsRouter.delete('/integrations/google-calendar', calendarIntegrationController.disconnect);
integrationsRouter.get(
  '/integrations/google-calendar/availability',
  validateQuery(organizerAvailabilityQuerySchema),
  calendarIntegrationController.availability,
);
