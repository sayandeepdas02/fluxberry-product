import type { ParsedProfile, BillingSubscriptionStatus } from '../shared';
import { SCORING_VERSION, ACTIVE_BILLING_STATUSES } from '../shared';
import { accountRepository } from '../repositories/account.repository';
import { creditsService } from './credits.service';
import { AppError, badRequest, insufficientCredits } from '../utils/errors';
import { candidateRepository } from '../repositories/candidate.repository';
import { applicationRepository } from '../repositories/application.repository';
import { jobRepository } from '../repositories/job.repository';
import { ScreeningResultModel } from '../models/screening-result.model';
import { getAIProvider, getStorageProvider } from '../integrations';
import { extractResumeText } from '../utils/resume-extract';
import { computeScreeningScore } from './scoring.engine';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { logger } from '../utils/logger';
import { notFound } from '../utils/errors';

const isInsufficientCredits = (err: unknown) => err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS';

export const screeningService = {
  /** PARSE_RESUME handler body: extract text -> AI structured profile. */
  async parseResume(payload: { workspaceId: string; candidateId: string; applicationId: string; run?: number }) {
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
        // Keyed per run so a manual re-screen actually re-scores (a fixed key was
        // silently deduped against the first screening forever).
        { idempotencyKey: `screen:${payload.applicationId}:${payload.run ?? 'v-parse'}` },
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
      logger.info({ applicationId: payload.applicationId, score: final.total }, 'screening completed');
    } catch (err) {
      await applicationRepository.update(payload.applicationId, { 'screeningResult.status': 'FAILED' });
      throw err;
    }
  },

  /**
   * Pay for one applicant's automatic AI screening (resume parse + score): the
   * plan's included quota first, then one APPLICANT_SCREENING credit. Billed at
   * most once per application (screeningBilledVia). With no active subscription,
   * or nothing left to pay with, the application is marked AWAITING_CREDITS and
   * the AI is skipped — the application itself is never blocked.
   */
  async authorizeScreening(workspaceId: string, applicationId: string, actorUserId: string | null = null): Promise<boolean> {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) return false;
    if (app.screeningBilledVia) return true;

    // Only one concurrent caller may bill a given application — otherwise two
    // simultaneous submissions could each take quota (or a credit) for it.
    const claimed = await applicationRepository.claimScreeningBilling(applicationId);
    if (!claimed) {
      // Someone else holds (or just finished) the claim — they queue the screening.
      const fresh = await applicationRepository.findInWorkspace(workspaceId, applicationId);
      return Boolean(fresh?.screeningBilledVia);
    }

    const settleAs = (via: 'QUOTA' | 'CREDITS' | null) =>
      applicationRepository.update(
        applicationId,
        via
          ? { screeningBilledVia: via, screeningClaimAt: null, 'screeningResult.status': 'PENDING' }
          : { screeningClaimAt: null, 'screeningResult.status': 'AWAITING_CREDITS' },
      );

    try {
      const account = await accountRepository.ensureForWorkspace(workspaceId);
      const status = (account?.billing?.subscriptionStatus as BillingSubscriptionStatus | undefined) ?? 'none';
      if (!account || !ACTIVE_BILLING_STATUSES.includes(status)) {
        await settleAs(null);
        return false;
      }
      const accountId = String(account._id);

      let via: 'QUOTA' | 'CREDITS' | null = null;
      if (await creditsService.claimScreeningQuota(accountId)) {
        via = 'QUOTA';
      } else {
        try {
          await creditsService.charge(accountId, 'APPLICANT_SCREENING', 1, {
            idempotencyKey: `screen-${applicationId}`,
            actorUserId,
            meta: { applicationId },
          });
          via = 'CREDITS';
        } catch (err) {
          if (!isInsufficientCredits(err)) throw err;
        }
      }
      await settleAs(via);
      return via != null;
    } catch (err) {
      await applicationRepository.update(applicationId, { screeningClaimAt: null }); // release for a later retry
      throw err;
    }
  },

  /**
   * Manual (re-)screen for one application:
   *  - AWAITING_CREDITS → paid like an automatic screening (quota first, then 1 credit);
   *  - FAILED after it was already paid for → free retry (our failure, not theirs);
   *  - otherwise (a genuine re-screen) → 1 APPLICANT_SCREENING credit, 402 when short.
   */
  async retry(workspaceId: string, applicationId: string, userId: string | null = null) {
    const app = await applicationRepository.findInWorkspace(workspaceId, applicationId);
    if (!app) throw notFound('Application not found');
    const candidate = await candidateRepository.findById(String(app.candidateId));
    if (!candidate?.resume) throw badRequest('This candidate has no resume to screen');

    const status = app.screeningResult?.status;
    const account = await accountRepository.ensureForWorkspace(workspaceId);
    if (!account) throw notFound('Billing account not found');

    let txId: string | null = null;
    if (status === 'AWAITING_CREDITS') {
      if (!(await this.authorizeScreening(workspaceId, applicationId, userId))) {
        const balance = await creditsService.getBalance(String(account._id));
        throw insufficientCredits('APPLICANT_SCREENING', 1, balance.total);
      }
    } else if (!(status === 'FAILED' && app.screeningBilledVia)) {
      const charge = await creditsService.charge(String(account._id), 'APPLICANT_SCREENING', 1, {
        actorUserId: userId,
        meta: { applicationId, rescreen: true },
      });
      txId = charge.txId;
    }

    const run = Date.now();
    try {
      await applicationRepository.update(applicationId, {
        'screeningResult.status': 'PENDING',
        screeningBilledVia: app.screeningBilledVia ?? 'CREDITS',
      });
      await jobQueue.enqueue(
        'PARSE_RESUME',
        { workspaceId, candidateId: String(app.candidateId), applicationId, run },
        { idempotencyKey: `parse:${applicationId}:${run}` },
      );
    } catch (err) {
      await creditsService.refund(txId);
      throw err;
    }
  },

  /** How many of a job's applicants are waiting on credits for AI screening. */
  async pendingCount(workspaceId: string, jobId: string): Promise<number> {
    return applicationRepository.countAwaitingScreening(workspaceId, jobId);
  },

  /**
   * Screen a job's AWAITING_CREDITS applicants now: each uses quota if the period
   * has any again, else 1 credit, until funds run out. Returns how many were
   * queued and how many are still waiting.
   */
  async screenPending(workspaceId: string, jobId: string, userId: string | null) {
    const waiting = await applicationRepository.listAwaitingScreening(workspaceId, jobId, 500);
    let queued = 0;
    for (const app of waiting) {
      const applicationId = String(app._id);
      if (!(await this.authorizeScreening(workspaceId, applicationId, userId))) break;
      const run = Date.now();
      await jobQueue.enqueue(
        'PARSE_RESUME',
        { workspaceId, candidateId: String(app.candidateId), applicationId, run },
        { idempotencyKey: `parse:${applicationId}:${run}` },
      );
      queued++;
    }
    if (queued === 0 && waiting.length > 0) {
      // Nothing could be paid for — surface the same 402 the rest of the app uses.
      const account = await accountRepository.ensureForWorkspace(workspaceId);
      const balance = account ? await creditsService.getBalance(String(account._id)) : null;
      throw insufficientCredits('APPLICANT_SCREENING', 1, balance?.total ?? 0);
    }
    return { queued, remaining: waiting.length - queued };
  },
};
