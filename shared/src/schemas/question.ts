import { z } from 'zod';
import { QUESTION_TYPES, DIFFICULTIES } from '../enums';
import type { QuestionType, Difficulty } from '../enums';
import { CODING_LANGUAGE_IDS, CODING_MAX_TEST_CASES } from '../coding';
import { paginationQuerySchema } from '../common';

export const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(500),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

// ---- Coding question spec (Judge0-backed) ---------------------------------

export const codingTestCaseSchema = z.object({
  /** stdin fed to the program. */
  input: z.string().max(20_000).default(''),
  /** Expected stdout — compared (trimmed) against the program output. */
  expected: z.string().max(20_000).default(''),
  /** Hidden test cases are never sent to the candidate; graded server-side only. */
  hidden: z.boolean().default(false),
  points: z.number().min(0).max(100).default(1),
});
export type CodingTestCase = z.infer<typeof codingTestCaseSchema>;

export const codingStarterSchema = z.object({
  languageId: z.number().int(),
  code: z.string().max(20_000).default(''),
});
export type CodingStarter = z.infer<typeof codingStarterSchema>;

export const codingSpecSchema = z.object({
  /** Judge0 language_ids the candidate may choose from (from the shared catalog). */
  languageIds: z
    .array(z.number().int().refine((id) => CODING_LANGUAGE_IDS.includes(id), 'Unsupported language'))
    .min(1)
    .max(CODING_LANGUAGE_IDS.length),
  starterCode: z.array(codingStarterSchema).max(CODING_LANGUAGE_IDS.length).default([]),
  testCases: z.array(codingTestCaseSchema).min(1).max(CODING_MAX_TEST_CASES),
  /** Per-run limits (seconds / KB). Optional — provider defaults apply otherwise. */
  cpuTimeLimit: z.number().min(1).max(20).optional(),
  memoryLimit: z.number().int().min(16_000).max(512_000).optional(),
});
export type CodingSpec = z.infer<typeof codingSpecSchema>;

/** Candidate-facing coding spec — hidden test cases and expected outputs stripped. */
export type PublicCodingSpec = {
  languageIds: number[];
  starterCode: CodingStarter[];
  /** Only non-hidden ("sample") test cases; the candidate sees these. */
  sampleTestCases: Array<{ input: string; expected: string }>;
  cpuTimeLimit?: number | null;
  memoryLimit?: number | null;
};

export const createQuestionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES).default('MCQ'),
    questionText: z.string().trim().min(1).max(4000),
    options: z.array(questionOptionSchema).max(8).default([]),
    /** For MCQ: the correct option id (or ids). For CODING: unused (test cases grade it). */
    correctAnswer: z
      .union([z.string(), z.array(z.string())])
      .optional(),
    /** CODING questions carry their Judge0 spec here (languages, test cases, limits). */
    coding: codingSpecSchema.optional(),
    difficulty: z.enum(DIFFICULTIES).default('MEDIUM'),
    category: z.string().trim().min(1).max(60),
    skills: z.array(z.string().trim()).max(20).default([]),
    tags: z.array(z.string().trim()).max(20).default([]),
    explanation: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'CODING') {
      if (!v.coding) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Coding questions need a language + test-case spec',
          path: ['coding'],
        });
        return;
      }
      // Every starter-code entry must reference an offered language.
      for (const s of v.coding.starterCode) {
        if (!v.coding.languageIds.includes(s.languageId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Starter code references a language not offered for this question',
            path: ['coding', 'starterCode'],
          });
        }
      }
    }
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
  coding?: CodingSpec | null;
  difficulty: Difficulty;
  category: string;
  skills: string[];
  tags: string[];
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Candidate-facing question — never includes the correct answer or hidden tests. */
export type PublicQuestionDto = {
  id: string;
  type: QuestionType;
  questionText: string;
  options: QuestionOption[];
  coding?: PublicCodingSpec | null;
};
