import type {
  PublicAssessmentDto,
  AutosaveAnswerInput,
  SubmitAssessmentInput,
  SubmitAssessmentResult,
  RunCodeInput,
  RunCodeResult,
  SavedAnswer,
} from '@fluxberry/shared';
import { candidateAssessmentRepository, assessmentRepository } from '../repositories/assessment.repository';
import { questionRepository } from '../repositories/question.repository';
import { toPublicQuestionDto } from '../serializers/assessment.serializer';
import { getCodeExecutionProvider } from '../integrations';
import { eventBus } from '../events/event-bus';
import { jobQueue } from '../queue/job-queue';
import { workflowEngine } from './workflow-engine.service';
import { badRequest, notFound } from '../utils/errors';
import { trackEvent } from '../integrations/posthog';
import { notificationService } from './notification.service';

function isExpired(ca: any): boolean {
  return Boolean(ca.expiresAt && new Date(ca.expiresAt).getTime() < Date.now());
}

function remainingSeconds(ca: any, durationMinutes: number): number | null {
  if (!ca.startedAt) return durationMinutes * 60;
  const elapsed = (Date.now() - new Date(ca.startedAt).getTime()) / 1000;
  return Math.max(0, Math.round(durationMinutes * 60 - elapsed));
}

async function loadOrderedQuestions(workspaceId: string, assessment: any) {
  const ids = assessment.questions.map((q: any) => String(q.questionId));
  const docs = await questionRepository.findByIds(workspaceId, ids);
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return assessment.questions
    .slice()
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((ref: any) => byId.get(String(ref.questionId)))
    .filter(Boolean);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const candidateAssessmentService = {
  async getByToken(token: string): Promise<PublicAssessmentDto> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    const assessment = await assessmentRepository.findInWorkspace(String(ca.workspaceId), String(ca.assessmentId));
    if (!assessment) throw notFound('Assessment not found');

    if (ca.status !== 'COMPLETED' && ca.status !== 'GRADING' && isExpired(ca) && ca.status !== 'EXPIRED') {
      await candidateAssessmentRepository.update(String(ca._id), { status: 'EXPIRED' });
      ca.status = 'EXPIRED';
    }

    const questions = await loadOrderedQuestions(String(ca.workspaceId), assessment);
    const savedAnswers: SavedAnswer[] = (ca.answers ?? []).map((a: any) => ({
      questionId: a.questionId,
      answer: a.answer ?? null,
      code: a.code ?? null,
      languageId: a.languageId ?? null,
    }));
    return {
      token,
      name: assessment.name,
      type: assessment.type,
      description: assessment.description ?? null,
      durationMinutes: assessment.durationMinutes,
      status: ca.status,
      startedAt: ca.startedAt ? new Date(ca.startedAt).toISOString() : null,
      expiresAt: ca.expiresAt ? new Date(ca.expiresAt).toISOString() : null,
      remainingSeconds: ca.status === 'STARTED' ? remainingSeconds(ca, assessment.durationMinutes) : null,
      questions: questions.map(toPublicQuestionDto),
      savedAnswers,
      score: ca.score ?? null,
      maxScore: ca.maxScore ?? null,
    };
  },

  async start(token: string): Promise<PublicAssessmentDto> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED' || ca.status === 'GRADING') throw badRequest('This assessment is already submitted');
    if (isExpired(ca)) throw badRequest('This assessment link has expired');
    if (ca.status === 'INVITED') {
      await candidateAssessmentRepository.update(String(ca._id), { status: 'STARTED', startedAt: new Date() });
    }
    return this.getByToken(token);
  },

  async autosave(token: string, input: AutosaveAnswerInput): Promise<{ saved: true }> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED' || ca.status === 'GRADING') throw badRequest('This assessment is already submitted');
    const answers = mergeAnswers(ca.answers ?? [], [input]);
    await candidateAssessmentRepository.update(String(ca._id), { answers });
    return { saved: true };
  },

  /**
   * Server-authoritative submit (spec §41). MCQ grades synchronously; CODING is
   * stored, marked GRADING, and handed to the Judge0 grading worker.
   */
  async submit(token: string, input: SubmitAssessmentInput): Promise<SubmitAssessmentResult> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED') return { status: 'COMPLETED', score: ca.score ?? 0, maxScore: ca.maxScore ?? 100 };
    if (ca.status === 'GRADING') return { status: 'GRADING', score: null, maxScore: ca.maxScore ?? 100 };

    const assessment = await assessmentRepository.findInWorkspace(String(ca.workspaceId), String(ca.assessmentId));
    if (!assessment) throw notFound('Assessment not found');

    const answers = mergeAnswers(ca.answers ?? [], input.answers);

    if (assessment.type === 'CODING') {
      const questionIds = assessment.questions.map((q: any) => String(q.questionId));
      const docs = await questionRepository.findByIds(String(ca.workspaceId), questionIds);
      const specById = new Map(docs.map((d) => [String((d as any)._id), (d as any).coding]));
      for (const a of answers) {
        if (a.code == null) continue;
        if (a.languageId == null) {
          throw badRequest('A language must be selected for one or more questions');
        }
        const spec = specById.get(a.questionId);
        if (spec?.languageIds?.length && !spec.languageIds.includes(a.languageId)) {
          throw badRequest('Unsupported language for one or more questions');
        }
      }

      // Async path: persist code + hand to Judge0 grader.
      await candidateAssessmentRepository.update(String(ca._id), { status: 'GRADING', answers });
      await eventBus.publish({
        workspaceId: ca.workspaceId,
        type: 'assessment.completed', // logical "submitted"; final score via grader
        entityType: 'candidate_assessment',
        entityId: ca._id,
        applicationId: ca.applicationId,
        candidateId: ca.candidateId,
        actorLabel: 'candidate',
        payload: { kind: 'coding', submitted: true },
      });
      await jobQueue.enqueue(
        'PROCESS_ASSESSMENT',
        { candidateAssessmentId: String(ca._id) },
        { idempotencyKey: `grade:${ca._id}` },
      );
      return { status: 'GRADING', score: null, maxScore: 100 };
    }

    // MCQ path: synchronous scoring (unchanged behaviour).
    const questionIds = assessment.questions.map((q: any) => String(q.questionId));
    const docs = await questionRepository.findByIds(String(ca.workspaceId), questionIds);
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const answerById = new Map(answers.map((a: any) => [a.questionId, a.answer]));

    let earned = 0;
    let total = 0;
    for (const ref of assessment.questions) {
      const q = byId.get(String(ref.questionId));
      if (!q) continue;
      const points = ref.points ?? 1;
      total += points;
      if (isCorrect(answerById.get(String(ref.questionId)), (q as any).correctAnswer)) earned += points;
    }
    const score = total > 0 ? Math.round((earned / total) * 100) : 0;

    await candidateAssessmentRepository.update(String(ca._id), {
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
      payload: { score, assessmentName: assessment.name },
    });

    trackEvent(String(ca.candidateId), 'assessment.completed', { workspaceId: String(ca.workspaceId), score });
    void notificationService.broadcast(String(ca.workspaceId), {
      type: 'assessment_completed',
      title: `Assessment completed by candidate`,
      body: `Score: ${score}/${100}`,
      entityType: 'candidate_assessment',
      entityId: String(ca._id),
    }).catch(() => {});
    await workflowEngine.resumeForApplication(String(ca.applicationId));
    return { status: 'COMPLETED', score, maxScore: 100 };
  },

  /**
   * Run one coding question against its VISIBLE sample cases (no score written).
   * Bounded synchronous poll — the candidate clicked "Run" and is waiting.
   */
  async run(token: string, input: RunCodeInput): Promise<RunCodeResult> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status !== 'STARTED') throw badRequest('Start the assessment before running code');
    if (isExpired(ca)) throw badRequest('This assessment link has expired');

    const assessment = await assessmentRepository.findInWorkspace(String(ca.workspaceId), String(ca.assessmentId));
    if (!assessment) throw notFound('Assessment not found');
    const inAssessment = (assessment.questions as any[]).some((q) => String(q.questionId) === input.questionId);
    if (!inAssessment) throw badRequest('Unknown question');

    const [q] = await questionRepository.findByIds(String(ca.workspaceId), [input.questionId]);
    const spec = (q as any)?.coding;
    if (!q || (q as any).type !== 'CODING' || !spec) throw badRequest('Not a coding question');
    if (spec.languageIds?.length && !spec.languageIds.includes(input.languageId)) {
      throw badRequest('Unsupported language for this question');
    }

    // Only VISIBLE (non-hidden) cases are ever run for the candidate.
    const visible = (spec.testCases as any[]).filter((t) => !t.hidden);
    const cases = visible.length ? visible : [{ input: '', expected: '' }];

    const provider = getCodeExecutionProvider();
    const { tokens } = await provider.submitBatch({
      source: input.code,
      languageId: input.languageId,
      testCases: cases.map((t) => ({ input: t.input ?? '', expected: t.expected ?? '' })),
      cpuTimeLimit: spec.cpuTimeLimit ?? undefined,
      memoryLimit: spec.memoryLimit ?? undefined,
    });

    let results = await provider.getBatch(tokens);
    for (let i = 0; i < 15 && results.some((r) => !r.done); i++) {
      await sleep(700);
      results = await provider.getBatch(tokens);
    }

    const caseResults = results.map((r) => ({
      status: r.status,
      passed: r.status === 'ACCEPTED',
      stdout: r.stdout ?? null,
      stderr: r.stderr ?? null,
      timeMs: r.timeMs ?? null,
      memoryKb: r.memoryKb ?? null,
    }));
    const compileOutput = results.find((r) => r.compileOutput)?.compileOutput ?? null;
    const passed = caseResults.filter((c) => c.passed).length;
    const status = results.some((r) => !r.done)
      ? 'PENDING'
      : caseResults.every((c) => c.passed)
        ? 'ACCEPTED'
        : results.some((r) => r.status === 'ERROR')
          ? 'ERROR'
          : results.some((r) => r.status === 'TIMEOUT')
            ? 'TIMEOUT'
            : 'WRONG_ANSWER';

    return { status, compileOutput, passed, total: caseResults.length, cases: caseResults };
  },
};

