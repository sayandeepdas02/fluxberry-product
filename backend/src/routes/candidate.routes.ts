import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireRole,
  requireApplicationJobAccess,
} from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { candidateController } from '../controllers/candidate.controller';
import { applicationController } from '../controllers/application.controller';
import { labelController } from '../controllers/label.controller';
import { messageController } from '../controllers/message.controller';
import {
  candidateListQuerySchema,
  stageChangeSchema,
  rejectApplicationSchema,
  bulkActionSchema,
  setApplicationLabelsSchema,
  sendMessageSchema,
} from '../shared';

export const candidateRouter = Router();

candidateRouter.use(
  ['/candidates', '/applications'],
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
);

// Candidates
candidateRouter.get('/candidates', validateQuery(candidateListQuerySchema), candidateController.list);
candidateRouter.get('/candidates/:candidateId', candidateController.getProfile);
candidateRouter.get('/candidates/:candidateId/resume-url', candidateController.getResumeUrl);

// Bulk application actions (must be before /:applicationId routes to avoid param clash).
candidateRouter.post(
  '/applications/bulk-action',
  requireRole('recruiter'),
  validateBody(bulkActionSchema),
  applicationController.bulkAction,
);

// Applications — every route below is keyed by :applicationId, so a restricted
// application must be invisible (404) to an excluded caller, same as jobs.
candidateRouter.use('/applications/:applicationId', requireApplicationJobAccess);

candidateRouter.get('/applications/:applicationId', applicationController.getDetail);
candidateRouter.get('/applications/:applicationId/answers/:questionId/file-url', applicationController.getAnswerFileUrl);
candidateRouter.get('/applications/:applicationId/timeline', applicationController.getTimeline);
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
candidateRouter.put(
  '/applications/:applicationId/labels',
  requireRole('recruiter'),
  validateBody(setApplicationLabelsSchema),
  labelController.setApplicationLabels,
);

// Candidate messaging (a thread per application).
candidateRouter.get('/applications/:applicationId/messages', messageController.list);
candidateRouter.post(
  '/applications/:applicationId/messages',
  requireRole('recruiter'),
  validateBody(sendMessageSchema),
  messageController.send,
);
