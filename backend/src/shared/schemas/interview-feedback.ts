import { z } from 'zod';
import { INTERVIEW_FEEDBACK_RATINGS } from '../enums';
import type { InterviewFeedbackRating } from '../enums';

/** "Add feedback" — binary.so parity: Title, Overall rating, Additional notes. */
export const createInterviewFeedbackSchema = z.object({
  scheduledInterviewId: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  rating: z.enum(INTERVIEW_FEEDBACK_RATINGS),
  notes: z.string().trim().max(4000).optional(),
});
export type CreateInterviewFeedbackInput = z.infer<typeof createInterviewFeedbackSchema>;

/** Submitted by an external interviewer via the token-gated access link — no auth. */
export const submitInterviewFeedbackSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  rating: z.enum(INTERVIEW_FEEDBACK_RATINGS),
  notes: z.string().trim().max(4000).optional(),
});
export type SubmitInterviewFeedbackInput = z.infer<typeof submitInterviewFeedbackSchema>;

export type InterviewFeedbackDto = {
  id: string;
  applicationId: string;
  scheduledInterviewId?: string | null;
  title: string;
  rating: InterviewFeedbackRating;
  notes?: string | null;
  authorLabel: string;
  authorUserId?: string | null;
  createdAt: string;
};

export { INTERVIEW_FEEDBACK_RATINGS };
