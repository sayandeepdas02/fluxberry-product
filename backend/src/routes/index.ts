import { Router } from 'express';
import { metaRouter } from './meta.routes';
import { authRouter } from './auth.routes';
import { workspaceRouter } from './workspace.routes';
import { jobRouter } from './job.routes';
import { candidateRouter } from './candidate.routes';
import { analyticsRouter } from './analytics.routes';
import { notificationRouter } from './notification.routes';
import { careersRouter } from './careers.routes';
import { publicRouter } from './public.routes';
import { billingRouter } from './billing.routes';
import { labelRouter } from './label.routes';
import { referralRouter } from './referral.routes';
import { integrationsRouter } from './integrations.routes';
import { gdprRouter } from './gdpr.routes';
import { offerRouter } from './offer.routes';
import { webhookEndpointRouter } from './webhook-endpoint.routes';
import { bulkImportRouter } from './bulk-import.routes';

/**
 * Versioned API router (/api/v1). Sub-routers are mounted here per slice:
 *   auth, workspaces, jobs, candidates, applications, workflows, analytics, and public/*.
 */
export const apiRouter = Router();

apiRouter.use(metaRouter);
apiRouter.use(authRouter);
apiRouter.use(workspaceRouter);
apiRouter.use(jobRouter);
apiRouter.use(candidateRouter);
apiRouter.use(analyticsRouter);
apiRouter.use(notificationRouter);
apiRouter.use(careersRouter);
apiRouter.use(publicRouter);
apiRouter.use(billingRouter);
apiRouter.use(labelRouter);
apiRouter.use(referralRouter);
apiRouter.use(integrationsRouter);
apiRouter.use(gdprRouter);
apiRouter.use(offerRouter);
apiRouter.use(webhookEndpointRouter);
apiRouter.use(bulkImportRouter);

// Workflow router is registered in Slice 7.
