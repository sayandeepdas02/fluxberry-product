import { CandidateAssessmentModel } from '../models/candidate-assessment.model';
import { assessmentRepository } from '../repositories/assessment.repository';
import { questionRepository } from '../repositories/question.repository';
import { getCodeExecutionProvider } from '../integrations';
import type { CaseExecutionResult, ExecutionStatus } from '../integrations/coding/types';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { workflowEngine } from './workflow-engine.service';
import { logger } from '../utils/logger';

/** How long to wait before the next Judge0 poll when results aren't ready. */
const POLL_DELAY_MS = 2000;

/** Roll per-case results into a single question-level status. */
function overallStatus(cases: CaseExecutionResult[]): ExecutionStatus {
  if (cases.every((c) => c.status === 'ACCEPTED')) return 'ACCEPTED';
  if (cases.some((c) => c.status === 'ERROR')) return 'ERROR';
  if (cases.some((c) => c.status === 'TIMEOUT')) return 'TIMEOUT';
  return 'WRONG_ANSWER';
}

export const codingGradingService = {
  /**
   * PROCESS_ASSESSMENT handler body for CODING assessments. Idempotent and
   * resumable: submits each question's code to Judge0 on first pass, then
   * self-re-enqueues to poll until every test case resolves, then finalizes the
   * score exactly like screening (persist → event → resume workflow).
   */
  async grade(payload: { candidateAssessmentId: string }): Promise<void> {
    const ca = await CandidateAssessmentModel.findById(payload.candidateAssessmentId);
    if (!ca) return;
    if (ca.status !== 'GRADING') return; // already finalized or not a coding submit

    const assessment = await assessmentRepository.findInWorkspace(
      String(ca.workspaceId),
      String(ca.assessmentId),
    );
    if (!assessment) return;

    // Weight (assessment ref points) + coding spec per question.
    const refs = new Map<string, number>();
    for (const q of assessment.questions as any[]) refs.set(String(q.questionId), q.points ?? 1);
    const questionIds = [...refs.keys()];
    const questions = await questionRepository.findByIds(String(ca.workspaceId), questionIds);
    const codingById = new Map<string, any>();
    for (const q of questions) if ((q as any).type === 'CODING') codingById.set(String((q as any)._id), q);

    const provider = getCodeExecutionProvider();
    const answers: any[] = (ca.answers ?? []).map((a: any) =>
      typeof a.toObject === 'function' ? a.toObject() : a,
    );
    let anyPending = false;

    for (const [questionId, q] of codingById) {
      const spec = (q as any).coding;
      if (!spec || !spec.testCases?.length) continue;
      let ans = answers.find((a) => a.questionId === questionId);
      if (!ans || !ans.code) {
        // Candidate never submitted this question — record a zero result.
        if (!ans) {
          ans = { questionId, answer: null, code: null, languageId: null, judge0Tokens: [] };
          answers.push(ans);
        }
        ans.execution = {
          status: 'ERROR',
          stderr: 'No submission',
          passed: 0,
          total: spec.testCases.length,
          perTestCase: [],
        };
        continue;
      }

      // First pass for this question: submit all test cases to Judge0.
      if (!ans.judge0Tokens || ans.judge0Tokens.length === 0) {
        const { tokens } = await provider.submitBatch({
          source: ans.code,
          languageId: ans.languageId,
          testCases: spec.testCases.map((t: any) => ({ input: t.input ?? '', expected: t.expected ?? '' })),
          cpuTimeLimit: spec.cpuTimeLimit ?? undefined,
          memoryLimit: spec.memoryLimit ?? undefined,
        });
        ans.judge0Tokens = tokens;
        ans.execution = { status: 'PENDING', passed: 0, total: spec.testCases.length, perTestCase: [] };
        anyPending = true;
        continue;
      }

      // Subsequent passes: poll results.
      const results = await provider.getBatch(ans.judge0Tokens);
      if (results.some((r) => !r.done)) {
        anyPending = true;
        continue;
      }
      const perTestCase = results.map((r, i) => ({
        status: r.status,
        passed: r.status === 'ACCEPTED',
        timeMs: r.timeMs ?? null,
        memoryKb: r.memoryKb ?? null,
        hidden: Boolean(spec.testCases[i]?.hidden),
      }));
      const firstBad = results.find((r) => r.status !== 'ACCEPTED');
      ans.execution = {
        status: overallStatus(results),
        stdout: null,
        stderr: firstBad?.stderr ?? null,
        compileOutput: firstBad?.compileOutput ?? null,
        timeMs: Math.max(0, ...results.map((r) => r.timeMs ?? 0)),
        memoryKb: Math.max(0, ...results.map((r) => r.memoryKb ?? 0)),
        passed: perTestCase.filter((c) => c.passed).length,
        total: perTestCase.length,
        perTestCase,
      };
    }

    if (anyPending) {
      // Persist tokens/partial state, then poll again shortly (no idempotency
      // key so each poll is a fresh job).
      await CandidateAssessmentModel.findByIdAndUpdate(ca._id, { answers });
      await jobQueue.enqueue(
        'PROCESS_ASSESSMENT',
        { candidateAssessmentId: String(ca._id) },
        { runAt: new Date(Date.now() + POLL_DELAY_MS) },
      );
      return;
    }

    // All questions resolved — compute the weighted score (0-100).
    let earned = 0;
    let totalWeight = 0;
    for (const [questionId, q] of codingById) {
      const weight = refs.get(questionId) ?? 1;
      totalWeight += weight;
      const spec = (q as any).coding;
      const ans = answers.find((a) => a.questionId === questionId);
      const tcPointsTotal = (spec.testCases as any[]).reduce((s, t) => s + (t.points ?? 1), 0) || 1;
      const perCase = ans?.execution?.perTestCase ?? [];
      const tcPointsEarned = (spec.testCases as any[]).reduce(
        (s, t, i) => s + (perCase[i]?.passed ? (t.points ?? 1) : 0),
        0,
      );
      earned += weight * (tcPointsEarned / tcPointsTotal);
    }
    const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

    await CandidateAssessmentModel.findByIdAndUpdate(ca._id, {
      status: 'COMPLETED',
      score,
      maxScore: 100,
      completedAt: new Date(),
      answers,
    });

    await eventBus.publish({
      workspaceId: ca.workspaceId,
      type: 'assessment.completed',
      entityType: 'candidate_assessment',
      entityId: ca._id,
      applicationId: ca.applicationId,
      candidateId: ca.candidateId,
      actorLabel: 'candidate',
      payload: { score, assessmentName: assessment.name, kind: 'coding' },
    });

    await workflowEngine.resumeForApplication(String(ca.applicationId));
    logger.info({ candidateAssessmentId: String(ca._id), score }, 'coding assessment graded');
  },
};
