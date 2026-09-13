import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { careersController } from '../controllers/careers.controller';
import { messageController } from '../controllers/message.controller';
import { referralController } from '../controllers/referral.controller';
import { applicationUpload } from '../middleware/upload';
import { publicApplyLimiter, uploadLimiter, assessmentLimiter, codingRunLimiter } from '../middleware/rate-limit';

/** Candidate-facing endpoints — no auth, clearly isolated (spec §60, §77). */
export const publicRouter = Router();

publicRouter.get('/public/jobs/:workspaceSlug/:jobSlug', publicController.getJob);

publicRouter.post(
  '/public/jobs/:workspaceSlug/:jobSlug/apply',
  publicApplyLimiter,
  uploadLimiter,
  applicationUpload,
  publicController.apply,
);

// Referral link resolution — resolved by the frontend's /r/[code] page, which
// redirects to the apply page with ?source=REFERRAL&ref=:code (spec §Phase 3.1).
publicRouter.get('/public/referrals/:code', referralController.resolvePublic);

// Public company careers page + embeddable jobs section.
publicRouter.get('/public/careers/:slug', careersController.publicGet);
publicRouter.get('/public/careers/:slug/jobs', careersController.publicJobs);

// Candidate assessment (token-gated, no account needed).
publicRouter.get('/public/assessments/:token', publicController.getAssessment);
publicRouter.post('/public/assessments/:token/start', assessmentLimiter, publicController.startAssessment);
publicRouter.post('/public/assessments/:token/answer', assessmentLimiter, publicController.autosaveAnswer);
publicRouter.post('/public/assessments/:token/run', codingRunLimiter, publicController.runCode);
publicRouter.post('/public/assessments/:token/submit', assessmentLimiter, publicController.submitAssessment);

// Candidate AI interview (token-gated, no account needed).
publicRouter.get('/public/interviews/:token', publicController.getInterview);
publicRouter.post('/public/interviews/:token/session', assessmentLimiter, publicController.interviewSession);
publicRouter.post('/public/interviews/:token/complete', assessmentLimiter, publicController.completeInterview);

// Interviewer access link — "link that only interviewer can access" (token-gated,
// no Fluxberry account needed; binary.so parity).
publicRouter.get('/public/interview-access/:token', publicController.getInterviewerAccess);
publicRouter.post('/public/interview-access/:token', assessmentLimiter, publicController.submitInterviewerFeedback);

// Bolna call webhook — unauthenticated but gated by an unguessable URL secret.
// (Bolna does not sign webhooks; we re-fetch the execution by id before trusting it.)
publicRouter.post('/webhooks/bolna/:secret', publicController.bolnaWebhook);

// Inbound candidate email replies — provider-agnostic, gated by an unguessable
// URL secret. Whichever inbound email vendor is configured should be set up to
// POST here with (or adapted to) { to, from, subject, text, messageId }.
publicRouter.post('/webhooks/inbound-email/:secret', messageController.inboundWebhook);
