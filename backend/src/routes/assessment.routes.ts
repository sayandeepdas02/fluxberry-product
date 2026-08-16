import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { assessmentController } from '../controllers/assessment.controller';
import { createAssessmentSchema, updateAssessmentSchema, sendAssessmentSchema } from '@fluxberry/shared';

export const assessmentRouter = Router();
const guard = [authenticate, resolveWorkspace, requireWorkspace];

assessmentRouter.get('/assessments', ...guard, assessmentController.list);
assessmentRouter.post('/assessments', ...guard, requireRole('recruiter'), validateBody(createAssessmentSchema), assessmentController.create);
assessmentRouter.get('/assessments/:assessmentId', ...guard, assessmentController.get);
assessmentRouter.patch('/assessments/:assessmentId', ...guard, requireRole('recruiter'), validateBody(updateAssessmentSchema), assessmentController.update);

// Sending an assessment to a candidate + listing a candidate's assessments.
assessmentRouter.post(
  '/applications/:applicationId/assessments',
  ...guard,
  requireRole('recruiter'),
  validateBody(sendAssessmentSchema),
  assessmentController.send,
);
assessmentRouter.get('/applications/:applicationId/assessments', ...guard, assessmentController.listForApplication);
