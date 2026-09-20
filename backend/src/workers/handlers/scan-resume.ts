import { getAvScanProvider } from '../../integrations/av-scan';
import { getStorageProvider } from '../../integrations';
import { candidateRepository } from '../../repositories/candidate.repository';
import { eventBus } from '../../events/event-bus';
import { jobQueue } from '../../queue/job-queue';
import { auditService } from '../../services/audit.service';
import type { JobHandler } from './index';

export const scanResumeHandler: JobHandler = async (payload, ctx) => {
  const { workspaceId, candidateId, applicationId } = payload;

  const candidate = await candidateRepository.findById(candidateId);
  if (!candidate?.resume?.storageKey) {
    ctx.logger.warn('candidate or resume not found — skipping scan');
    return;
  }

  const storage = getStorageProvider();
  const buffer = await storage.download(candidate.resume.storageKey);
  const scanner = getAvScanProvider();
  const result = await scanner.scan(buffer);

  if (result.clean) {
    await candidateRepository.update(candidateId, {
      avScanStatus: 'CLEAN',
      avScannedAt: new Date(),
    });

    await jobQueue.enqueue(
      'PARSE_RESUME',
      { workspaceId, candidateId, applicationId },
      { idempotencyKey: `parse:${applicationId}` },
    );
  } else {
    await candidateRepository.update(candidateId, {
      avScanStatus: 'INFECTED',
      avScanDetails: result.signature ?? 'unknown',
      avScannedAt: new Date(),
      resumeStatus: 'FAILED',
      parseError: 'Resume file flagged as malicious',
    });

    await eventBus.publish({
      workspaceId,
      type: 'resume.scan.infected',
      entityType: 'candidate',
      entityId: candidate._id,
      candidateId: candidate._id,
      actorLabel: 'system',
      payload: { signature: result.signature },
    });

    await auditService.log({
      workspaceId,
      action: 'resume.scan.infected',
      resourceType: 'candidate',
      resourceId: candidateId,
      metadata: { signature: result.signature },
    });

    ctx.logger.warn({ signature: result.signature }, 'resume flagged as infected');
  }
};
