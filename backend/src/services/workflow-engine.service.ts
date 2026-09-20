import type { WorkflowContext } from './condition-engine';
import { evaluateCondition } from './condition-engine';
import { workflowRepository, workflowRunRepository, workflowStepRepository } from '../repositories/workflow.repository';
import { applicationRepository } from '../repositories/application.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { jobRepository } from '../repositories/job.repository';
import { CandidateAssessmentModel } from '../models/candidate-assessment.model';
import { InterviewModel } from '../models/interview.model';
import { assessmentService } from './assessment.service';
import { interviewService } from './interview.service';
import { stageService } from './stage.service';
import { jobQueue } from '../queue/job-queue';
import { emailTemplates } from '../integrations';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import type { PipelineStage } from '../shared';
import { defaultPipelineStages } from '../shared';

const MAX_STEPS_PER_RUN = 100;

async function buildContext(
  app: any,
  candidate: any,
  assessmentScore: number | null,
  interviewScore: number | null,
): Promise<WorkflowContext> {
  return {
    screening_score: app.screeningResult?.score ?? app.score ?? null,
    assessment_score: assessmentScore,
    interview_score: interviewScore,
    years_experience: candidate?.parsedProfile?.yearsExperience ?? null,
    expected_salary: candidate?.expectedSalary ?? null,
    location: candidate?.location ?? null,
    stage: app.stage,
  };
}

async function latestInterviewScore(applicationId: string): Promise<number | null> {
  const iv = await InterviewModel.findOne({ applicationId, status: 'COMPLETED' })
    .sort({ completedAt: -1 })
    .select('evaluation')
    .lean();
  return (iv?.evaluation as any)?.overallScore ?? null;
}

async function latestCompletedAssessmentScore(applicationId: string): Promise<number | null> {
  const ca = await CandidateAssessmentModel.findOne({ applicationId, status: 'COMPLETED' })
    .sort({ completedAt: -1 })
    .select('score')
    .lean();
  return ca?.score ?? null;
}

