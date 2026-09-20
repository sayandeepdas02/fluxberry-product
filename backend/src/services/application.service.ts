import crypto from 'node:crypto';
import type { PublicApplicationInput, PublicJobDto, FormQuestion } from '@fluxberry/shared';
import { workspaceRepository } from '../repositories/workspace.repository';
import { jobRepository } from '../repositories/job.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { applicationRepository, answersRepository } from '../repositories/application.repository';
import { candidateService } from './candidate.service';
import { formService } from './form.service';
import { toPublicJobDto } from '../serializers/job.serializer';
import { getStorageProvider, emailTemplates } from '../integrations';
import { assertValidResume } from '../utils/file-validation';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { workflowEngine } from './workflow-engine.service';
import { referralService } from './referral.service';
import { notFound, badRequest, conflict } from '../utils/errors';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { trackEvent } from '../integrations/posthog';

interface ResumeFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface QuestionFile {
  questionId: string | undefined;
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export const applicationService = {
  async getPublicJob(
    workspaceSlug: string,
    jobSlug: string,
  ): Promise<{ job: PublicJobDto; questions: FormQuestion[] }> {
    const workspace = await workspaceRepository.findBySlug(workspaceSlug);
    if (!workspace) throw notFound('Job not found');
    const job = await jobRepository.findBySlug(String(workspace._id), jobSlug);
    if (!job || job.status !== 'PUBLISHED') throw notFound('Job not found');

    const questions = await formService.getPublicQuestions(String(job._id));
    return {
      job: toPublicJobDto(job.toObject(), {
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
      }),
      questions,
    };
  },

  /**
   * Public application submission (spec §22). Ordered, idempotent writes:
   * upload resume -> find/create candidate -> create application -> save answers
   * -> emit event -> enqueue async parsing. The unique (job, candidate) index
   * prevents duplicate applications even under races.
   */
  async submitPublicApplication(
    workspaceSlug: string,
    jobSlug: string,
    input: PublicApplicationInput,
    resume: ResumeFile | undefined,
    questionFiles: QuestionFile[] = [],
  ): Promise<{ applicationId: string }> {
    const workspace = await workspaceRepository.findBySlug(workspaceSlug);
    if (!workspace) throw notFound('Job not found');
    const workspaceId = String(workspace._id);
    const job = await jobRepository.findBySlug(workspaceId, jobSlug);
    if (!job || job.status !== 'PUBLISHED') throw notFound('This job is not accepting applications');
    const jobId = String(job._id);

    if (!resume) throw badRequest('A resume is required');
    assertValidResume(resume.buffer);

    // Early duplicate check for a friendly message (unique index is the guarantee).
    const existingCandidate = await candidateRepository.findByEmail(workspaceId, input.email);
    if (existingCandidate) {
      const dup = await applicationRepository.findByJobAndCandidate(jobId, String(existingCandidate._id));
      if (dup) throw conflict("You've already applied to this role");
    }

    // 1. Upload resume to object storage.
    const storage = getStorageProvider();
    const safeName = resume.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const key = `resumes/${workspaceId}/${crypto.randomBytes(8).toString('hex')}-${safeName}`;
    const fileRef = await storage.upload({
      key,
      body: resume.buffer,
      contentType: resume.mimetype,
      fileName: resume.originalname,
    });

    // 2. Find or create candidate, attach the (new) resume.
    const candidate = await candidateService.findOrCreate(workspaceId, input);
    await candidateRepository.update(String(candidate._id), {
      resume: fileRef,
      resumeStatus: 'PENDING',
      parseError: null,
    });

    // 3. Create the application (unique index enforces one per job+candidate).
    // Referral attribution never trusts the client-supplied `source` alone —
    // only a code that actually resolves to a Referral for *this job* flips
    // it, since Referral.applicationIds feeds reward eligibility (real money,
    // however manually disbursed in v1).
    const referralId = await referralService.resolveForAttribution(input.referralCode, jobId);
    const effectiveSource = referralId ? 'REFERRAL' : input.source;
    let application;
    try {
      application = await applicationRepository.create({
        workspaceId,
        jobId,
        candidateId: candidate._id,
        status: 'ACTIVE',
        stage: 'APPLIED',
        source: effectiveSource,
        referralCode: referralId ? input.referralCode : null,
        appliedAt: new Date(),
      });
    } catch (err) {
      if (isDup(err)) throw conflict("You've already applied to this role");
      throw err;
    }
    if (referralId) {
      // Best-effort inline attempt; on transient failure fall back to a durable
      // background job so the referral linkage is never silently lost. The
      // idempotency key and $addToSet in the repo make double-execution safe.
      try {
        await referralService.recordApplication(referralId, String(application._id));
      } catch (err) {
        logger.error({ err, referralId, applicationId: String(application._id) }, 'failed to record referral application; enqueueing for retry');
        await jobQueue.enqueue(
          'LINK_REFERRAL_APPLICATION',
          { referralId, applicationId: String(application._id) },
          { idempotencyKey: `link-referral:${application._id}` },
        );
      }
    }

    // 4. Upload any custom FILE_UPLOAD/VIDEO_RECORDING question answers, then save all answers.
    // The client never supplies a storage reference directly (see publicAnswerValueSchema) —
    // only the server, after actually uploading the bytes, may attach a FileRef to an answer.
    const fileAnswers = await Promise.all(
      questionFiles
        .filter((f): f is QuestionFile & { questionId: string } => Boolean(f.questionId))
        .map(async (f) => {
          const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
          const fileKey = `question-answers/${workspaceId}/${crypto.randomBytes(8).toString('hex')}-${safeName}`;
          const ref = await storage.upload({
            key: fileKey,
            body: f.buffer,
            contentType: f.mimetype,
            fileName: f.originalname,
          });
          return { questionId: f.questionId, value: ref };
        }),
    );
    const allAnswers = [...input.answers, ...fileAnswers];
    if (allAnswers.length) {
      await answersRepository.upsert(String(application._id), allAnswers);
    }

    // 5. Emit domain event + 6. enqueue async resume parsing (never blocks response).
    await eventBus.publish({
      workspaceId,
      type: 'application.created',
      entityType: 'application',
      entityId: application._id,
      applicationId: application._id,
      candidateId: candidate._id,
      actorLabel: 'candidate',
      payload: { jobId, source: effectiveSource },
    });
    const resumeJobType = config.features.AV_SCANNING ? 'SCAN_RESUME' : 'PARSE_RESUME';
    await jobQueue.enqueue(
      resumeJobType,
      { workspaceId, candidateId: String(candidate._id), applicationId: String(application._id) },
      { idempotencyKey: `${resumeJobType.toLowerCase()}:${application._id}` },
    );

    // Kick off the job's workflow (if one is active).
    await workflowEngine.startRunForApplication(workspaceId, jobId, String(application._id));

    // Send confirmation email to the candidate (fire-and-forget, never blocks apply response).
    void (async () => {
      try {
        const confirmEmail = emailTemplates.applicationConfirmation({
          candidateName: candidate.name,
          jobTitle: job.title,
          companyName: workspace.name,
        });
        await jobQueue.enqueue(
          'SEND_EMAIL',
          { to: candidate.email, subject: confirmEmail.subject, html: confirmEmail.html, text: confirmEmail.text },
          { idempotencyKey: `app-confirm:${application._id}` },
        );
      } catch (e) {
        logger.warn({ applicationId: String(application._id), err: e }, 'application confirmation email enqueue failed');
      }
    })();

    trackEvent(String(candidate._id), 'candidate.applied', { workspaceId, jobId, applicationId: String(application._id) });
    logger.info({ applicationId: String(application._id), jobId }, 'application submitted');
    return { applicationId: String(application._id) };
  },
};

function isDup(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000;
}
