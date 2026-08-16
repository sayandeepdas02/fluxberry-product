import type { InterviewDto, PublicInterviewDto, InterviewSessionDto, SendInterviewInput } from '@fluxberry/shared';
import { SCORING_VERSION } from '@fluxberry/shared';
import { InterviewModel } from '../models/interview.model';
import { AiInterviewConfigModel } from '../models/ai-interview-config.model';
import { applicationRepository } from '../repositories/application.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { jobRepository } from '../repositories/job.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { getInterviewProvider, getInterviewProviderByName, getAIProvider, emailTemplates } from '../integrations';
import { toInterviewDto } from '../serializers/interview.serializer';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { stageService } from './stage.service';
import { configHash } from './interview-config.service';
import { workflowEngine } from './workflow-engine.service';
import { secureToken } from '../utils/ids';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { badRequest, notFound, forbidden } from '../utils/errors';

const CONSENT_TEXT =
  'This interview is conducted by an AI voice agent and will be recorded and transcribed for evaluation. By starting, you consent to the recording.';
const MAX_EVAL_POLLS = 20;

function isExpired(iv: any): boolean {
  return Boolean(iv.expiresAt && new Date(iv.expiresAt).getTime() < Date.now());
}

export const interviewService = {
  /** Recruiter sends an interview invite to a candidate's application. */
  async send(
    workspaceId: string,
    applicationId: string,
    input: SendInterviewInput,
    actor: { userId: string; label?: string },
  ): Promise<InterviewDto> {
    const application = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!application) throw notFound('Application not found');
    const candidate = await candidateRepository.findById(String(application.candidateId));
    const job = await jobRepository.findById(String(application.jobId));
    if (!candidate || !job) throw notFound('Application not found');

    const cfg = await AiInterviewConfigModel.findOne({ jobId: job._id });
    if (!cfg || (cfg.questions ?? []).length === 0) {
      throw badRequest('Configure the AI interview (add questions) before sending it');
    }
    if (!cfg.bolnaAgentId || cfg.agentSyncHash !== configHash(cfg)) {
      throw badRequest('The interview agent is not ready — re-save the interview configuration and try again');
    }

    const token = secureToken(24);
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3600_000);
    const provider = getInterviewProvider();
    const iv = await InterviewModel.create({
      workspaceId,
      applicationId,
      candidateId: candidate._id,
      jobId: job._id,
      interviewConfigId: cfg._id,
      secureToken: token,
      provider: provider.name,
      providerAgentId: cfg.bolnaAgentId ?? null,
      status: 'INVITED',
      invitedAt: new Date(),
      expiresAt,
    });

    const link = `${config.publicAppUrl}/interview/${token}`;
    const email = emailTemplates.custom({
      subject: `Your AI interview for ${job.title}`,
      body: `Hi ${candidate.name},\n\nYou're invited to a short AI voice interview for the ${job.title} role (about ${cfg.durationMinutes} minutes). Use a quiet space with your microphone enabled.\n\nStart here: ${link}\n\nThe link expires on ${expiresAt.toDateString()}.`,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      { to: candidate.email, subject: email.subject, html: email.html, text: email.text },
      { idempotencyKey: `interview-invite:${iv._id}` },
    );

    await eventBus.publish({
      workspaceId,
      type: 'interview.created',
      entityType: 'interview',
      entityId: iv._id,
      applicationId: application._id,
      candidateId: candidate._id,
      actorId: actor.userId,
      actorLabel: actor.label,
    });

    if (['APPLIED', 'SCREENING', 'ASSESSMENT'].includes(application.stage)) {
      await stageService.moveToStage(workspaceId, applicationId, 'INTERVIEW', actor);
    }

    return toInterviewDto(iv.toObject());
  },

  async listForApplication(workspaceId: string, applicationId: string): Promise<InterviewDto[]> {
    const list = await InterviewModel.find({ workspaceId, applicationId }).sort({ createdAt: -1 }).lean();
    return list.map(toInterviewDto);
  },

  // ---- Candidate (public, token-gated) ----
  async getByToken(token: string): Promise<PublicInterviewDto> {
    const iv = await InterviewModel.findOne({ secureToken: token });
    if (!iv) throw notFound('Interview not found');
    if (iv.status !== 'COMPLETED' && isExpired(iv) && iv.status !== 'EXPIRED') {
      await InterviewModel.findByIdAndUpdate(iv._id, { status: 'EXPIRED' });
      iv.status = 'EXPIRED';
    }
    const job = await jobRepository.findById(String(iv.jobId));
    const workspace = await workspaceRepository.findById(String(iv.workspaceId));
    const cfg = await AiInterviewConfigModel.findById(String(iv.interviewConfigId));
    return {
      token,
      jobTitle: job?.title ?? 'the role',
      companyName: workspace?.name ?? 'the company',
      status: iv.status,
      introduction: cfg?.introduction ?? '',
      durationMinutes: cfg?.durationMinutes ?? 6,
      questionCount: (cfg?.questions ?? []).length,
      consentText: CONSENT_TEXT,
      expiresAt: iv.expiresAt ? new Date(iv.expiresAt).toISOString() : null,
    };
  },

  /** Mint a browser session and mark the interview started. */
  async mintSession(token: string): Promise<InterviewSessionDto> {
    const iv = await InterviewModel.findOne({ secureToken: token });
    if (!iv) throw notFound('Interview not found');
    if (iv.status === 'COMPLETED') throw badRequest('This interview is already complete');
    if (isExpired(iv)) throw badRequest('This interview link has expired');

    const candidate = await candidateRepository.findById(String(iv.candidateId));
    const job = await jobRepository.findById(String(iv.jobId));
    const cfg = await AiInterviewConfigModel.findById(String(iv.interviewConfigId));

    if (iv.status === 'INVITED') {
      await InterviewModel.findByIdAndUpdate(iv._id, { status: 'STARTED', startedAt: new Date() });
      await eventBus.publish({
        workspaceId: iv.workspaceId,
        type: 'interview.started',
        entityType: 'interview',
        entityId: iv._id,
        applicationId: iv.applicationId,
        candidateId: iv.candidateId,
        actorLabel: 'candidate',
      });
    }

    const session = await getInterviewProviderByName(iv.provider).mintWebCallSession({
      agentId: iv.providerAgentId ?? null,
      userData: { candidate_name: candidate?.name ?? 'there', job_title: job?.title ?? 'the role' },
      questions: (cfg?.questions ?? []).map((q: any) => q.text),
    });
    return session as InterviewSessionDto;
  },

  /**
   * Candidate/client reports the provider execution id (or, for the mock, that
   * the simulated call finished). Kicks off async evaluation.
   */
  async reportCompletion(token: string, executionId?: string): Promise<{ status: string }> {
    const iv = await InterviewModel.findOne({ secureToken: token });
    if (!iv) throw notFound('Interview not found');
    if (iv.status === 'COMPLETED') return { status: 'COMPLETED' };
    if (iv.status === 'IN_PROGRESS') return { status: 'IN_PROGRESS' };
    if (iv.status !== 'STARTED') {
      throw badRequest(`This interview cannot be completed from its current status (${iv.status})`);
    }

    const execId = executionId || `mock_exec_${secureToken(6)}`;
    await InterviewModel.findByIdAndUpdate(iv._id, { status: 'IN_PROGRESS', providerExecutionId: execId });
    await jobQueue.enqueue(
      'PROCESS_INTERVIEW',
      { interviewId: String(iv._id) },
      { idempotencyKey: `interview-eval:${iv._id}` },
    );
    return { status: 'IN_PROGRESS' };
  },

  /** Provider webhook (untrusted): verify secret, map by execution id, enqueue. */
  async handleWebhook(secret: string, body: any): Promise<void> {
    const expected = config.providers.interview.webhookSecret;
    if (!expected || secret !== expected) throw forbidden('Invalid webhook secret');
    const executionId = body?.id ?? body?.execution_id;
    if (!executionId) return;
    // Never trust the payload — locate our record and re-fetch by id downstream.
    const iv = await InterviewModel.findOne({ providerExecutionId: String(executionId) });
    if (!iv) {
      logger.warn({ executionId }, 'bolna webhook for unknown execution — ignoring');
      return;
    }
    if (iv.status === 'COMPLETED') return;
    await jobQueue.enqueue(
      'PROCESS_INTERVIEW',
      { interviewId: String(iv._id) },
      { idempotencyKey: `interview-eval:${iv._id}` },
    );
  },

  /**
   * PROCESS_INTERVIEW handler: fetch the transcript, evaluate with AI, persist,
   * and resume the workflow — mirrors screening.
   */
  async evaluate(payload: { interviewId: string; polls?: number }): Promise<void> {
    const iv = await InterviewModel.findById(payload.interviewId);
    if (!iv || iv.status === 'COMPLETED') return;
    if (!iv.providerExecutionId) return;

    const job = await jobRepository.findById(String(iv.jobId));
    const exec = await getInterviewProviderByName(iv.provider).getExecution(iv.providerExecutionId);

    if (exec.status === 'FAILED') {
      await InterviewModel.findByIdAndUpdate(iv._id, { status: 'FAILED', error: 'Call failed' });
      return;
    }
    if (exec.status !== 'COMPLETED' || !exec.transcript) {
      const polls = (payload.polls ?? 0) + 1;
      if (polls > MAX_EVAL_POLLS) {
        await InterviewModel.findByIdAndUpdate(iv._id, { status: 'FAILED', error: 'Transcript not ready' });
        return;
      }
      await jobQueue.enqueue(
        'PROCESS_INTERVIEW',
        { interviewId: String(iv._id), polls },
        { runAt: new Date(Date.now() + 3000) },
      );
      return;
    }

    const evaln = await getAIProvider().evaluateInterview({
      transcript: exec.transcript,
      jobTitle: job?.title ?? 'the role',
    });

    await InterviewModel.findByIdAndUpdate(iv._id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      durationSec: exec.durationSec ?? null,
      transcript: exec.transcript,
      recordingUrl: exec.recordingUrl ?? null,
      providerMeta: exec.meta ?? null,
      evaluation: {
        communicationScore: evaln.communicationScore,
        technicalScore: evaln.technicalScore,
        confidenceScore: evaln.confidenceScore,
        problemSolvingScore: evaln.problemSolvingScore,
        overallScore: evaln.overallScore,
        summary: evaln.summary,
        strengths: evaln.strengths,
        concerns: evaln.concerns,
        provider: evaln.meta.provider,
        model: evaln.meta.model,
        promptVersion: `${SCORING_VERSION}+${evaln.meta.promptVersion}`,
        version: 1,
      },
    });

    await eventBus.publish({
      workspaceId: iv.workspaceId,
      type: 'interview.completed',
      entityType: 'interview',
      entityId: iv._id,
      applicationId: iv.applicationId,
      candidateId: iv.candidateId,
      payload: { score: evaln.overallScore },
    });

    await workflowEngine.resumeForApplication(String(iv.applicationId));
    logger.info({ interviewId: String(iv._id), score: evaln.overallScore }, 'interview evaluated');
  },
};
