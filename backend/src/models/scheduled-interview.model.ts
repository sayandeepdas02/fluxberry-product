import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SCHEDULED_INTERVIEW_LOCATION_TYPES, CALENDAR_PROVIDERS, FEEDBACK_FORM_TEMPLATES } from '../shared';

const interviewerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, required: true },
    name: { type: String, default: null },
  },
  { _id: false },
);

/** A manually-scheduled human interview ("Schedule interview" — binary.so parity). */
const scheduledInterviewSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    title: { type: String, required: true },
    interviewers: { type: [interviewerSchema], default: [] },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    locationType: { type: String, enum: SCHEDULED_INTERVIEW_LOCATION_TYPES, default: 'ONLINE' },
    locationDetail: { type: String, default: null },
    meetingLink: { type: String, default: null },
    description: { type: String, default: null },
    shareCandidateDetails: { type: Boolean, default: true },
    shareFeedbackForm: { type: Boolean, default: true },
    feedbackTemplate: { type: String, enum: FEEDBACK_FORM_TEMPLATES, default: 'BASIC' },
    sharePastFeedback: { type: Boolean, default: false },
    /** Unguessable token — the "link that only interviewer can access" (not derived from the doc id). */
    interviewerAccessToken: { type: String, default: null, unique: true, sparse: true },
    calendarProvider: { type: String, enum: CALENDAR_PROVIDERS, default: 'MOCK' },
    calendarEventId: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'scheduled_interviews' },
);

scheduledInterviewSchema.index({ applicationId: 1, start: 1 });

export type ScheduledInterviewDoc = InferSchemaType<typeof scheduledInterviewSchema>;
export const ScheduledInterviewModel =
  (models.ScheduledInterview as Model<ScheduledInterviewDoc>) ||
  model<ScheduledInterviewDoc>('ScheduledInterview', scheduledInterviewSchema);
