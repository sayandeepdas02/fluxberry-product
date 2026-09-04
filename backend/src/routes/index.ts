import { Router } from 'express';
import { metaRouter } from './meta.routes';
import { authRouter } from './auth.routes';
import { workspaceRouter } from './workspace.routes';
import { jobRouter } from './job.routes';
import { candidateRouter } from './candidate.routes';
import { questionRouter } from './question.routes';
import { assessmentRouter } from './assessment.routes';
import { analyticsRouter } from './analytics.routes';
import { notificationRouter } from './notification.routes';
import { careersRouter } from './careers.routes';
import { publicRouter } from './public.routes';

/**
 * Versioned API router (/api/v1). Sub-routers are mounted here per slice:
 *   auth, workspaces, jobs, candidates, applications, assessments,
 *   questions, workflows, analytics, interviews, and public/*.
 */
export const apiRouter = Router();

apiRouter.use(metaRouter);
apiRouter.use(authRouter);
apiRouter.use(workspaceRouter);
apiRouter.use(jobRouter);
apiRouter.use(candidateRouter);
apiRouter.use(questionRouter);
apiRouter.use(assessmentRouter);
apiRouter.use(analyticsRouter);
apiRouter.use(notificationRouter);
apiRouter.use(careersRouter);
apiRouter.use(publicRouter);

// Workflow router is registered in Slice 7.
