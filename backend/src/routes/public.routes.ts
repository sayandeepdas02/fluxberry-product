import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { careersController } from '../controllers/careers.controller';
import { resumeUpload } from '../middleware/upload';
import { publicApplyLimiter, uploadLimiter, assessmentLimiter, codingRunLimiter } from '../middleware/rate-limit';

/** Candidate-facing endpoints — no auth, clearly isolated (spec §60, §77). */
export const publicRouter = Router();

publicRouter.get('/public/jobs/:workspaceSlug/:jobSlug', publicController.getJob);

publicRouter.post(
  '/public/jobs/:workspaceSlug/:jobSlug/apply',
  publicApplyLimiter,
  uploadLimiter,
  resumeUpload,
  publicController.apply,
);

// Public company careers page + embeddable jobs section.
publicRouter.get('/public/careers/:slug', careersController.publicGet);
publicRouter.get('/public/careers/:slug/jobs', careersController.publicJobs);

// Candidate assessment (token-gated, no account needed).
publicRouter.get('/public/assessments/:token', publicController.getAssessment);
publicRouter.post('/public/assessments/:token/start', assessmentLimiter, publicController.startAssessment);
publicRouter.post('/public/assessments/:token/answer', assessmentLimiter, publicController.autosaveAnswer);
publicRouter.post('/public/assessments/:token/run', codingRunLimiter, publicController.runCode);
publicRouter.post('/public/assessments/:token/submit', assessmentLimiter, publicController.submitAssessment);
