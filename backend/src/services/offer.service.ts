import type { CreateOfferInput, OfferDto, OfferDecisionInput, PublicOfferDto } from '../shared';
import { offerRepository } from '../repositories/offer.repository';
import { applicationRepository } from '../repositories/application.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { jobRepository } from '../repositories/job.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { toOfferDto, toPublicOfferDto } from '../serializers/offer.serializer';
import { eventBus } from '../events/event-bus';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { stageService } from './stage.service';
import { emailTemplates } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import { secureToken } from '../utils/ids';
import { config } from '../config/env';
import { badRequest, notFound, conflict } from '../utils/errors';
import { logger } from '../utils/logger';

interface Actor {
  userId: string;
  label?: string;
}

export const offerService = {
  /** Create a DRAFT offer for an application — nothing is sent to the candidate yet. */
  async create(
    workspaceId: string,
    applicationId: string,
    actorUserId: string,
    input: CreateOfferInput,
  ): Promise<OfferDto> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');

    const offer = await offerRepository.create({
      workspaceId,
      applicationId,
      candidateId: application.candidateId,
      jobId: application.jobId,
      status: 'DRAFT',
      compensation: {
        baseSalary: input.baseSalary,
        currency: input.currency,
        bonus: input.bonus ?? null,
        equity: input.equity ?? null,
        startDate: input.startDate,
        employmentType: input.employmentType ?? null,
      },
      note: input.note ?? null,
      expiresAt: input.expiresAt,
      createdBy: actorUserId,
    });

    await eventBus.publish({
      workspaceId,
      type: 'offer.created',
      entityType: 'offer',
      entityId: offer._id,
      applicationId,
      candidateId: application.candidateId,
      actorId: actorUserId,
      actorLabel: 'user',
      payload: { baseSalary: input.baseSalary, currency: input.currency },
    });

    return toOfferDto(offer.toObject());
  },

  /** Send a DRAFT offer to the candidate: mints a token, emails the link, and advances the pipeline stage. */
  async send(workspaceId: string, offerId: string, actor: Actor): Promise<OfferDto> {
    const offer = await offerRepository.findInWorkspace(workspaceId, offerId);
    if (!offer) throw notFound('Offer not found');

    const application = await applicationRepository.findInWorkspace(workspaceId, String(offer.applicationId));
    if (!application) throw notFound('Application not found');
    const [candidate, job, workspace] = await Promise.all([
      candidateRepository.findById(String(offer.candidateId)),
      jobRepository.findById(String(offer.jobId)),
      workspaceRepository.findById(workspaceId),
    ]);
    if (!candidate || !job || !workspace) throw notFound('Offer not found');

    const token = secureToken(24);
    const updated = await offerRepository.updateWithCondition(
      offerId,
      { status: 'SENT', token, sentAt: new Date() },
      { status: 'DRAFT' },
    );
    if (!updated) throw conflict('Offer has already been sent or is no longer in draft');

    const link = `${config.publicAppUrl}/offer/${token}`;
    const email = emailTemplates.offerSent({
      candidateName: candidate.name,
      jobTitle: job.title,
      companyName: workspace.name,
      offerLink: link,
    });
    try {
      await jobQueue.enqueue(
        'SEND_EMAIL',
        { to: candidate.email, subject: email.subject, html: email.html, text: email.text },
        { idempotencyKey: `offer-sent:${offerId}` },
      );
    } catch (err) {
      // Revert status back to DRAFT so the send can be retried.
      logger.error({ err, offerId }, 'Failed to enqueue offer email; reverting offer to DRAFT');
      await offerRepository.updateWithCondition(offerId, { status: 'DRAFT', token: null, sentAt: null }, { status: 'SENT' });
      throw err;
    }

    await stageService.moveToStage(workspaceId, String(offer.applicationId), 'OFFER', actor);

    await eventBus.publish({
      workspaceId,
      type: 'offer.sent',
      entityType: 'offer',
      entityId: offerId,
      applicationId: offer.applicationId,
      candidateId: offer.candidateId,
      actorId: actor.userId,
      actorLabel: actor.label ?? 'user',
      payload: {},
    });
    await auditService.log({
      workspaceId,
      userId: actor.userId,
      action: 'offer.sent',
      resourceType: 'offer',
      resourceId: offerId,
    });

    return toOfferDto(updated!.toObject());
  },

  /** Rescind a sent offer — no further action possible for the candidate. */
  async rescind(workspaceId: string, offerId: string, actor: Actor): Promise<OfferDto> {
    const offer = await offerRepository.findInWorkspace(workspaceId, offerId);
    if (!offer) throw notFound('Offer not found');

    const updated = await offerRepository.updateWithCondition(
      offerId,
      { status: 'RESCINDED' },
      { status: 'SENT' },
    );
    if (!updated) throw conflict('Only sent offers can be rescinded');

    await eventBus.publish({
      workspaceId,
      type: 'offer.rescinded',
      entityType: 'offer',
      entityId: offerId,
      applicationId: offer.applicationId,
      candidateId: offer.candidateId,
      actorId: actor.userId,
      actorLabel: actor.label ?? 'user',
      payload: {},
    });
    await auditService.log({
      workspaceId,
      userId: actor.userId,
      action: 'offer.rescinded',
      resourceType: 'offer',
      resourceId: offerId,
    });

    return toOfferDto(updated!.toObject());
  },

  async listForApplication(workspaceId: string, applicationId: string): Promise<OfferDto[]> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const list = await offerRepository.findByApplication(applicationId);
    return list.filter((o) => String(o.workspaceId) === workspaceId).map((o) => toOfferDto(o.toObject()));
  },

  // ---- Token-gated candidate-facing endpoints ----

  async getByToken(token: string): Promise<PublicOfferDto> {
    const offer = await offerRepository.findByToken(token);
    if (!offer) throw notFound('Offer not found');
    const [candidate, job, workspace] = await Promise.all([
      candidateRepository.findById(String(offer.candidateId)),
      jobRepository.findById(String(offer.jobId)),
      workspaceRepository.findById(String(offer.workspaceId)),
    ]);
    if (!candidate || !job || !workspace) throw notFound('Offer not found');

    let plain: Record<string, unknown> = offer.toObject();
    if (offer.status === 'SENT' && offer.expiresAt.getTime() < Date.now()) {
      // Use conditional update to avoid overwriting a concurrent RESCINDED status.
      const expired = await offerRepository.updateWithCondition(String(offer._id), { status: 'EXPIRED' }, { status: 'SENT' });
      if (expired) {
        plain = { ...plain, status: 'EXPIRED' };
      }
    }

    return toPublicOfferDto(plain, {
      jobTitle: job.title,
      companyName: workspace.name,
      candidateName: candidate.name,
    });
  },

  async respond(token: string, input: OfferDecisionInput): Promise<PublicOfferDto> {
    const offer = await offerRepository.findByToken(token);
    if (!offer) throw notFound('Offer not found');
    if (offer.status !== 'SENT') throw badRequest('This offer is no longer awaiting a response');
    if (offer.expiresAt.getTime() < Date.now()) {
      await offerRepository.updateWithCondition(String(offer._id), { status: 'EXPIRED' }, { status: 'SENT' });
      throw badRequest('This offer has expired');
    }

    const [candidate, job, workspace] = await Promise.all([
      candidateRepository.findById(String(offer.candidateId)),
      jobRepository.findById(String(offer.jobId)),
      workspaceRepository.findById(String(offer.workspaceId)),
    ]);
    if (!candidate || !job || !workspace) throw notFound('Offer not found');

    // No logged-in user makes this call — attribute the resulting stage change /
    // event to the recruiter who created the offer (a "system" actor, since
    // there's no live user for this action).
    const systemActor: Actor = { userId: String(offer.createdBy ?? offer.candidateId), label: 'candidate' };

    const workspaceId = String(offer.workspaceId);
    const applicationId = String(offer.applicationId);

    if (input.decision === 'ACCEPT') {
      const updated = await offerRepository.updateWithCondition(
        String(offer._id),
        { status: 'ACCEPTED', respondedAt: new Date(), decisionNote: input.note ?? null },
        { status: 'SENT' },
      );
      if (!updated) throw conflict('This offer is no longer awaiting a response');
      try {
        await stageService.hire(workspaceId, applicationId, systemActor);
      } catch (err) {
        // Revert ACCEPTED back to SENT so the candidate can retry.
        logger.error({ err, offerId: String(offer._id) }, 'hire() failed after ACCEPTED; reverting offer to SENT');
        await offerRepository.updateWithCondition(
          String(offer._id),
          { status: 'SENT', respondedAt: null, decisionNote: null },
          { status: 'ACCEPTED' },
        );
        throw err;
      }
      await eventBus.publish({
        workspaceId,
        type: 'offer.accepted',
        entityType: 'offer',
        entityId: offer._id,
        applicationId,
        candidateId: offer.candidateId,
        actorLabel: 'candidate',
        payload: {},
      });
      return toPublicOfferDto(updated!.toObject(), {
        jobTitle: job.title,
        companyName: workspace.name,
        candidateName: candidate.name,
      });
    }

    const updated = await offerRepository.updateWithCondition(
      String(offer._id),
      { status: 'DECLINED', respondedAt: new Date(), decisionNote: input.note ?? null },
      { status: 'SENT' },
    );
    if (!updated) throw conflict('This offer is no longer awaiting a response');
    await eventBus.publish({
      workspaceId,
      type: 'offer.declined',
      entityType: 'offer',
      entityId: offer._id,
      applicationId,
      candidateId: offer.candidateId,
      actorLabel: 'candidate',
      payload: {},
    });
    await notificationService.broadcast(workspaceId, {
      type: 'offer_declined',
      title: `${candidate.name} declined the offer for ${job.title}`,
      body: job.title,
      entityType: 'application',
      entityId: applicationId,
    });

    return toPublicOfferDto(updated!.toObject(), {
      jobTitle: job.title,
      companyName: workspace.name,
      candidateName: candidate.name,
    });
  },
};
