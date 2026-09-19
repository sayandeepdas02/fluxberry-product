import type {
  CreateScheduledInterviewInput,
  ScheduledInterviewDto,
  InterviewerAccessDto,
  SubmitInterviewFeedbackInput,
  InterviewFeedbackDto,
  CalendarProviderName,
} from '@fluxberry/shared';
import { scheduledInterviewRepository } from '../repositories/scheduled-interview.repository';
import { calendarConnectionRepository } from '../repositories/calendar-connection.repository';
import { resolveConnectionTokens } from './calendar-token-resolver';
import { interviewFeedbackRepository } from '../repositories/interview-feedback.repository';
import { InterviewFeedbackModel } from '../models/interview-feedback.model';
import { applicationRepository } from '../repositories/application.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { jobRepository } from '../repositories/job.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { getCalendarProvider, emailTemplates } from '../integrations';
import type { CalendarTokens } from '../integrations/calendar/types';
import { toScheduledInterviewDto } from '../serializers/scheduled-interview.serializer';
import { toInterviewFeedbackDto } from '../serializers/interview-feedback.serializer';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { stageService } from './stage.service';
import { secureToken } from '../utils/ids';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { notFound, badRequest, conflict } from '../utils/errors';

async function resolveTokens(
  workspaceId: string,
  createdBy: string,
): Promise<{ tokens: CalendarTokens | null; providerName: CalendarProviderName }> {
  const existing = await resolveConnectionTokens(workspaceId, createdBy);
  if (existing) return existing;

  const provider = getCalendarProvider();
  const providerName: CalendarProviderName = provider.name === 'google' ? 'GOOGLE' : 'MOCK';
  // The mock provider needs no real connection — it fabricates a usable event either way.
  if (provider.name === 'mock') {
    const tokens = await provider.exchangeCode('mock');
    return { tokens, providerName };
  }
  return { tokens: null, providerName };
}