export const workflowEngine = {
  /** Called on application.created — start a run if the job has an ACTIVE workflow. */
  async startRunForApplication(workspaceId: string, jobId: string, applicationId: string): Promise<void> {
    const wf = await workflowRepository.findByJob(jobId);
    if (!wf || wf.status !== 'ACTIVE' || wf.nodes.length === 0) return;
    const existing = await workflowRunRepository.findByApplication(applicationId);
    if (existing) return;
    const run = await workflowRunRepository.create({
      workspaceId,
      workflowId: wf._id,
      applicationId,
      status: 'RUNNING',
      context: { index: 0 },
      currentNodeId: wf.nodes[0].id,
      startedAt: new Date(),
    });
    await jobQueue.enqueue('RUN_WORKFLOW', { runId: String(run._id) }, { idempotencyKey: `wf-start:${run._id}` });
    logger.info({ runId: String(run._id), applicationId }, 'workflow run started');
  },

  /** Poke a waiting run to continue (after screening/assessment completes). */
  async resumeForApplication(applicationId: string): Promise<void> {
    const run = await workflowRunRepository.activeByApplication(applicationId);
    if (!run) return;
    await jobQueue.enqueue('RUN_WORKFLOW', { runId: String(run._id) });
  },

  /** RUN_WORKFLOW handler body — durable, resumable executor (spec §52). */
  async execute(runId: string): Promise<void> {
    const run = await workflowRunRepository.findById(runId);
    if (!run || ['COMPLETED', 'FAILED', 'STOPPED'].includes(run.status)) return;
    const wf = await workflowRepository.findById(String(run.workflowId));
    if (!wf) return;

    const app = await applicationRepository.findById(String(run.applicationId));
    if (!app) return;
    const candidate = await candidateRepository.findById(String(app.candidateId));
    const job = await jobRepository.findById(String(app.jobId));
    const actor = { userId: String(job?.createdBy ?? ''), label: 'workflow' };
    const workspaceId = String(run.workspaceId);
    const applicationId = String(run.applicationId);

    const assessmentScore = await latestCompletedAssessmentScore(applicationId);
    const interviewScore = await latestInterviewScore(applicationId);
    const ctx: WorkflowContext = {
      ...(run.context as WorkflowContext),
      ...(await buildContext(app, candidate, assessmentScore, interviewScore)),
    };
    const nodes = wf.nodes;
    let index = (ctx.index as number) ?? 0;

    const recordStep = (node: any, status: string, output?: unknown, error?: string) =>
      workflowStepRepository.create({
        workflowRunId: runId,
        nodeId: node.id,
        nodeType: node.type,
        status,
        output: output ?? null,
        error: error ?? null,
        completedAt: new Date(),
      });

    const persist = (patch: Record<string, any>) => workflowRunRepository.update(runId, patch);

    try {
      await persist({ status: 'RUNNING' });

      for (let guard = 0; guard < MAX_STEPS_PER_RUN; guard++) {
        if (index >= nodes.length) {
          await persist({ status: 'COMPLETED', completedAt: new Date(), currentNodeId: null, context: { ...ctx, index } });
          logger.info({ runId }, 'workflow completed');
          return;
        }
        const node = nodes[index];
        const cfg = (node.config ?? {}) as any;

        switch (node.type) {
          case 'AI_SCREEN': {
            if (app.screeningResult?.status === 'COMPLETED') {
              ctx.screening_score = app.screeningResult.score;
              await recordStep(node, 'COMPLETED', { score: app.screeningResult.score });
              index++;
            } else {
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return; // resumes on screening.completed
            }
            break;
          }
          case 'CONDITION': {
            const ok = cfg.condition ? evaluateCondition(cfg.condition, ctx) : true;
            await recordStep(node, 'COMPLETED', { result: ok, condition: cfg.condition });
            if (ok) {
              index++;
            } else {
              await persist({ status: 'COMPLETED', completedAt: new Date(), currentNodeId: null, context: { ...ctx, index, stoppedReason: 'condition_not_met' } });
              logger.info({ runId }, 'workflow stopped: condition not met');
              return;
            }
            break;
          }
          case 'SEND_ASSESSMENT': {
            if (!ctx.assessmentSent) {
              if (cfg.assessmentId) {
                await assessmentService.send(workspaceId, applicationId, { assessmentId: cfg.assessmentId, expiresInHours: 168 }, actor);
              }
              ctx.assessmentSent = true;
              await recordStep(node, 'COMPLETED', { sent: true });
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return; // resumes on assessment.completed
            }
            if (assessmentScore != null) {
              ctx.assessment_score = assessmentScore;
              ctx.assessmentSent = false;
              await recordStep(node, 'COMPLETED', { score: assessmentScore });
              index++;
            } else {
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return;
            }
            break;
          }
          case 'WAIT': {
            const hours = Number(cfg.durationHours ?? 0);
            const now = Date.now();
            const resumeAt = ctx.waitUntil ? new Date(ctx.waitUntil as string).getTime() : now + hours * 3600_000;
            if (now < resumeAt) {
              ctx.waitUntil = new Date(resumeAt).toISOString();
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              await jobQueue.enqueue('RUN_WORKFLOW', { runId }, { runAt: new Date(resumeAt) });
              return; // durable delay (spec §53)
            }
            delete ctx.waitUntil;
            await recordStep(node, 'COMPLETED');
            index++;
            break;
          }
          case 'MOVE_STAGE': {
            // A job's stages can be edited after a workflow is authored — if the
            // target stage id no longer exists, skip this node rather than
            // failing the whole run (the top-level catch below would otherwise
            // mark the entire run FAILED for what's really just a stale config).
            if (cfg.stage) {
              const currentStages = ((job?.stages as PipelineStage[] | null) ?? defaultPipelineStages());
              const validStageIds = new Set(currentStages.map((s) => s.id));
              if (validStageIds.has(cfg.stage)) {
                await stageService.moveToStage(workspaceId, applicationId, cfg.stage, actor);
                await recordStep(node, 'COMPLETED', { stage: cfg.stage });
              } else {
                logger.warn({ runId, jobId: String(job?._id ?? ''), stage: cfg.stage }, 'MOVE_STAGE target stage no longer exists — skipping');
                await recordStep(node, 'SKIPPED', undefined, `Stage "${cfg.stage}" no longer exists on this job`);
              }
            } else {
              await recordStep(node, 'COMPLETED', { stage: cfg.stage });
            }
            index++;
            break;
          }
          case 'SEND_EMAIL': {
            const email = emailTemplates.custom({ subject: cfg.subject ?? 'Update on your application', body: cfg.body ?? 'We have an update on your application.' });
            if (candidate?.email) {
              await jobQueue.enqueue('SEND_EMAIL', { to: candidate.email, subject: email.subject, html: email.html, text: email.text });
            }
            await recordStep(node, 'COMPLETED');
            index++;
            break;
          }
          case 'CODING_ASSESSMENT': {
            // Send-and-wait, mirroring SEND_ASSESSMENT: dispatch the coding test
            // once, pause, and resume when Judge0 grading completes.
            if (!ctx.codingSent) {
              if (cfg.assessmentId) {
                await assessmentService.send(
                  workspaceId,
                  applicationId,
                  { assessmentId: cfg.assessmentId, expiresInHours: 168 },
                  actor,
                );
              }
              ctx.codingSent = true;
              await recordStep(node, 'COMPLETED', { sent: true });
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return; // resumes when the coding assessment is graded
            }
            const codingDone = cfg.assessmentId
              ? await CandidateAssessmentModel.findOne({
                  applicationId,
                  assessmentId: cfg.assessmentId,
                  status: 'COMPLETED',
                })
                  .sort({ completedAt: -1 })
                  .select('score')
                  .lean()
              : null;
            if (codingDone) {
              ctx.assessment_score = codingDone.score ?? null;
              ctx.codingSent = false;
              await recordStep(node, 'COMPLETED', { score: codingDone.score ?? null });
              index++;
            } else {
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return;
            }
            break;
          }
          case 'AI_INTERVIEW': {
            if (!config.features.AI_INTERVIEW) {
              logger.warn({ applicationId }, 'AI_INTERVIEW step skipped — feature disabled');
              await recordStep(node, 'COMPLETED', { skipped: true, reason: 'AI_INTERVIEW feature disabled' });
              index++;
              break;
            }
            // Send-and-wait: dispatch the interview invite once, pause, and
            // resume when the transcript has been evaluated.
            if (!ctx.interviewSent) {
              await interviewService.send(workspaceId, applicationId, { expiresInHours: 168 }, actor);
              ctx.interviewSent = true;
              await recordStep(node, 'COMPLETED', { sent: true });
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return; // resumes when the interview is evaluated
            }
            const interviewDone = await InterviewModel.findOne({ applicationId, status: 'COMPLETED' })
              .sort({ completedAt: -1 })
              .select('evaluation')
              .lean();
            if (interviewDone) {
              ctx.interview_score = (interviewDone.evaluation as any)?.overallScore ?? null;
              ctx.interviewSent = false;
              await recordStep(node, 'COMPLETED', { score: ctx.interview_score });
              index++;
            } else {
              ctx.index = index;
              await persist({ status: 'WAITING', currentNodeId: node.id, context: ctx });
              return;
            }
            break;
          }
          default: {
            await recordStep(node, 'COMPLETED');
            index++;
          }
        }

        // Persist progress after every node (spec §52).
        ctx.index = index;
        await persist({ context: ctx, currentNodeId: nodes[index]?.id ?? null });
      }

      await persist({ status: 'COMPLETED', completedAt: new Date(), context: { ...ctx, index } });
    } catch (err) {
      logger.error({ runId, err }, 'workflow step failed');
      await persist({ status: 'FAILED', error: (err as Error).message?.slice(0, 500) ?? 'Workflow failed' });
    }
  },
};