/** Merge incoming answers into the stored list, deduped by questionId. */
function mergeAnswers(
  existing: any[],
  incoming: Array<{ questionId: string; answer?: unknown; code?: string; languageId?: number }>,
): any[] {
  const byId = new Map<string, any>();
  for (const a of existing) {
    byId.set(a.questionId, {
      questionId: a.questionId,
      answer: a.answer ?? null,
      code: a.code ?? null,
      languageId: a.languageId ?? null,
      judge0Tokens: a.judge0Tokens ?? [],
      execution: a.execution ?? null,
    });
  }
  for (const a of incoming) {
    const prev = byId.get(a.questionId) ?? {
      questionId: a.questionId,
      answer: null,
      code: null,
      languageId: null,
      judge0Tokens: [],
      execution: null,
    };
    if (a.answer !== undefined) prev.answer = a.answer;
    if (a.code !== undefined) prev.code = a.code;
    if (a.languageId !== undefined) prev.languageId = a.languageId;
    byId.set(a.questionId, prev);
  }
  return [...byId.values()];
}

function isCorrect(given: unknown, correct: unknown): boolean {
  if (given == null || correct == null) return false;
  const g = Array.isArray(given) ? [...given].sort() : [String(given)];
  const c = Array.isArray(correct) ? [...(correct as string[])].sort() : [String(correct)];
  return g.length === c.length && g.every((v, i) => v === c[i]);
}
