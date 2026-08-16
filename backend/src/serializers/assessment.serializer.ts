import type {
  QuestionDto,
  PublicQuestionDto,
  AssessmentDto,
  CandidateAssessmentDto,
} from '@fluxberry/shared';

export function toQuestionDto(q: any): QuestionDto {
  return {
    id: String(q._id),
    workspaceId: String(q.workspaceId),
    type: q.type,
    questionText: q.questionText,
    options: (q.options ?? []).map((o: any) => ({ id: o.id, text: o.text })),
    correctAnswer: q.correctAnswer ?? null,
    difficulty: q.difficulty,
    category: q.category,
    skills: q.skills ?? [],
    tags: q.tags ?? [],
    explanation: q.explanation ?? null,
    createdAt: new Date(q.createdAt).toISOString(),
    updatedAt: new Date(q.updatedAt).toISOString(),
  };
}

export function toPublicQuestionDto(q: any): PublicQuestionDto {
  return {
    id: String(q._id),
    type: q.type,
    questionText: q.questionText,
    options: (q.options ?? []).map((o: any) => ({ id: o.id, text: o.text })),
  };
}

export function toAssessmentDto(a: any, candidateCount?: number): AssessmentDto {
  return {
    id: String(a._id),
    workspaceId: String(a.workspaceId),
    name: a.name,
    type: a.type,
    description: a.description ?? null,
    durationMinutes: a.durationMinutes,
    questions: (a.questions ?? []).map((q: any) => ({
      questionId: String(q.questionId),
      points: q.points ?? 1,
      sortOrder: q.sortOrder ?? 0,
    })),
    questionCount: (a.questions ?? []).length,
    status: a.status,
    createdBy: a.createdBy ? String(a.createdBy) : null,
    createdAt: new Date(a.createdAt).toISOString(),
    updatedAt: new Date(a.updatedAt).toISOString(),
    candidateCount,
  };
}

export function toCandidateAssessmentDto(ca: any, assessmentName: string): CandidateAssessmentDto {
  return {
    id: String(ca._id),
    applicationId: String(ca.applicationId),
    candidateId: String(ca.candidateId),
    assessmentId: String(ca.assessmentId),
    assessmentName,
    status: ca.status,
    score: ca.score ?? null,
    maxScore: ca.maxScore ?? null,
    invitedAt: ca.invitedAt ? new Date(ca.invitedAt).toISOString() : null,
    startedAt: ca.startedAt ? new Date(ca.startedAt).toISOString() : null,
    completedAt: ca.completedAt ? new Date(ca.completedAt).toISOString() : null,
    expiresAt: ca.expiresAt ? new Date(ca.expiresAt).toISOString() : null,
  };
}
