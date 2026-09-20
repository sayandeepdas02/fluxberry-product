import type { CreateInterviewFeedbackInput, InterviewFeedbackDto } from '../shared';
import { interviewFeedbackRepository } from '../repositories/interview-feedback.repository';
import { applicationRepository } from '../repositories/application.repository';
import { toInterviewFeedbackDto } from '../serializers/interview-feedback.serializer';
import { eventBus } from '../events/event-bus';
import { notFound } from '../utils/errors';

export const interviewFeedbackService = {
  /** "Add feedback" — a recruiter logging an interview outcome directly (binary.so parity). */
  async create(
    workspaceId: string,
    applicationId: string,
    input: CreateInterviewFeedbackInput,
    actor: { userId: string; label?: string },
  ): Promise<InterviewFeedbackDto> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');

    const created = await interviewFeedbackRepository.create({
      workspaceId,
      applicationId,
      scheduledInterviewId: input.scheduledInterviewId ?? null,
      title: input.title,
      rating: input.rating,
      notes: input.notes ?? null,
      authorLabel: actor.label ?? 'Recruiter',
      authorUserId: actor.userId,
    });

    await eventBus.publish({
      workspaceId,
      type: 'interview.feedback.added',
      entityType: 'interview_feedback',
      entityId: created._id,
      applicationId: application._id,
      actorId: actor.userId,
      actorLabel: actor.label,
      payload: { rating: input.rating },
    });

    return toInterviewFeedbackDto(created.toObject());
  },

  async listForApplication(workspaceId: string, applicationId: string): Promise<InterviewFeedbackDto[]> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const list = await interviewFeedbackRepository.listByApplication(applicationId);
    return list.map(toInterviewFeedbackDto);
  },
};
