import type { InterviewFeedbackDto } from '@fluxberry/shared';

export function toInterviewFeedbackDto(f: any): InterviewFeedbackDto {
  return {
    id: String(f._id),
    applicationId: String(f.applicationId),
    scheduledInterviewId: f.scheduledInterviewId ? String(f.scheduledInterviewId) : null,
    title: f.title,
    rating: f.rating,
    notes: f.notes ?? null,
    authorLabel: f.authorLabel,
    authorUserId: f.authorUserId ? String(f.authorUserId) : null,
    createdAt: new Date(f.createdAt).toISOString(),
  };
}
