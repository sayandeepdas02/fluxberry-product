import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { aiLimiter } from '../middleware/rate-limit';
import { jobController } from '../controllers/job.controller';
import { formController } from '../controllers/form.controller';
import { workflowController } from '../controllers/workflow.controller';
import {
  createJobSchema,
  updateJobSchema,
  generateJdSchema,
  jobListQuerySchema,
  jobStatusSchema,
  upsertFormSchema,
  upsertWorkflowSchema,
} from '@fluxberry/shared';

export const jobRouter = Router();

// Every job route is workspace-scoped.
jobRouter.use('/jobs', authenticate, resolveWorkspace, requireWorkspace);

jobRouter.get('/jobs', validateQuery(jobListQuerySchema), jobController.list);
jobRouter.post('/jobs', requireRole('recruiter'), validateBody(createJobSchema), jobController.create);
jobRouter.post(
  '/jobs/generate-description',
  requireRole('recruiter'),
  aiLimiter,
  validateBody(generateJdSchema),
  jobController.generateDescription,
);

jobRouter.get('/jobs/:jobId', jobController.get);
jobRouter.patch('/jobs/:jobId', requireRole('recruiter'), validateBody(updateJobSchema), jobController.update);
jobRouter.post('/jobs/:jobId/publish', requireRole('recruiter'), jobController.publish);
jobRouter.post(
  '/jobs/:jobId/status',
  requireRole('recruiter'),
  validateBody(jobStatusSchema),
  jobController.setStatus,
);

// Application form (one per job).
jobRouter.get('/jobs/:jobId/form', formController.get);
jobRouter.patch(
  '/jobs/:jobId/form',
  requireRole('recruiter'),
  validateBody(upsertFormSchema),
  formController.update,
);

// Workflow (one per job).
jobRouter.get('/jobs/:jobId/workflow', workflowController.get);
jobRouter.put(
  '/jobs/:jobId/workflow',
  requireRole('recruiter'),
  validateBody(upsertWorkflowSchema),
  workflowController.save,
);
