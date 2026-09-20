import type { CreateGdprRequestInput } from '@fluxberry/shared';
import { CandidateModel } from '../models/candidate.model';
import { candidateRepository } from '../repositories/candidate.repository';
import { gdprRequestRepository } from '../repositories/gdpr-request.repository';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';
import { notFound, badRequest, conflict } from '../utils/errors';

export const gdprService = {
  /**
   * Kicks off a GDPR erasure request for a candidate: records the request,
   * marks the candidate as pending, and enqueues the async worker that does
   * the actual scrubbing/deletion (never done inline — see
   * workers/handlers/anonymize-candidate.ts and delete-candidate.ts).
   */
  async requestDeletion(
    workspaceId: string,
    candidateId: string,
    actorUserId: string,
    input: CreateGdprRequestInput,
  ) {
    const candidate = await candidateRepository.findInWorkspace(workspaceId, candidateId);
    if (!candidate) throw notFound('Candidate not found');

    const pendingStatus = input.type === 'DELETE' ? 'DELETION_PENDING' : 'ANONYMIZATION_PENDING';

    // Atomic ACTIVE -> PENDING transition prevents concurrent requests.
    const updated = await CandidateModel.findOneAndUpdate(
      { _id: candidateId, workspaceId, $or: [{ gdprStatus: 'ACTIVE' }, { gdprStatus: { $exists: false } }] },
      { gdprStatus: pendingStatus, gdprRequestedAt: new Date(), gdprRequestedBy: actorUserId, gdprDeletionReason: input.reason },
      { new: true },
    );
    if (!updated) throw conflict('Candidate is not in ACTIVE state or a deletion is already in progress');

    const request = await gdprRequestRepository.create({
      workspaceId: workspaceId as any,
      candidateId: candidateId as any,
      type: input.type,
      status: 'PENDING',
      requestedBy: actorUserId as any,
      reason: input.reason,
    });

    await auditService.log({
      workspaceId,
      userId: actorUserId,
      action: 'gdpr.deletion_requested',
      resourceType: 'candidate',
      resourceId: candidateId,
      metadata: { type: input.type, reason: input.reason, requestId: String(request._id) },
    });

    await eventBus.publish({
      workspaceId,
      type: 'candidate.deletion.requested',
      entityType: 'candidate',
      entityId: candidate._id,
      candidateId: candidate._id,
      actorId: actorUserId,
      actorLabel: 'system',
      payload: { type: input.type, reason: input.reason, requestId: String(request._id) },
    });

    const jobType = input.type === 'DELETE' ? 'DELETE_CANDIDATE' : 'ANONYMIZE_CANDIDATE';
    try {
      await jobQueue.enqueue(
        jobType,
        { workspaceId, candidateId, gdprRequestId: String(request._id) },
        { idempotencyKey: `${jobType.toLowerCase()}:${String(request._id)}` },
      );
    } catch (err) {
      logger.error({ err, candidateId, requestId: String(request._id) }, 'Failed to enqueue GDPR job; restoring candidate to ACTIVE');
      await CandidateModel.findByIdAndUpdate(candidateId, { gdprStatus: 'ACTIVE', gdprRequestedAt: null, gdprRequestedBy: null, gdprDeletionReason: null });
      await gdprRequestRepository.update(String(request._id), { status: 'FAILED' });
      throw err;
    }

    return request;
  },
};
