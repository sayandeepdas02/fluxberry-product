import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { INTERVIEW_FEEDBACK_RATINGS } from '@fluxberry/shared';

/** "Add feedback" — binary.so parity: Title, Overall rating, Additional notes. */
const interviewFeedbackSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    scheduledInterviewId: { type: Schema.Types.ObjectId, ref: 'ScheduledInterview', default: null },
    title: { type: String, required: true },
    rating: { type: String, enum: INTERVIEW_FEEDBACK_RATINGS, required: true },
    notes: { type: String, default: null },
    /** Display name for whoever left the feedback — a workspace member or an external interviewer. */
    authorLabel: { type: String, required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'interview_feedback' },
);

interviewFeedbackSchema.index({ applicationId: 1, createdAt: -1 });

export type InterviewFeedbackDoc = InferSchemaType<typeof interviewFeedbackSchema>;
export const InterviewFeedbackModel =
  (models.InterviewFeedback as Model<InterviewFeedbackDoc>) ||
  model<InterviewFeedbackDoc>('InterviewFeedback', interviewFeedbackSchema);
