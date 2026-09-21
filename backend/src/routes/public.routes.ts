import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { careersController } from '../controllers/careers.controller';
import { messageController } from '../controllers/message.controller';
import { referralController } from '../controllers/referral.controller';
import { offerController } from '../controllers/offer.controller';
import { applicationUpload } from '../middleware/upload';
import { publicApplyLimiter, uploadLimiter } from '../middleware/rate-limit';
import { validateBody } from '../middleware/validate';
import { offerDecisionSchema } from '../shared';

/** Candidate-facing endpoints — no auth, clearly isolated (spec §60, §77). */
export const publicRouter = Router();

// Workspace invite (token-gated, no account needed to view).
publicRouter.get('/public/invites/:token', publicController.getInvite);

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

// Flat list of every published careers/job URL, consumed by the frontend's sitemap.xml.
publicRouter.get('/public/sitemap-entries', careersController.publicSitemapEntries);

// Public offer view + candidate response (token-gated, no account needed).
publicRouter.get('/public/offers/:token', offerController.getByToken);
publicRouter.post('/public/offers/:token/respond', publicApplyLimiter, validateBody(offerDecisionSchema), offerController.respond);

// Inbound candidate email replies — provider-agnostic, gated by an unguessable
// URL secret. Whichever inbound email vendor is configured should be set up to
// POST here with (or adapted to) { to, from, subject, text, messageId }.
publicRouter.post('/webhooks/inbound-email/:secret', messageController.inboundWebhook);
