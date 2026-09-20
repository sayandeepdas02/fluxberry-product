import type { ScheduledInterviewDto, ScheduledInterviewInterviewerDto } from '../shared';

function toInterviewer(i: any): ScheduledInterviewInterviewerDto {
  return {
    userId: i.userId ? String(i.userId) : null,
    email: i.email,
    name: i.name ?? null,
  };
}

export function toScheduledInterviewDto(s: any): ScheduledInterviewDto {
  return {
    id: String(s._id),
    applicationId: String(s.applicationId),
    jobId: String(s.jobId),
    candidateId: String(s.candidateId),
    title: s.title,
    interviewers: (s.interviewers ?? []).map(toInterviewer),
    start: new Date(s.start).toISOString(),
    end: new Date(s.end).toISOString(),
    locationType: s.locationType,
    locationDetail: s.locationDetail ?? null,
    meetingLink: s.meetingLink ?? null,
    description: s.description ?? null,
    shareCandidateDetails: s.shareCandidateDetails,
    shareFeedbackForm: s.shareFeedbackForm,
    feedbackTemplate: s.feedbackTemplate,
    sharePastFeedback: s.sharePastFeedback,
    interviewerAccessToken: s.interviewerAccessToken ?? null,
    calendarProvider: s.calendarProvider,
    calendarEventId: s.calendarEventId ?? null,
    createdBy: String(s.createdBy),
    createdAt: new Date(s.createdAt).toISOString(),
    updatedAt: new Date(s.updatedAt).toISOString(),
  };
}
