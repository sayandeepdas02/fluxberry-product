import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { careersController } from '../controllers/careers.controller';
import { updateCareersSchema } from '@fluxberry/shared';
import { coverImageUpload } from '../middleware/upload';

export const careersRouter = Router();
const guard = [authenticate, resolveWorkspace, requireWorkspace];

careersRouter.get('/careers', ...guard, careersController.get);
careersRouter.get('/careers/slug-available', ...guard, careersController.slugAvailable);
careersRouter.put('/careers', ...guard, requireRole('recruiter'), validateBody(updateCareersSchema), careersController.update);
careersRouter.post('/careers/slug', ...guard, requireRole('recruiter'), careersController.setSlug);
careersRouter.post('/careers/cover-image', ...guard, requireRole('recruiter'), coverImageUpload, careersController.uploadCoverImage);
careersRouter.post('/careers/preview-token', ...guard, requireRole('recruiter'), careersController.generatePreview);
