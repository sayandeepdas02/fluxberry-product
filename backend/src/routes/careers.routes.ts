import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireRole,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { avatarUpload, coverImageUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rate-limit';
import { careersController } from '../controllers/careers.controller';
import { updateCareersSchema } from '../shared';

export const careersRouter = Router();
const guard = [authenticate, resolveWorkspace, requireWorkspace, requireActiveSubscription];

careersRouter.get('/careers', ...guard, careersController.get);
careersRouter.get('/careers/slug-available', ...guard, careersController.slugAvailable);
careersRouter.put('/careers', ...guard, requireRole('recruiter'), validateBody(updateCareersSchema), careersController.update);
careersRouter.post('/careers/slug', ...guard, requireRole('recruiter'), careersController.setSlug);
careersRouter.post('/careers/avatar', ...guard, requireRole('recruiter'), uploadLimiter, avatarUpload, careersController.uploadAvatar);
careersRouter.post('/careers/cover-image', ...guard, requireRole('recruiter'), coverImageUpload, careersController.uploadCoverImage);
careersRouter.post('/careers/preview-token', ...guard, requireRole('recruiter'), careersController.generatePreview);
