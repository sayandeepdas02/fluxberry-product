import type { FilterQuery } from 'mongoose';
import { QuestionModel, type QuestionDoc } from '../models/question.model';
import type { QuestionListQuery } from '@fluxberry/shared';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const questionRepository = {
  create: (data: Record<string, any>) => QuestionModel.create(data),
  findInWorkspace: (workspaceId: string, id: string) => QuestionModel.findOne({ _id: id, workspaceId }),
  findByIds: (workspaceId: string, ids: string[]) =>
    QuestionModel.find({ workspaceId, _id: { $in: ids } }).lean(),
  update: (id: string, patch: Record<string, any>) =>
    QuestionModel.findByIdAndUpdate(id, patch, { new: true }),

  async list(workspaceId: string, q: QuestionListQuery) {
    const filter: FilterQuery<QuestionDoc> = { workspaceId, archived: false };
    if (q.type) filter.type = q.type;
    if (q.category) filter.category = q.category;
    if (q.difficulty) filter.difficulty = q.difficulty;
    if (q.skill) filter.skills = { $in: [new RegExp(escapeRegex(q.skill), 'i')] };
    if (q.search) filter.questionText = { $regex: escapeRegex(q.search), $options: 'i' };
    const limit = q.limit;
    const page = q.page ?? 1;
    const [items, total] = await Promise.all([
      QuestionModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      QuestionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  distinctCategories: (workspaceId: string) => QuestionModel.distinct('category', { workspaceId, archived: false }),
};
