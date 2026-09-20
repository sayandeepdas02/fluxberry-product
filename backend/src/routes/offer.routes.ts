import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole, requireFeature } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { offerController } from '../controllers/offer.controller';
import { createOfferSchema } from '@fluxberry/shared';

export const offerRouter = Router();
const guard = [authenticate, resolveWorkspace, requireWorkspace];

offerRouter.post(
  '/applications/:applicationId/offers',
  ...guard,
  requireRole('recruiter'),
  requireFeature('OFFER_MANAGEMENT'),
  validateBody(createOfferSchema),
  offerController.create,
);
offerRouter.get('/applications/:applicationId/offers', ...guard, offerController.listForApplication);

offerRouter.post('/offers/:offerId/send', ...guard, requireRole('recruiter'), offerController.send);
offerRouter.post('/offers/:offerId/rescind', ...guard, requireRole('admin'), offerController.rescind);
