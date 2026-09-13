import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole,
  requireFeature,
  requireJobAccess,
} from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { aiLimiter } from '../middleware/rate-limit';
import { jobController } from '../controllers/job.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { formController } from '../controllers/form.controller';
import { workflowController } from '../controllers/workflow.controller';
import { interviewController } from '../controllers/interview.controller';
import { assessmentController } from '../controllers/assessment.controller';
import {
  createJobSchema,
  updateJobSchema,
  updateJobAccessSchema,
  generateJdSchema,
  jobListQuerySchema,
  jobStatusSchema,
  upsertFormSchema,
  upsertWorkflowSchema,
  upsertInterviewConfigSchema,
  upsertPipelineStagesSchema,
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

// Every route below is keyed by :jobId, so a job scoped by `restrictedTo` must
// be invisible (404, not 403) to a caller who isn't in it — see requireJobAccess.
jobRouter.get('/jobs/:jobId', requireJobAccess, jobController.get);
jobRouter.patch('/jobs/:jobId', requireJobAccess, requireRole('recruiter'), validateBody(updateJobSchema), jobController.update);
jobRouter.post('/jobs/:jobId/clone', requireJobAccess, requireRole('recruiter'), jobController.clone);
jobRouter.post('/jobs/:jobId/publish', requireJobAccess, requireRole('recruiter'), jobController.publish);
jobRouter.post(
  '/jobs/:jobId/status',
  requireJobAccess,
  requireRole('recruiter'),
  validateBody(jobStatusSchema),
  jobController.setStatus,
);

// Access control itself: who is allowed to see this job.
jobRouter.put(
  '/jobs/:jobId/access',
  requireJobAccess,
  requireRole('recruiter'),
  validateBody(updateJobAccessSchema),
  jobController.updateAccess,
);

// Custom pipeline stages (one list per job; defaults to the 7 system stages).
jobRouter.get('/jobs/:jobId/stages', requireJobAccess, jobController.getStages);
jobRouter.put(
  '/jobs/:jobId/stages',
  requireJobAccess,
  requireRole('recruiter'),
  validateBody(upsertPipelineStagesSchema),
  jobController.updateStages,
);

// Per-job analytics.
jobRouter.get('/jobs/:jobId/analytics', requireJobAccess, analyticsController.getForJob);

// Per-job assessment status across all candidates.
jobRouter.get('/jobs/:jobId/assessments', requireJobAccess, assessmentController.listForJob);

// Application form (one per job).
jobRouter.get('/jobs/:jobId/form', requireJobAccess, formController.get);
jobRouter.patch(
  '/jobs/:jobId/form',
  requireJobAccess,
  requireRole('recruiter'),
  validateBody(upsertFormSchema),
  formController.update,
);

// Workflow (one per job).
jobRouter.get('/jobs/:jobId/workflow', requireJobAccess, workflowController.get);
jobRouter.put(
  '/jobs/:jobId/workflow',
  requireJobAccess,
  requireRole('recruiter'),
  validateBody(upsertWorkflowSchema),
  workflowController.save,
);

// AI interview configuration (one per job).
jobRouter.get('/jobs/:jobId/interview-config', requireJobAccess, interviewController.getConfig);
jobRouter.put(
  '/jobs/:jobId/interview-config',
  requireJobAccess,
  requireRole('recruiter'),
  requireFeature('AI_INTERVIEW'),
  validateBody(upsertInterviewConfigSchema),
  interviewController.updateConfig,
);
