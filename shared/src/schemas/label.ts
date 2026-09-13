import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(30),
});
export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(30).optional(),
});
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;

/** Full-replace semantics — simplest contract for a tag-picker UI. */
export const setApplicationLabelsSchema = z.object({
  labelIds: z.array(z.string().min(1)).max(20),
});
export type SetApplicationLabelsInput = z.infer<typeof setApplicationLabelsSchema>;

export type LabelDto = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
};
