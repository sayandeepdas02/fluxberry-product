import type { SendMessageInput, MessageDto } from '@fluxberry/shared';
import { messageRepository } from '../repositories/message.repository';
import { applicationRepository } from '../repositories/application.repository';
import { CandidateModel } from '../models/candidate.model';
import { JobModel } from '../models/job.model';
import { emailTemplates } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import { notificationService } from './notification.service';
import { config } from '../config/env';
import { notFound, forbidden, badRequest } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * No HTML sanitization library is available in this codebase, so messages
 * (both directions) are stored and rendered as plain text only — inherently
 * XSS-safe, since escaping happens automatically wherever the frontend renders
 * text content. Never store/render raw inbound HTML.
 */
function toDto(m: any): MessageDto {
  return {
    id: String(m._id),
    applicationId: String(m.applicationId),
    sender: m.sender,
    senderUserId: m.senderUserId ? String(m.senderUserId) : null,
    subject: m.subject ?? null,
    body: m.body,
    direction: m.direction,
    readByRecruiter: m.readByRecruiter,
    createdAt: new Date(m.createdAt).toISOString(),
  };
}

function replyToAddress(applicationId: string): string | undefined {
  const domain = config.providers.messaging.inboundDomain;
  return domain ? `application+${applicationId}@${domain}` : undefined;
}

export const messageService = {
  async listByApplication(workspaceId: string, applicationId: string): Promise<MessageDto[]> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    await messageRepository.markThreadRead(applicationId);
    const messages = await messageRepository.listByApplication(applicationId);
    return messages.map(toDto);
  },

  async sendAdHoc(
    workspaceId: string,
    applicationId: string,
    userId: string,
    input: SendMessageInput,
  ): Promise<MessageDto> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    const candidate = await CandidateModel.findById(app.candidateId).select('name email').lean();
    if (!candidate?.email) throw badRequest('This candidate has no email on file');

    const message = await messageRepository.create({
      workspaceId: workspaceId as any,
      applicationId: applicationId as any,
      sender: 'recruiter',
      senderUserId: userId as any,
      subject: input.subject ?? null,
      body: input.body,
      direction: 'outbound',
    });

    const job = await JobModel.findById(app.jobId).select('title').lean();
    const tmpl = emailTemplates.custom({
      subject: input.subject ?? `Update on your application${job?.title ? ` for ${job.title}` : ''}`,
      body: input.body,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      {
        to: candidate.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
        replyTo: replyToAddress(applicationId),
      },
      { idempotencyKey: `msg-${message._id}` },
    );

    return toDto(message);
  },

  /**
   * Inbound webhook — provider-agnostic normalized shape. Whichever inbound
   * email vendor is configured (Resend is outbound-only in this codebase
   * today; see config.providers.messaging), adapt its raw payload into this
   * shape in the controller before calling this method.
   */
  async receiveInbound(
    secret: string,
    payload: { to: string; from: string; subject?: string; text: string; messageId?: string },
  ): Promise<void> {
    const expected = config.providers.messaging.inboundSecret;
    if (!expected || secret !== expected) throw forbidden('Invalid webhook secret');

    if (payload.messageId) {
      const existing = await messageRepository.findByProviderMessageId(payload.messageId);
      if (existing) return; // already processed — webhook retries are common
    }

    const match = /application\+([a-f0-9]{24})@/i.exec(payload.to);
    if (!match) {
      logger.warn({ to: payload.to }, 'inbound email: could not parse an application id — ignoring');
      return;
    }
    const applicationId = match[1];
    const app = await applicationRepository.findById(applicationId);
    if (!app) {
      logger.warn({ applicationId }, 'inbound email for unknown application — ignoring');
      return;
    }

    const message = await messageRepository.create({
      workspaceId: app.workspaceId,
      applicationId: applicationId as any,
      sender: 'candidate',
      subject: payload.subject ?? null,
      body: payload.text,
      direction: 'inbound',
      providerMessageId: payload.messageId ?? null,
      readByRecruiter: false,
    });

    const [candidate, job] = await Promise.all([
      CandidateModel.findById(app.candidateId).select('name').lean(),
      JobModel.findById(app.jobId).select('title').lean(),
    ]);
    await notificationService.broadcast(String(app.workspaceId), {
      type: 'new_message',
      title: `${candidate?.name ?? 'A candidate'} replied`,
      body: job?.title ?? '',
      entityType: 'application',
      entityId: applicationId,
    });

    logger.debug({ applicationId, messageId: String(message._id) }, 'inbound message received');
  },
};
