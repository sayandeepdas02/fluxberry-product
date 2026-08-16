import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole, requireFeature } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { candidateController } from '../controllers/candidate.controller';
import { applicationController } from '../controllers/application.controller';
import { workflowController } from '../controllers/workflow.controller';
import { interviewController } from '../controllers/interview.controller';
import { candidateListQuerySchema, stageChangeSchema, rejectApplicationSchema, sendInterviewSchema } from '@fluxberry/shared';

export const candidateRouter = Router();

candidateRouter.use(['/candidates', '/applications'], authenticate, resolveWorkspace, requireWorkspace);

// Candidates
candidateRouter.get('/candidates', validateQuery(candidateListQuerySchema), candidateController.list);
candidateRouter.get('/candidates/:candidateId', candidateController.getProfile);
candidateRouter.get('/candidates/:candidateId/resume-url', candidateController.getResumeUrl);

// Applications
candidateRouter.get('/applications/:applicationId', applicationController.getDetail);
candidateRouter.get('/applications/:applicationId/timeline', applicationController.getTimeline);
candidateRouter.get('/applications/:applicationId/workflow-run', workflowController.getRun);
candidateRouter.post(
  '/applications/:applicationId/stage',
  requireRole('recruiter'),
  validateBody(stageChangeSchema),
  applicationController.moveStage,
);
candidateRouter.post('/applications/:applicationId/shortlist', requireRole('recruiter'), applicationController.shortlist);
candidateRouter.post('/applications/:applicationId/hire', requireRole('recruiter'), applicationController.hire);
candidateRouter.post('/applications/:applicationId/rescreen', requireRole('recruiter'), applicationController.rescreen);
candidateRouter.post(
  '/applications/:applicationId/reject',
  requireRole('recruiter'),
  validateBody(rejectApplicationSchema),
  applicationController.reject,
);

// AI interviews for an application.
candidateRouter.get('/applications/:applicationId/interviews', interviewController.listForApplication);
candidateRouter.post(
  '/applications/:applicationId/interview',
  requireRole('recruiter'),
  requireFeature('AI_INTERVIEW'),
  validateBody(sendInterviewSchema),
  interviewController.send,
);
