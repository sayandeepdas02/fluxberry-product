import { z } from 'zod';
import { FORM_QUESTION_TYPES } from '../enums';
import type { FormQuestionType } from '../enums';

export const formOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(200),
});
export type FormOption = z.infer<typeof formOptionSchema>;

export const formQuestionSchema = z.object({
  id: z.string().min(1),
  /** Present for the 8 built-in default fields (e.g. "email"); absent for custom questions. */
  key: z.string().optional(),
  type: z.enum(FORM_QUESTION_TYPES),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  options: z.array(formOptionSchema).default([]),
  sortOrder: z.number().int().default(0),
  /** System default fields can be disabled but not deleted. */
  system: z.boolean().default(false),
});
export type FormQuestion = z.infer<typeof formQuestionSchema>;

/** Replace the whole set of form questions (simple sortable list, spec §19). */
export const upsertFormSchema = z.object({
  questions: z.array(formQuestionSchema).max(60),
});
export type UpsertFormInput = z.infer<typeof upsertFormSchema>;

export type ApplicationFormDto = {
  id: string;
  jobId: string;
  questions: FormQuestion[];
  createdAt: string;
  updatedAt: string;
};

/** The 8 default candidate fields, enabled by default (spec §18). */
export const DEFAULT_FORM_FIELDS: Array<{
  key: string;
  type: FormQuestionType;
  label: string;
  required: boolean;
}> = [
  { key: 'fullName', type: 'SHORT_TEXT', label: 'Full name', required: true },
  { key: 'email', type: 'SHORT_TEXT', label: 'Email', required: true },
  { key: 'phone', type: 'SHORT_TEXT', label: 'Phone', required: false },
  { key: 'resume', type: 'FILE_UPLOAD', label: 'Resume', required: true },
  { key: 'currentLocation', type: 'SHORT_TEXT', label: 'Current location', required: false },
  { key: 'currentSalary', type: 'NUMBER', label: 'Current salary', required: false },
  { key: 'expectedSalary', type: 'NUMBER', label: 'Expected salary', required: false },
  { key: 'linkedinUrl', type: 'SHORT_TEXT', label: 'LinkedIn', required: false },
];
