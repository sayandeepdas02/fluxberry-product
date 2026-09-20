import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole,
  requirePlanFeature,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { bulkImportUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rate-limit';
import { bulkImportController } from '../controllers/bulk-import.controller';
import { bulkImportColumnMappingSchema } from '@fluxberry/shared';

export const bulkImportRouter = Router();

const guard = [
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('recruiter'),
  requirePlanFeature('BULK_IMPORT'),
] as const;

bulkImportRouter.post('/bulk-imports', ...guard, uploadLimiter, bulkImportUpload, bulkImportController.create);
bulkImportRouter.patch(
  '/bulk-imports/:importId/mapping',
  ...guard,
  validateBody(bulkImportColumnMappingSchema),
  bulkImportController.submitMapping,
);
bulkImportRouter.post('/bulk-imports/:importId/commit', ...guard, bulkImportController.commit);
bulkImportRouter.get('/bulk-imports/:importId', ...guard, bulkImportController.getStatus);
bulkImportRouter.get('/bulk-imports', ...guard, bulkImportController.list);
