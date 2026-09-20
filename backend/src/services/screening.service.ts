import type { ParsedProfile } from '../shared';
import { SCORING_VERSION } from '../shared';
import { candidateRepository } from '../repositories/candidate.repository';
import { applicationRepository } from '../repositories/application.repository';
import { jobRepository } from '../repositories/job.repository';
import { ScreeningResultModel } from '../models/screening-result.model';
import { getAIProvider, getStorageProvider } from '../integrations';
import { extractResumeText } from '../utils/resume-extract';
import { computeScreeningScore } from './scoring.engine';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { workflowEngine } from './workflow-engine.service';
import { logger } from '../utils/logger';
import { notFound } from '../utils/errors';

export const screeningService = {
  /** PARSE_RESUME handler body: extract text -> AI structured profile. */
  async parseResume(payload: { workspaceId: string; candidateId: string; applicationId: string }) {
    const candidate = await candidateRepository.findById(payload.candidateId);
    if (!candidate || !candidate.resume) {
      logger.warn({ candidateId: payload.candidateId }, 'parseResume: no candidate/resume');
      return;
    }

    await candidateRepository.update(payload.candidateId, { resumeStatus: 'PROCESSING', parseError: null });
    await eventBus.publish({
      workspaceId: payload.workspaceId,
      type: 'resume.processing.started',
      entityType: 'candidate',
      entityId: payload.candidateId,
      candidateId: payload.candidateId,
      applicationId: payload.applicationId,
    });

    try {
      const bytes = await getStorageProvider().download(candidate.resume.storageKey);
      const text = await extractResumeText(bytes);
      const ai = getAIProvider();
      const { profile, meta } = await ai.parseResume({
        resumeText: text,
        fileName: candidate.resume.fileName,
        hints: { name: candidate.name, email: candidate.email },
      });

      await candidateRepository.update(payload.candidateId, {
        resumeText: text.slice(0, 20000),
        parsedProfile: profile,
        resumeStatus: 'COMPLETED',
      });
      await eventBus.publish({
        workspaceId: payload.workspaceId,
        type: 'resume.processing.completed',
        entityType: 'candidate',
        entityId: payload.candidateId,
        candidateId: payload.candidateId,
        applicationId: payload.applicationId,
        payload: { model: meta.model },
      });

      // Chain into screening.
      await jobQueue.enqueue(
        'SCREEN_CANDIDATE',
        { workspaceId: payload.workspaceId, applicationId: payload.applicationId },
        { idempotencyKey: `screen:${payload.applicationId}:v-parse` },
      );
    } catch (err) {
      await candidateRepository.update(payload.candidateId, {
        resumeStatus: 'FAILED',
        parseError: (err as Error).message?.slice(0, 500) ?? 'Parse failed',
      });
      await eventBus.publish({
        workspaceId: payload.workspaceId,
        type: 'resume.processing.failed',
        entityType: 'candidate',
        entityId: payload.candidateId,
        candidateId: payload.candidateId,
        applicationId: payload.applicationId,
      });
      throw err; // let the worker retry (spec §100: never destroys candidate data)
    }
  },

  /** SCREEN_CANDIDATE handler body: deterministic score + AI reasoning. */
  async screen(payload: { workspaceId: string; applicationId: string }) {
    const app = await applicationRepository.findInWorkspace(payload.workspaceId, payload.applicationId);
    if (!app) return;
    const candidate = await candidateRepository.findById(String(app.candidateId));
    const job = await jobRepository.findById(String(app.jobId));
    if (!candidate || !job) return;

    await applicationRepository.update(payload.applicationId, {
      'screeningResult.status': 'PROCESSING',
    });
    await eventBus.publish({
      workspaceId: payload.workspaceId,
      type: 'screening.started',
      entityType: 'application',
      entityId: payload.applicationId,
      applicationId: payload.applicationId,
      candidateId: app.candidateId,
    });

    try {
      const profile: ParsedProfile = candidate.parsedProfile ?? {};
      const req = job.structuredRequirements;
      const scoringInput = {
        job: {
          requiredSkills: req?.requiredSkills ?? job.skills.filter((s: any) => s.required).map((s: any) => s.name),
          preferredSkills: req?.preferredSkills ?? job.skills.filter((s: any) => !s.required).map((s: any) => s.name),
          experienceMin: job.experience?.min ?? null,
          experienceMax: job.experience?.max ?? null,
          location: job.location,
          workMode: job.workMode,
          salaryMin: job.salary?.min ?? null,
          salaryMax: job.salary?.max ?? null,
          education: req?.education ?? [],
        },
        candidate: {
          skills: profile.skills ?? [],
          yearsExperience: profile.yearsExperience ?? null,
          location: candidate.location,
          expectedSalary: candidate.expectedSalary,
          hasEducation: Boolean(profile.education?.length),
        },
      };

      // Preliminary deterministic breakdown (relevance proxy) for AI context.
      const prelim = computeScreeningScore({ ...scoringInput, aiRelevance: scoringInput.candidate.skills.length ? 6 : 5 });
      const ai = getAIProvider();
      const reasoning = await ai.screenCandidate({
        job: {
          title: job.title,
          structuredRequirements: req as any,
          skills: job.skills as any,
          location: job.location,
          salary: job.salary as any,
          experience: job.experience as any,
        },
        candidate: {
          parsedProfile: profile,
          expectedSalary: candidate.expectedSalary,
          location: candidate.location,
          yearsExperience: profile.yearsExperience,
        },
        deterministic: prelim.breakdown,
      });

      const final = computeScreeningScore({ ...scoringInput, aiRelevance: reasoning.relevanceScore });

      // Version + persist history (deactivate previous).
      const last = await ScreeningResultModel.findOne({ applicationId: payload.applicationId })
        .sort({ version: -1 })
        .select('version')
        .lean();
      const version = (last?.version ?? 0) + 1;
      await ScreeningResultModel.updateMany({ applicationId: payload.applicationId }, { active: false });
      await ScreeningResultModel.create({
        workspaceId: payload.workspaceId,
        applicationId: payload.applicationId,
        candidateId: app.candidateId,
        jobId: app.jobId,
        version,
        active: true,
        score: final.total,
        breakdown: final.breakdown,
        summary: reasoning.summary,
        strengths: reasoning.strengths,
        concerns: reasoning.concerns,
        provider: reasoning.meta.provider,
        model: reasoning.meta.model,
        promptVersion: `${SCORING_VERSION}+${reasoning.meta.promptVersion}`,
      });

      await applicationRepository.update(payload.applicationId, {
        score: final.total,
        screeningResult: {
          status: 'COMPLETED',
          score: final.total,
          breakdown: final.breakdown,
          summary: reasoning.summary,
          strengths: reasoning.strengths,
          concerns: reasoning.concerns,
          provider: reasoning.meta.provider,
          model: reasoning.meta.model,
          promptVersion: `${SCORING_VERSION}+${reasoning.meta.promptVersion}`,
          version,
          createdAt: new Date(),
        },
      });

      await eventBus.publish({
        workspaceId: payload.workspaceId,
        type: 'screening.completed',
        entityType: 'application',
        entityId: payload.applicationId,
        applicationId: payload.applicationId,
        candidateId: app.candidateId,
        payload: { score: final.total },
      });
      // Resume any workflow waiting on AI screening.
      await workflowEngine.resumeForApplication(payload.applicationId);
      logger.info({ applicationId: payload.applicationId, score: final.total }, 'screening completed');
    } catch (err) {
      await applicationRepository.update(payload.applicationId, { 'screeningResult.status': 'FAILED' });
      throw err;
    }
  },

  /** Retry: re-run parsing (and screening) for a candidate's application. */
  async retry(workspaceId: string, applicationId: string) {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    await applicationRepository.update(applicationId, { 'screeningResult.status': 'PENDING' });
    await jobQueue.enqueue('PARSE_RESUME', {
      workspaceId,
      candidateId: String(app.candidateId),
      applicationId,
    });
  },
};
