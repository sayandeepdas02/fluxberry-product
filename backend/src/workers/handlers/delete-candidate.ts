import { candidateRepository } from '../../repositories/candidate.repository';
import { gdprRequestRepository } from '../../repositories/gdpr-request.repository';
import { CandidateModel } from '../../models/candidate.model';
import { ApplicationModel } from '../../models/application.model';
import { MessageModel } from '../../models/message.model';
import { ScreeningResultModel } from '../../models/screening-result.model';
import { getStorageProvider } from '../../integrations';
import { eventBus } from '../../events/event-bus';
import { auditService } from '../../services/audit.service';
import type { JobHandler } from './index';

/**
 * GDPR full erasure: unlike anonymize-candidate.ts, this permanently deletes
 * the candidate AND every document that references them — no pipeline history
 * survives. Use only when anonymization isn't sufficient for the request.
 */
export const deleteCandidateHandler: JobHandler = async (payload, ctx) => {
  const { workspaceId, candidateId, gdprRequestId } = payload as {
    workspaceId: string;
    candidateId: string;
    gdprRequestId: string;
  };

  const candidate = await candidateRepository.findById(candidateId);
  if (!candidate) {
    ctx.logger.warn('candidate already deleted — completing finalization');
    // Even though the candidate is gone (likely a retry), still attempt to
    // complete the GDPR request, publish the event, and write the audit log
    // so downstream consumers stay consistent.
    if (gdprRequestId) {
      await gdprRequestRepository.update(gdprRequestId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    }
    await eventBus.publish({
      workspaceId,
      type: 'candidate.deleted',
      entityType: 'candidate',
      entityId: candidateId,
      actorLabel: 'system',
      payload: { applicationCount: 0, retryFinalization: true },
    });
    await auditService.log({
      workspaceId,
      action: 'gdpr.deleted',
      resourceType: 'candidate',
      resourceId: candidateId,
      metadata: { gdprRequestId, retryFinalization: true },
    });
    return;
  }

  try {
    const applicationIds = (
      await ApplicationModel.find({ candidateId }).select('_id').lean()
    ).map((a) => a._id);

    if (candidate.resume?.storageKey) {
      await getStorageProvider().delete(candidate.resume.storageKey);
    }

    await Promise.all([
      MessageModel.deleteMany({ applicationId: { $in: applicationIds } }),
      ScreeningResultModel.deleteMany({ candidateId }),
    ]);
    await ApplicationModel.deleteMany({ candidateId });
    await CandidateModel.findByIdAndDelete(candidateId);

    if (gdprRequestId) {
      await gdprRequestRepository.update(gdprRequestId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    }

    await eventBus.publish({
      workspaceId,
      type: 'candidate.deleted',
      entityType: 'candidate',
      entityId: candidate._id,
      actorLabel: 'system',
      payload: { applicationCount: applicationIds.length },
    });

    await auditService.log({
      workspaceId,
      action: 'gdpr.deleted',
      resourceType: 'candidate',
      resourceId: candidateId,
      metadata: { gdprRequestId },
    });
  } catch (err) {
    if (gdprRequestId) {
      await gdprRequestRepository.update(gdprRequestId, {
        status: 'FAILED',
        error: (err as Error).message?.slice(0, 1000) ?? String(err),
      });
    }
    throw err;
  }
};
