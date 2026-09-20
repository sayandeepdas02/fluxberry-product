import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionListQuery,
  QuestionDto,
  Paginated,
} from '../shared';
import { questionRepository } from '../repositories/question.repository';
import { toQuestionDto } from '../serializers/assessment.serializer';
import { notFound } from '../utils/errors';

export const questionService = {
  async create(workspaceId: string, userId: string, input: CreateQuestionInput): Promise<QuestionDto> {
    const q = await questionRepository.create({ ...input, workspaceId, createdBy: userId });
    return toQuestionDto(q.toObject());
  },

  async update(workspaceId: string, id: string, input: UpdateQuestionInput): Promise<QuestionDto> {
    const existing = await questionRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Question not found');
    const q = await questionRepository.update(id, input);
    return toQuestionDto(q!.toObject());
  },

  async get(workspaceId: string, id: string): Promise<QuestionDto> {
    const q = await questionRepository.findInWorkspace(workspaceId, id);
    if (!q) throw notFound('Question not found');
    return toQuestionDto(q.toObject());
  },

  async list(workspaceId: string, query: QuestionListQuery): Promise<Paginated<QuestionDto>> {
    const { items, total, page, limit } = await questionRepository.list(workspaceId, query);
    return { items: items.map(toQuestionDto), total, page, limit };
  },

  async archive(workspaceId: string, id: string): Promise<void> {
    const existing = await questionRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Question not found');
    await questionRepository.update(id, { archived: true });
  },

  categories(workspaceId: string): Promise<string[]> {
    return questionRepository.distinctCategories(workspaceId);
  },
};
