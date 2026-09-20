import { candidateRepository } from '../../repositories/candidate.repository';
import { gdprRequestRepository } from '../../repositories/gdpr-request.repository';
import { ApplicationModel } from '../../models/application.model';
import { CandidateAssessmentModel } from '../../models/candidate-assessment.model';
import { InterviewModel } from '../../models/interview.model';
import { ScheduledInterviewModel } from '../../models/scheduled-interview.model';
import { MessageModel } from '../../models/message.model';
import { InterviewFeedbackModel } from '../../models/interview-feedback.model';
import { getStorageProvider } from '../../integrations';
import { eventBus } from '../../events/event-bus';
import { auditService } from '../../services/audit.service';
import type { JobHandler } from './index';

/**
 * GDPR "right to be forgotten" via anonymization: scrubs the candidate's PII
 * while leaving the pipeline (applications, assessments, interviews) intact
 * for aggregate reporting — see delete-candidate.ts for full erasure instead.
 */
export const anonymizeCandidateHandler: JobHandler = async (payload, ctx) => {
  const { workspaceId, candidateId, gdprRequestId } = payload as {
    workspaceId: string;
    candidateId: string;
    gdprRequestId: string;
  };

  const candidate = await candidateRepository.findById(candidateId);
  if (!candidate) {
    ctx.logger.warn('candidate not found — skipping anonymization');
    if (gdprRequestId) {
      await gdprRequestRepository.update(gdprRequestId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    }
    return;
  }

  try {
    // Loaded for audit visibility into how much linked data this candidate has
    // — anonymization intentionally leaves these records in place.
    const applicationIds = (
      await ApplicationModel.find({ candidateId }).select('_id').lean()
    ).map((a) => a._id);
    const [assessmentCount, interviewCount, scheduledInterviewCount, messageCount, feedbackCount] =
      await Promise.all([
        CandidateAssessmentModel.countDocuments({ candidateId }),
        InterviewModel.countDocuments({ candidateId }),
        ScheduledInterviewModel.countDocuments({ candidateId }),
        MessageModel.countDocuments({ applicationId: { $in: applicationIds } }),
        InterviewFeedbackModel.countDocuments({ applicationId: { $in: applicationIds } }),
      ]);

    if (candidate.resume?.storageKey) {
      await getStorageProvider().delete(candidate.resume.storageKey);
    }

    // TODO(gdpr-v2): Candidate PII may still exist in related collections —
    // e.g. candidate name embedded in Message bodies, InterviewFeedback notes,
    // or ScheduledInterview descriptions. A future pass should scrub or redact
    // PII references in those models as well. The candidate-level scrub below
    // is the critical path for V1.
    await candidateRepository.update(candidateId, {
      name: 'Anonymized',
      email: `deleted-${candidateId}@anonymized.fluxberry.invalid`,
      phone: null,
      location: null,
      currentSalary: null,
      expectedSalary: null,
      linkedinUrl: null,
      resume: null,
      resumeText: null,
      parsedProfile: null,
      gdprStatus: 'ANONYMIZED',
      gdprAnonymizedAt: new Date(),
    });

    if (gdprRequestId) {
      await gdprRequestRepository.update(gdprRequestId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    }

    await eventBus.publish({
      workspaceId,
      type: 'candidate.anonymized',
      entityType: 'candidate',
      entityId: candidate._id,
      candidateId: candidate._id,
      actorLabel: 'system',
      payload: {
        applicationCount: applicationIds.length,
        assessmentCount,
        interviewCount,
        scheduledInterviewCount,
        messageCount,
        feedbackCount,
      },
    });

    await auditService.log({
      workspaceId,
      action: 'gdpr.anonymized',
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