export const scheduledInterviewService = {
  /** "Schedule interview" — binary.so parity (spec: interview scheduling). */
  async create(
    workspaceId: string,
    applicationId: string,
    input: CreateScheduledInterviewInput,
    actor: { userId: string; label?: string },
  ): Promise<ScheduledInterviewDto> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const candidate = await candidateRepository.findById(String(application.candidateId));
    const job = await jobRepository.findById(String(application.jobId));
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!candidate || !job || !workspace) throw notFound('Application not found');

    const start = new Date(input.start);
    const end = new Date(input.end);
    if (end.getTime() <= start.getTime()) throw badRequest('End time must be after start time');

    const wantsConferencing = input.locationType === 'ONLINE';
    let meetingLink: string | null = null;
    let calendarEventId: string | null = null;
    let calendarProviderName: CalendarProviderName = 'MOCK';

    const { tokens, providerName } = await resolveTokens(workspaceId, actor.userId);
    calendarProviderName = providerName;
    if (tokens) {
      const provider = getCalendarProvider();
      const result = await provider.createEvent(tokens, {
        summary: input.title,
        description: input.description,
        start,
        end,
        attendees: [
          { email: candidate.email, displayName: candidate.name },
          ...input.interviewers.map((i) => ({ email: i.email, displayName: i.name })),
        ],
        wantsConferencing,
      });
      meetingLink = result.meetingLink ?? null;
      calendarEventId = result.eventId || null;
    }

    const accessToken = input.shareInterviewerLink ? secureToken(24) : null;

    const doc = await scheduledInterviewRepository.create({
      workspaceId,
      applicationId,
      candidateId: candidate._id,
      jobId: job._id,
      title: input.title,
      interviewers: input.interviewers.map((i) => ({ userId: i.userId ?? null, email: i.email, name: i.name ?? null })),
      start,
      end,
      locationType: input.locationType,
      locationDetail: input.locationDetail ?? null,
      meetingLink,
      description: input.description ?? null,
      shareCandidateDetails: input.shareCandidateDetails,
      shareFeedbackForm: input.shareFeedbackForm,
      feedbackTemplate: input.feedbackTemplate,
      sharePastFeedback: input.sharePastFeedback,
      interviewerAccessToken: accessToken,
      calendarProvider: calendarProviderName,
      calendarEventId,
      createdBy: actor.userId,
    });

    const whenLabel = `${start.toLocaleString()} – ${end.toLocaleTimeString()}`;
    const whereLine = wantsConferencing
      ? meetingLink
        ? `Join: ${meetingLink}`
        : ''
      : input.locationDetail
        ? `Where: ${input.locationDetail}`
        : '';

    // Notifications are best-effort: the interview doc (and calendar event) are
    // already persisted at this point, so a queue write failure here must not
    // fail the whole request and leave the dialog showing an error over what
    // is, from the recruiter's perspective, a successfully scheduled interview.
    try {
      for (const interviewer of input.interviewers) {
        const accessLine = accessToken
          ? `Candidate details & feedback form: ${config.publicAppUrl}/interview-feedback/${accessToken}`
          : '';
        const email = emailTemplates.custom({
          subject: `Interview scheduled: ${candidate.name} — ${job.title}`,
          body: [
            `You've been added as an interviewer for ${candidate.name} (${job.title} at ${workspace.name}).`,
            `When: ${whenLabel}`,
            whereLine,
            accessLine,
          ]
            .filter(Boolean)
            .join('\n\n'),
        });
        await jobQueue.enqueue(
          'SEND_EMAIL',
          { to: interviewer.email, subject: email.subject, html: email.html, text: email.text },
          { idempotencyKey: `interview-invite:${doc._id}:${interviewer.email}` },
        );
      }

      const candidateEmail = emailTemplates.custom({
        subject: `Interview scheduled — ${job.title}`,
        body: [
          `Hi ${candidate.name},`,
          `Your interview for ${job.title} at ${workspace.name} is scheduled.`,
          `When: ${whenLabel}`,
          whereLine,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
      await jobQueue.enqueue(
        'SEND_EMAIL',
        { to: candidate.email, subject: candidateEmail.subject, html: candidateEmail.html, text: candidateEmail.text },
        { idempotencyKey: `interview-invite:${doc._id}:candidate` },
      );

      // 24h-before reminder — skip entirely if there's less than 24h notice (the
      // invite email just sent already carries the same information).
      const reminderRunAt = new Date(start.getTime() - 24 * 3600_000);
      if (reminderRunAt.getTime() > Date.now()) {
        for (const interviewer of input.interviewers) {
          const reminder = emailTemplates.interviewReminder({
            recipientType: 'INTERVIEWER',
            recipientName: interviewer.name || interviewer.email,
            candidateName: candidate.name,
            jobTitle: job.title,
            companyName: workspace.name,
            whenLabel,
            whereLine,
            accessLink: accessToken ? `${config.publicAppUrl}/interview-feedback/${accessToken}` : undefined,
          });
          await jobQueue.enqueue(
            'SEND_EMAIL',
            {
              to: interviewer.email,
              subject: reminder.subject,
              html: reminder.html,
              text: reminder.text,
              conditionCheck: { type: 'scheduled_interview_active', scheduledInterviewId: String(doc._id) },
            },
            { idempotencyKey: `interview-reminder:${doc._id}:${interviewer.email}`, runAt: reminderRunAt },
          );
        }

        const candidateReminder = emailTemplates.interviewReminder({
          recipientType: 'CANDIDATE',
          recipientName: candidate.name,
          candidateName: candidate.name,
          jobTitle: job.title,
          companyName: workspace.name,
          whenLabel,
          whereLine,
        });
        await jobQueue.enqueue(
          'SEND_EMAIL',
          {
            to: candidate.email,
            subject: candidateReminder.subject,
            html: candidateReminder.html,
            text: candidateReminder.text,
            conditionCheck: { type: 'scheduled_interview_active', scheduledInterviewId: String(doc._id) },
          },
          { idempotencyKey: `interview-reminder:${doc._id}:candidate`, runAt: reminderRunAt },
        );
      }
    } catch (err) {
      logger.warn(
        { err, scheduledInterviewId: String(doc._id) },
        'failed to enqueue one or more interview notifications; continuing since the interview itself was saved',
      );
    }

    await eventBus.publish({
      workspaceId,
      type: 'interview.scheduled',
      entityType: 'scheduled_interview',
      entityId: doc._id,
      applicationId: application._id,
      candidateId: candidate._id,
      actorId: actor.userId,
      actorLabel: actor.label,
      payload: { title: input.title, start: start.toISOString() },
    });

    if (['APPLIED', 'SCREENING', 'ASSESSMENT'].includes(application.stage)) {
      await stageService.moveToStage(workspaceId, applicationId, 'INTERVIEW', actor);
    }

    return toScheduledInterviewDto(doc.toObject());
  },

  async listForApplication(workspaceId: string, applicationId: string): Promise<ScheduledInterviewDto[]> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const list = await scheduledInterviewRepository.listByApplication(applicationId);
    return list.map(toScheduledInterviewDto);
  },

  async remove(workspaceId: string, applicationId: string, id: string): Promise<void> {
    const doc = await scheduledInterviewRepository.findInWorkspace(workspaceId, id);
    if (!doc || String(doc.applicationId) !== applicationId) throw notFound('Scheduled interview not found');
    if (doc.calendarEventId) {
      try {
        const connection = await calendarConnectionRepository.findForUser(workspaceId, String(doc.createdBy));
        if (connection) {
          await getCalendarProvider().deleteEvent(
            {
              accessToken: connection.accessToken,
              refreshToken: connection.refreshToken,
              expiresAt: connection.expiresAt,
            },
            doc.calendarEventId,
          );
        }
      } catch (err) {
        logger.warn({ err, scheduledInterviewId: id }, 'failed to delete calendar event; continuing with local cancellation');
      }
    }
    await scheduledInterviewRepository.delete(id);
  },

  // ---- Token-gated "link that only interviewer can access" ----

  async getInterviewerAccess(token: string): Promise<InterviewerAccessDto> {
    const doc = await scheduledInterviewRepository.findByToken(token);
    if (!doc) throw notFound('Interview link not found');
    const [candidate, job, workspace] = await Promise.all([
      candidateRepository.findById(String(doc.candidateId)),
      jobRepository.findById(String(doc.jobId)),
      workspaceRepository.findById(String(doc.workspaceId)),
    ]);
    if (!candidate || !job || !workspace) throw notFound('Interview link not found');

    let pastFeedback: InterviewerAccessDto['pastFeedback'] = [];
    if (doc.sharePastFeedback) {
      const list = await interviewFeedbackRepository.listByApplication(String(doc.applicationId));
      pastFeedback = list.map((f: any) => ({
        title: f.title,
        rating: f.rating,
        notes: f.notes ?? null,
        authorLabel: f.authorLabel,
        createdAt: new Date(f.createdAt).toISOString(),
      }));
    }
    const alreadySubmitted = Boolean(await InterviewFeedbackModel.exists({ scheduledInterviewId: doc._id }));

    return {
      jobTitle: job.title,
      companyName: workspace.name,
      interview: {
        title: doc.title,
        start: new Date(doc.start).toISOString(),
        end: new Date(doc.end).toISOString(),
        locationType: doc.locationType,
        meetingLink: doc.meetingLink ?? null,
        description: doc.description ?? null,
      },
      candidate: doc.shareCandidateDetails
        ? {
            name: candidate.name,
            email: candidate.email,
            resumeAvailable: Boolean(candidate.resume),
            location: candidate.location ?? null,
            currentSalary: candidate.currentSalary ?? null,
            expectedSalary: candidate.expectedSalary ?? null,
            linkedinUrl: candidate.linkedinUrl ?? null,
          }
        : null,
      feedbackTemplate: doc.shareFeedbackForm ? doc.feedbackTemplate : null,
      pastFeedback,
      alreadySubmitted,
    };
  },

  async submitInterviewerFeedback(token: string, input: SubmitInterviewFeedbackInput): Promise<InterviewFeedbackDto> {
    const doc = await scheduledInterviewRepository.findByToken(token);
    if (!doc) throw notFound('Interview link not found');
    if (!doc.shareFeedbackForm) throw badRequest('Feedback is not enabled for this interview link');
    const existing = await InterviewFeedbackModel.exists({ scheduledInterviewId: doc._id });
    if (existing) throw conflict('Feedback has already been submitted for this interview');

    const interviewerLabel = doc.interviewers[0]?.name || doc.interviewers[0]?.email || 'Interviewer';
    const created = await interviewFeedbackRepository.create({
      workspaceId: doc.workspaceId,
      applicationId: doc.applicationId,
      scheduledInterviewId: doc._id,
      title: input.title,
      rating: input.rating,
      notes: input.notes ?? null,
      authorLabel: interviewerLabel,
      authorUserId: null,
    });

    await eventBus.publish({
      workspaceId: String(doc.workspaceId),
      type: 'interview.feedback.added',
      entityType: 'interview_feedback',
      entityId: created._id,
      applicationId: doc.applicationId,
      actorLabel: interviewerLabel,
      payload: { rating: input.rating },
    });

    return toInterviewFeedbackDto(created.toObject());
  },
};
