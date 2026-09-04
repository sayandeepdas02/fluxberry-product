import { Types } from 'mongoose';
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  SendAssessmentInput,
  AssessmentStatus,
  AssessmentDto,
  CandidateAssessmentDto,
  JobAssessmentRowDto,
} from '@fluxberry/shared';
import { assessmentRepository, candidateAssessmentRepository } from '../repositories/assessment.repository';
import { applicationRepository } from '../repositories/application.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { ApplicationModel } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { toAssessmentDto, toCandidateAssessmentDto } from '../serializers/assessment.serializer';
import { secureToken } from '../utils/ids';
import { config } from '../config/env';
import { emailTemplates } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import { eventBus } from '../events/event-bus';
import { stageService } from './stage.service';
import { auditService } from './audit.service';
import { badRequest, notFound } from '../utils/errors';
import { trackEvent } from '../integrations/posthog';

export const assessmentService = {
  async create(workspaceId: string, userId: string, input: CreateAssessmentInput): Promise<AssessmentDto> {
    const a = await assessmentRepository.create({ ...input, workspaceId, createdBy: userId });
    return toAssessmentDto(a.toObject());
  },

  async update(workspaceId: string, id: string, input: UpdateAssessmentInput): Promise<AssessmentDto> {
    const existing = await assessmentRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Assessment not found');
    const a = await assessmentRepository.update(id, input);
    return toAssessmentDto(a!.toObject());
  },

  async setStatus(workspaceId: string, id: string, status: AssessmentStatus): Promise<AssessmentDto> {
    const existing = await assessmentRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Assessment not found');
    const a = await assessmentRepository.update(id, { status });
    return toAssessmentDto(a!.toObject());
  },

  /** Dedicated publish step (mirrors job publish): validates content, idempotent. */
  async publish(workspaceId: string, id: string): Promise<AssessmentDto> {
    const existing = await assessmentRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Assessment not found');
    if (existing.status === 'PUBLISHED') return toAssessmentDto(existing.toObject());
    if (!existing.questions || existing.questions.length === 0) {
      throw badRequest('Add at least one question before publishing');
    }
    const a = await assessmentRepository.update(id, { status: 'PUBLISHED' });
    return toAssessmentDto(a!.toObject());
  },

  /** Only DRAFT assessments can be deleted — a PUBLISHED one may already have candidate assessments referencing it. */
  async remove(workspaceId: string, id: string): Promise<void> {
    const existing = await assessmentRepository.findInWorkspace(workspaceId, id);
    if (!existing) throw notFound('Assessment not found');
    if (existing.status !== 'DRAFT') throw badRequest('Only draft assessments can be deleted');
    await assessmentRepository.remove(id);
  },

  async list(workspaceId: string): Promise<AssessmentDto[]> {
    const items = await assessmentRepository.list(workspaceId);
    const counts = await Promise.all(items.map((a) => candidateAssessmentRepository.countByAssessment(String(a._id))));
    return items.map((a, i) => toAssessmentDto(a, counts[i]));
  },

  async get(workspaceId: string, id: string): Promise<AssessmentDto> {
    const a = await assessmentRepository.findInWorkspace(workspaceId, id);
    if (!a) throw notFound('Assessment not found');
    const count = await candidateAssessmentRepository.countByAssessment(id);
    return toAssessmentDto(a.toObject(), count);
  },

  /** Send an assessment to a candidate: secure link + email invite (spec §39). */
  async send(
    workspaceId: string,
    applicationId: string,
    input: SendAssessmentInput,
    actor: { userId: string; label?: string },
  ): Promise<CandidateAssessmentDto> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const assessment = await assessmentRepository.findInWorkspace(workspaceId, input.assessmentId);
    if (!assessment) throw notFound('Assessment not found');
    if (assessment.status !== 'PUBLISHED') throw badRequest('Publish the assessment before sending it');

    const candidate = await candidateRepository.findById(String(application.candidateId));
    if (!candidate) throw notFound('Candidate not found');
    const job = await JobModel.findById(application.jobId).select('title').lean();

    const token = secureToken(24);
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3600_000);
    const ca = await candidateAssessmentRepository.create({
      workspaceId,
      applicationId,
      candidateId: candidate._id,
      assessmentId: assessment._id,
      secureToken: token,
      status: 'INVITED',
      invitedAt: new Date(),
      expiresAt,
      maxScore: 100,
    });

    const link = `${config.publicAppUrl}/assessment/${token}`;
    const email = emailTemplates.assessmentInvitation({
      candidateName: candidate.name,
      jobTitle: job?.title ?? 'the role',
      assessmentName: assessment.name,
      link,
      durationMinutes: assessment.durationMinutes,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      { to: candidate.email, subject: email.subject, html: email.html, text: email.text },
      { idempotencyKey: `assessment-invite:${ca._id}` },
    );

    // Deferred reminder: fires 48h later but only if the candidate hasn't started yet.
    const reminder = emailTemplates.assessmentReminder({
      candidateName: candidate.name,
      assessmentName: assessment.name,
      link,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      {
        to: candidate.email,
        subject: reminder.subject,
        html: reminder.html,
        text: reminder.text,
        conditionCheck: {
          type: 'candidate_assessment_status',
          candidateAssessmentId: String(ca._id),
          allowedStatuses: ['INVITED'],
        },
      },
      {
        idempotencyKey: `assessment-reminder:${ca._id}`,
        runAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    );

    await eventBus.publish({
      workspaceId,
      type: 'assessment.sent',
      entityType: 'candidate_assessment',
      entityId: ca._id,
      applicationId,
      candidateId: candidate._id,
      actorId: actor.userId,
      actorLabel: actor.label ?? 'user',
      payload: { assessmentName: assessment.name },
    });
    await auditService.log({
      workspaceId,
      userId: actor.userId,
      action: 'assessment.sent',
      resourceType: 'candidate_assessment',
      resourceId: String(ca._id),
      metadata: { assessmentId: input.assessmentId },
    });

    // Advance the candidate to the Assessment stage if still early.
    if (application.stage === 'APPLIED' || application.stage === 'SCREENING') {
      await stageService.moveToStage(workspaceId, applicationId, 'ASSESSMENT', actor);
    }

    trackEvent(actor.userId, 'assessment.sent', { workspaceId, assessmentId: input.assessmentId, applicationId });
    return toCandidateAssessmentDto(ca.toObject(), { name: assessment.name, type: assessment.type });
  },

  /** Flat per-candidate-per-assessment view for a job's Assessments tab. */
  async listForJob(workspaceId: string, jobId: string): Promise<JobAssessmentRowDto[]> {
    const wsId = new Types.ObjectId(workspaceId);
    const jId = new Types.ObjectId(jobId);
    const rows = await ApplicationModel.aggregate([
      { $match: { workspaceId: wsId, jobId: jId } },
      { $lookup: { from: 'candidate_assessments', localField: '_id', foreignField: 'applicationId', as: 'ca' } },
      { $unwind: '$ca' },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'candidate' } },
      { $unwind: '$candidate' },
      { $lookup: { from: 'assessments', localField: 'ca.assessmentId', foreignField: '_id', as: 'assessment' } },
      { $unwind: '$assessment' },
      { $sort: { 'ca.invitedAt': -1 } },
    ]);
    return rows.map((r: any) => ({
      applicationId: String(r._id),
      candidateId: String(r.candidate._id),
      candidateName: r.candidate.name,
      candidateEmail: r.candidate.email,
      assessmentId: String(r.assessment._id),
      assessmentName: r.assessment.name,
      assessmentType: r.assessment.type,
      status: r.ca.status,
      score: r.ca.score ?? null,
      maxScore: r.ca.maxScore ?? null,
      invitedAt: r.ca.invitedAt ? new Date(r.ca.invitedAt).toISOString() : null,
      completedAt: r.ca.completedAt ? new Date(r.ca.completedAt).toISOString() : null,
    }));
  },

  async listForApplication(workspaceId: string, applicationId: string): Promise<CandidateAssessmentDto[]> {
    const list = await candidateAssessmentRepository.listByApplication(applicationId);
    const filtered = list.filter((c) => String(c.workspaceId) === workspaceId);
    const metaById = new Map<string, { name: string; type: any }>();
    for (const ca of filtered) {
      const id = String(ca.assessmentId);
      if (!metaById.has(id)) {
        const a = await assessmentRepository.findInWorkspace(workspaceId, id);
        metaById.set(id, { name: a?.name ?? 'Assessment', type: a?.type ?? 'MCQ' });
      }
    }
    return filtered.map((ca) =>
      toCandidateAssessmentDto(ca, metaById.get(String(ca.assessmentId)) ?? { name: 'Assessment', type: 'MCQ' }),
    );
  },
};
