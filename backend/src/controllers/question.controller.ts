import { asyncHandler, ok, created, noContent } from '../utils/http';
import { questionService } from '../services/question.service';
import type { CreateQuestionInput, UpdateQuestionInput, QuestionListQuery } from '../shared';

export const questionController = {
  list: asyncHandler(async (req, res) => {
    const result = await questionService.list(req.auth!.workspaceId!, req.query as unknown as QuestionListQuery);
    ok(res, result);
  }),
  categories: asyncHandler(async (req, res) => {
    ok(res, await questionService.categories(req.auth!.workspaceId!));
  }),
  get: asyncHandler(async (req, res) => {
    ok(res, await questionService.get(req.auth!.workspaceId!, req.params.questionId));
  }),
  create: asyncHandler(async (req, res) => {
    const q = await questionService.create(req.auth!.workspaceId!, req.auth!.user.id, req.body as CreateQuestionInput);
    created(res, q);
  }),
  update: asyncHandler(async (req, res) => {
    const q = await questionService.update(req.auth!.workspaceId!, req.params.questionId, req.body as UpdateQuestionInput);
    ok(res, q);
  }),
  archive: asyncHandler(async (req, res) => {
    await questionService.archive(req.auth!.workspaceId!, req.params.questionId);
    noContent(res);
  }),
};
