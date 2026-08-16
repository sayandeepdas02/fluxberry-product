import type { PublicAssessmentDto, AutosaveAnswerInput, SubmitAssessmentInput } from '@fluxberry/shared';
import { candidateAssessmentRepository, assessmentRepository } from '../repositories/assessment.repository';
import { questionRepository } from '../repositories/question.repository';
import { toPublicQuestionDto } from '../serializers/assessment.serializer';
import { eventBus } from '../events/event-bus';
import { workflowEngine } from './workflow-engine.service';
import { badRequest, notFound } from '../utils/errors';

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

export const candidateAssessmentService = {
  async getByToken(token: string): Promise<PublicAssessmentDto> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    const assessment = await assessmentRepository.findInWorkspace(String(ca.workspaceId), String(ca.assessmentId));
    if (!assessment) throw notFound('Assessment not found');

    if (ca.status !== 'COMPLETED' && isExpired(ca) && ca.status !== 'EXPIRED') {
      await candidateAssessmentRepository.update(String(ca._id), { status: 'EXPIRED' });
      ca.status = 'EXPIRED';
    }

    const questions = await loadOrderedQuestions(String(ca.workspaceId), assessment);
    return {
      token,
      name: assessment.name,
      description: assessment.description ?? null,
      durationMinutes: assessment.durationMinutes,
      status: ca.status,
      startedAt: ca.startedAt ? new Date(ca.startedAt).toISOString() : null,
      expiresAt: ca.expiresAt ? new Date(ca.expiresAt).toISOString() : null,
      remainingSeconds: ca.status === 'STARTED' ? remainingSeconds(ca, assessment.durationMinutes) : null,
      questions: questions.map(toPublicQuestionDto),
      savedAnswers: (ca.answers ?? []).map((a: any) => ({ questionId: a.questionId, answer: a.answer })),
    };
  },

  async start(token: string): Promise<PublicAssessmentDto> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED') throw badRequest('This assessment is already completed');
    if (isExpired(ca)) throw badRequest('This assessment link has expired');
    if (ca.status === 'INVITED') {
      await candidateAssessmentRepository.update(String(ca._id), { status: 'STARTED', startedAt: new Date() });
    }
    return this.getByToken(token);
  },

  async autosave(token: string, input: AutosaveAnswerInput): Promise<{ saved: true }> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED') throw badRequest('This assessment is already completed');
    const answers: Array<{ questionId: string; answer: unknown }> = (ca.answers ?? [])
      .filter((a: any) => a.questionId !== input.questionId)
      .map((a: any) => ({ questionId: a.questionId, answer: a.answer }));
    answers.push({ questionId: input.questionId, answer: input.answer });
    await candidateAssessmentRepository.update(String(ca._id), { answers });
    return { saved: true };
  },

  /** Server-authoritative scoring (spec §41 — never trust client). */
  async submit(token: string, input: SubmitAssessmentInput): Promise<{ score: number; maxScore: number }> {
    const ca = await candidateAssessmentRepository.findByToken(token);
    if (!ca) throw notFound('Assessment not found');
    if (ca.status === 'COMPLETED') return { score: ca.score ?? 0, maxScore: ca.maxScore ?? 100 };

    const assessment = await assessmentRepository.findInWorkspace(String(ca.workspaceId), String(ca.assessmentId));
    if (!assessment) throw notFound('Assessment not found');

    // Merge final submitted answers with any autosaved ones.
    const merged = new Map<string, string | string[]>();
    for (const a of ca.answers ?? []) merged.set(a.questionId, a.answer);
    for (const a of input.answers) merged.set(a.questionId, a.answer);

    const questionIds = assessment.questions.map((q: any) => String(q.questionId));
    const docs = await questionRepository.findByIds(String(ca.workspaceId), questionIds);
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    let earned = 0;
    let total = 0;
    for (const ref of assessment.questions) {
      const q = byId.get(String(ref.questionId));
      if (!q) continue;
      const points = ref.points ?? 1;
      total += points;
      const given = merged.get(String(ref.questionId));
      if (isCorrect(given, q.correctAnswer)) earned += points;
    }
    const score = total > 0 ? Math.round((earned / total) * 100) : 0;

    await candidateAssessmentRepository.update(String(ca._id), {
      status: 'COMPLETED',
      score,
      maxScore: 100,
      completedAt: new Date(),
      answers: Array.from(merged.entries()).map(([questionId, answer]) => ({ questionId, answer })),
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

    // Resume any workflow waiting on this assessment.
    await workflowEngine.resumeForApplication(String(ca.applicationId));

    return { score, maxScore: 100 };
  },
};

function isCorrect(given: unknown, correct: unknown): boolean {
  if (given == null || correct == null) return false;
  const g = Array.isArray(given) ? [...given].sort() : [String(given)];
  const c = Array.isArray(correct) ? [...(correct as string[])].sort() : [String(correct)];
  return g.length === c.length && g.every((v, i) => v === c[i]);
}
