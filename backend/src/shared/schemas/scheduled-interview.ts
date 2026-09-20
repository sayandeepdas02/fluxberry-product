import { z } from 'zod';
import { SCHEDULED_INTERVIEW_LOCATION_TYPES, CALENDAR_PROVIDERS } from '../enums';
import type { ScheduledInterviewLocationType, CalendarProviderName } from '../enums';

export const FEEDBACK_FORM_TEMPLATES = ['BASIC'] as const;
export type FeedbackFormTemplate = (typeof FEEDBACK_FORM_TEMPLATES)[number];

/** One interviewer invited to a scheduled interview — a workspace member or a bare email. */
export const interviewerInputSchema = z.object({
  userId: z.string().optional(),
  email: z.string().trim().email(),
  name: z.string().trim().max(160).optional(),
});
export type InterviewerInput = z.infer<typeof interviewerInputSchema>;

/** Create a scheduled interview ("Schedule now" — binary.so parity, spec: interview scheduling). */
export const createScheduledInterviewSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  interviewers: z.array(interviewerInputSchema).max(10).default([]),
  start: z.string().datetime(),
  end: z.string().datetime(),
  locationType: z.enum(SCHEDULED_INTERVIEW_LOCATION_TYPES).default('ONLINE'),
  /** Only meaningful for IN_PERSON; ONLINE always gets a Meet/mock link. */
  locationDetail: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
  shareInterviewerLink: z.boolean().default(true),
  shareCandidateDetails: z.boolean().default(true),
  shareFeedbackForm: z.boolean().default(true),
  feedbackTemplate: z.enum(FEEDBACK_FORM_TEMPLATES).default('BASIC'),
  sharePastFeedback: z.boolean().default(false),
});
export type CreateScheduledInterviewInput = z.infer<typeof createScheduledInterviewSchema>;

export type ScheduledInterviewInterviewerDto = {
  userId?: string | null;
  email: string;
  name?: string | null;
};

export type ScheduledInterviewDto = {
  id: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  title: string;
  interviewers: ScheduledInterviewInterviewerDto[];
  start: string;
  end: string;
  locationType: ScheduledInterviewLocationType;
  locationDetail?: string | null;
  meetingLink?: string | null;
  description?: string | null;
  shareCandidateDetails: boolean;
  shareFeedbackForm: boolean;
  feedbackTemplate: FeedbackFormTemplate;
  sharePastFeedback: boolean;
  /** Unguessable token — the "link that only the interviewer can access" (spec: public token-gated links). */
  interviewerAccessToken?: string | null;
  calendarProvider: CalendarProviderName;
  calendarEventId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** What the interviewer sees at the token-gated access link — never the raw application/candidate doc. */
export type InterviewerAccessDto = {
  jobTitle: string;
  companyName: string;
  interview: {
    title: string;
    start: string;
    end: string;
    locationType: ScheduledInterviewLocationType;
    meetingLink?: string | null;
    description?: string | null;
  };
  candidate: {
    name: string;
    email: string;
    resumeAvailable: boolean;
    location?: string | null;
    currentSalary?: number | null;
    expectedSalary?: number | null;
    linkedinUrl?: string | null;
  } | null;
  feedbackTemplate: FeedbackFormTemplate | null;
  pastFeedback: Array<{ title: string; rating: string; notes?: string | null; authorLabel: string; createdAt: string }>;
  alreadySubmitted: boolean;
};

export { SCHEDULED_INTERVIEW_LOCATION_TYPES, CALENDAR_PROVIDERS };
