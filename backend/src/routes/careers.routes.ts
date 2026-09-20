import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { avatarUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rate-limit';
import { careersController } from '../controllers/careers.controller';
import { updateCareersSchema } from '@fluxberry/shared';

export const careersRouter = Router();
const guard = [authenticate, resolveWorkspace, requireWorkspace];

careersRouter.get('/careers', ...guard, careersController.get);
careersRouter.get('/careers/slug-available', ...guard, careersController.slugAvailable);
careersRouter.put('/careers', ...guard, requireRole('recruiter'), validateBody(updateCareersSchema), careersController.update);
careersRouter.post('/careers/slug', ...guard, requireRole('recruiter'), careersController.setSlug);
careersRouter.post('/careers/avatar', ...guard, requireRole('recruiter'), uploadLimiter, avatarUpload, careersController.uploadAvatar);
