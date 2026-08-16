import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { questionController } from '../controllers/question.controller';
import { createQuestionSchema, updateQuestionSchema, questionListQuerySchema } from '@fluxberry/shared';

export const questionRouter = Router();
questionRouter.use('/questions', authenticate, resolveWorkspace, requireWorkspace);

questionRouter.get('/questions', validateQuery(questionListQuerySchema), questionController.list);
questionRouter.get('/questions/categories', questionController.categories);
questionRouter.post('/questions', requireRole('recruiter'), validateBody(createQuestionSchema), questionController.create);
questionRouter.get('/questions/:questionId', questionController.get);
questionRouter.patch('/questions/:questionId', requireRole('recruiter'), validateBody(updateQuestionSchema), questionController.update);
questionRouter.delete('/questions/:questionId', requireRole('recruiter'), questionController.archive);
