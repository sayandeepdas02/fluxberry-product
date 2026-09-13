import type { ApplicationDto, RejectionReason, PipelineStage } from '@fluxberry/shared';
import { defaultPipelineStages } from '@fluxberry/shared';
import { applicationRepository } from '../repositories/application.repository';
import { CandidateModel } from '../models/candidate.model';
import { JobModel } from '../models/job.model';
import { WorkspaceModel } from '../models/workspace.model';
import { toApplicationDto } from '../serializers/application.serializer';
import { eventBus } from '../events/event-bus';
import { auditService } from './audit.service';
import { emailTemplates } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import { notFound, badRequest } from '../utils/errors';
import { logger } from '../utils/logger';
import { trackEvent } from '../integrations/posthog';
import { notificationService } from './notification.service';
import type { EventType } from '@fluxberry/shared';

interface Actor {
  userId: string;
  label?: string;
}

/** A job's stage id — a custom stage it defined, or one of the 7 system defaults. */
function statusForStage(stage: string): 'ACTIVE' | 'HIRED' | 'REJECTED' {
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
    targetStage: string,
    actor: Actor,
    extra?: { reason?: RejectionReason; note?: string; eventType?: EventType },
  ): Promise<ApplicationDto> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');

    const job = await JobModel.findById(app.jobId).select('stages').lean();
    const validStages = ((job?.stages as PipelineStage[] | null) ?? defaultPipelineStages());
    if (!validStages.some((s) => s.id === targetStage)) {
      throw badRequest(`"${targetStage}" is not a valid stage for this job`);
    }

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

    // Send candidate notification email for meaningful stage transitions (fire-and-forget).
    const NOTIFY_STAGES = new Set(['SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED']);
    if (NOTIFY_STAGES.has(targetStage)) {
      void (async () => {
        try {
          const [cand, job, workspace] = await Promise.all([
            CandidateModel.findById(app.candidateId).select('name email').lean(),
            JobModel.findById(app.jobId).select('title').lean(),
            WorkspaceModel.findById(workspaceId).select('name').lean(),
          ]);
          if (!cand?.email || !job?.title) return;
          let tmpl: { subject: string; html: string; text: string };
          if (targetStage === 'REJECTED') {
            tmpl = emailTemplates.candidateRejected({
              candidateName: cand.name,
              jobTitle: job.title,
              companyName: workspace?.name ?? '',
            });
          } else {
            tmpl = emailTemplates.candidateAdvanced({ candidateName: cand.name, jobTitle: job.title, stage: targetStage });
          }
          await jobQueue.enqueue(
            'SEND_EMAIL',
            { to: cand.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text },
            { idempotencyKey: `stage-email:${applicationId}:${targetStage}` },
          );
        } catch (e) {
          logger.warn({ applicationId, targetStage, err: e }, 'stage email enqueue failed');
        }
      })();
    }

    // Broadcast in-app notification to workspace members (fire-and-forget).
    void (async () => {
      try {
        const [cand, job] = await Promise.all([
          CandidateModel.findById(app.candidateId).select('name').lean(),
          JobModel.findById(app.jobId).select('title').lean(),
        ]);
        if (!cand || !job) return;
        const typeMap: Record<string, string> = { HIRED: 'candidate_hired', REJECTED: 'new_candidate' };
        await notificationService.broadcast(workspaceId, {
          type: typeMap[targetStage] ?? 'new_candidate',
          title: targetStage === 'HIRED' ? `${cand.name} was hired for ${job.title}` : `${cand.name} moved to ${targetStage}`,
          body: job.title,
          entityType: 'application',
          entityId: applicationId,
        });
      } catch {}
    })();

    logger.debug({ applicationId, from, to: targetStage }, 'stage changed');
    return toApplicationDto(updated!.toObject());
  },

  shortlist(workspaceId: string, applicationId: string, actor: Actor) {
    return this.moveToStage(workspaceId, applicationId, 'SCREENING', actor, {
      eventType: 'candidate.shortlisted',
    });
  },

  async hire(workspaceId: string, applicationId: string, actor: Actor) {
    const result = await this.moveToStage(workspaceId, applicationId, 'HIRED', actor, {
      eventType: 'candidate.hired',
    });
    trackEvent(actor.userId, 'candidate.hired', { workspaceId, applicationId });
    return result;
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
