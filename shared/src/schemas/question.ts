import { z } from 'zod';
import { QUESTION_TYPES, DIFFICULTIES } from '../enums';
import type { QuestionType, Difficulty } from '../enums';
import { paginationQuerySchema } from '../common';

export const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(500),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const createQuestionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES).default('MCQ'),
    questionText: z.string().trim().min(1).max(4000),
    options: z.array(questionOptionSchema).max(8).default([]),
    /** For MCQ: the correct option id (or ids). For CODING: unused in V1. */
    correctAnswer: z
      .union([z.string(), z.array(z.string())])
      .optional(),
    difficulty: z.enum(DIFFICULTIES).default('MEDIUM'),
    category: z.string().trim().min(1).max(60),
    skills: z.array(z.string().trim()).max(20).default([]),
    tags: z.array(z.string().trim()).max(20).default([]),
    explanation: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'MCQ') {
      if (v.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCQ needs at least 2 options',
          path: ['options'],
        });
      }
      const ids = new Set(v.options.map((o) => o.id));
      const answers = Array.isArray(v.correctAnswer)
        ? v.correctAnswer
        : v.correctAnswer
          ? [v.correctAnswer]
          : [];
      if (answers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select the correct answer',
          path: ['correctAnswer'],
        });
      }
      for (const a of answers) {
        if (!ids.has(a)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Correct answer must be one of the options',
            path: ['correctAnswer'],
          });
        }
      }
    }
  });
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export const questionListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(QUESTION_TYPES).optional(),
  category: z.string().trim().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  skill: z.string().trim().optional(),
  search: z.string().trim().optional(),
});
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export type QuestionDto = {
  id: string;
  workspaceId: string;
  type: QuestionType;
  questionText: string;
  options: QuestionOption[];
  correctAnswer?: string | string[] | null;
  difficulty: Difficulty;
  category: string;
  skills: string[];
  tags: string[];
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Candidate-facing question — never includes the correct answer. */
export type PublicQuestionDto = {
  id: string;
  type: QuestionType;
  questionText: string;
  options: QuestionOption[];
};
