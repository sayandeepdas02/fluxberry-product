import type { ApplicationStage, ApplicationDto, RejectionReason } from '@fluxberry/shared';
import { applicationRepository } from '../repositories/application.repository';
import { toApplicationDto } from '../serializers/application.serializer';
import { eventBus } from '../events/event-bus';
import { auditService } from './audit.service';
import { notFound } from '../utils/errors';
import { logger } from '../utils/logger';
import type { EventType } from '@fluxberry/shared';

interface Actor {
  userId: string;
  label?: string;
}

function statusForStage(stage: ApplicationStage): 'ACTIVE' | 'HIRED' | 'REJECTED' {
  if (stage === 'HIRED') return 'HIRED';
  if (stage === 'REJECTED') return 'REJECTED';
  return 'ACTIVE';
}

/**
 * The ONE place application stages change (spec §95): validate -> update ->
 * event -> (workflow trigger, Slice 7) -> (analytics, Slice 8) -> audit.
 * Controllers must never write `stage` directly.
 */
export const stageService = {
  async moveToStage(
    workspaceId: string,
    applicationId: string,
    targetStage: ApplicationStage,
    actor: Actor,
    extra?: { reason?: RejectionReason; note?: string; eventType?: EventType },
  ): Promise<ApplicationDto> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');

    const from = app.stage;
    const patch: Record<string, unknown> = {
      stage: targetStage,
      status: statusForStage(targetStage),
    };
    if (targetStage === 'REJECTED') {
      patch.rejection = { reason: extra?.reason ?? null, note: extra?.note ?? null };
    }
    const updated = await applicationRepository.update(applicationId, patch);

    // Primary event + optional specific event (shortlisted/hired/rejected).
    await eventBus.publish({
      workspaceId,
      type: 'candidate.stage.changed',
      entityType: 'application',
      entityId: applicationId,
      applicationId,
      candidateId: app.candidateId,
      actorId: actor.userId,
      actorLabel: actor.label ?? 'user',
      payload: { from, to: targetStage },
    });
    if (extra?.eventType) {
      await eventBus.publish({
        workspaceId,
        type: extra.eventType,
        entityType: 'application',
        entityId: applicationId,
        applicationId,
        candidateId: app.candidateId,
        actorId: actor.userId,
        actorLabel: actor.label ?? 'user',
        payload: { from, to: targetStage },
      });
    }

    await auditService.log({
      workspaceId,
      userId: actor.userId,
      action: 'candidate.stage.changed',
      resourceType: 'application',
      resourceId: applicationId,
      metadata: { from, to: targetStage },
    });

    // Slice 7 hook: workflow engine reacts to stage changes here.
    logger.debug({ applicationId, from, to: targetStage }, 'stage changed');
    return toApplicationDto(updated!.toObject());
  },

  shortlist(workspaceId: string, applicationId: string, actor: Actor) {
    return this.moveToStage(workspaceId, applicationId, 'SCREENING', actor, {
      eventType: 'candidate.shortlisted',
    });
  },

  hire(workspaceId: string, applicationId: string, actor: Actor) {
    return this.moveToStage(workspaceId, applicationId, 'HIRED', actor, {
      eventType: 'candidate.hired',
    });
  },

  reject(
    workspaceId: string,
    applicationId: string,
    actor: Actor,
    input: { reason?: RejectionReason; note?: string },
  ) {
    return this.moveToStage(workspaceId, applicationId, 'REJECTED', actor, {
      reason: input.reason,
      note: input.note,
      eventType: 'candidate.rejected',
    });
  },
};
