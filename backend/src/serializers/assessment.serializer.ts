import type {
  QuestionDto,
  PublicQuestionDto,
  AssessmentDto,
  AssessmentType,
  CandidateAssessmentDto,
  CodingSpec,
  CodingQuestionResult,
} from '../shared';

function toCodingSpec(c: any): CodingSpec | null {
  if (!c) return null;
  return {
    languageIds: c.languageIds ?? [],
    starterCode: (c.starterCode ?? []).map((s: any) => ({ languageId: s.languageId, code: s.code ?? '' })),
    testCases: (c.testCases ?? []).map((t: any) => ({
      input: t.input ?? '',
      expected: t.expected ?? '',
      hidden: Boolean(t.hidden),
      points: t.points ?? 1,
    })),
    cpuTimeLimit: c.cpuTimeLimit ?? undefined,
    memoryLimit: c.memoryLimit ?? undefined,
  };
}

export function toQuestionDto(q: any): QuestionDto {
  return {
    id: String(q._id),
    workspaceId: String(q.workspaceId),
    type: q.type,
    questionText: q.questionText,
    options: (q.options ?? []).map((o: any) => ({ id: o.id, text: o.text })),
    correctAnswer: q.correctAnswer ?? null,
    isMultiSelect: Boolean(q.isMultiSelect),
    coding: toCodingSpec(q.coding),
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
  // CODING: expose languages, starter code, and ONLY non-hidden sample cases.
  const coding =
    q.type === 'CODING' && q.coding
      ? {
          languageIds: q.coding.languageIds ?? [],
          starterCode: (q.coding.starterCode ?? []).map((s: any) => ({
            languageId: s.languageId,
            code: s.code ?? '',
          })),
          sampleTestCases: (q.coding.testCases ?? [])
            .filter((t: any) => !t.hidden)
            .map((t: any) => ({ input: t.input ?? '', expected: t.expected ?? '' })),
          cpuTimeLimit: q.coding.cpuTimeLimit ?? null,
          memoryLimit: q.coding.memoryLimit ?? null,
        }
      : null;
  return {
    id: String(q._id),
    type: q.type,
    questionText: q.questionText,
    options: (q.options ?? []).map((o: any) => ({ id: o.id, text: o.text })),
    isMultiSelect: Boolean((q as any).isMultiSelect),
    coding,
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

export function toCandidateAssessmentDto(
  ca: any,
  assessment: { name: string; type: AssessmentType },
): CandidateAssessmentDto {
  const codingResults: CodingQuestionResult[] = (ca.answers ?? [])
    .filter((a: any) => a.execution)
    .map((a: any) => ({
      questionId: a.questionId,
      languageId: a.languageId ?? null,
      status: a.execution.status,
      passed: a.execution.passed ?? 0,
      total: a.execution.total ?? 0,
      timeMs: a.execution.timeMs ?? null,
      memoryKb: a.execution.memoryKb ?? null,
      stderr: a.execution.stderr ?? null,
      compileOutput: a.execution.compileOutput ?? null,
    }));
  return {
    id: String(ca._id),
    applicationId: String(ca.applicationId),
    candidateId: String(ca.candidateId),
    assessmentId: String(ca.assessmentId),
    assessmentName: assessment.name,
    type: assessment.type,
    status: ca.status,
    score: ca.score ?? null,
    maxScore: ca.maxScore ?? null,
    invitedAt: ca.invitedAt ? new Date(ca.invitedAt).toISOString() : null,
    startedAt: ca.startedAt ? new Date(ca.startedAt).toISOString() : null,
    completedAt: ca.completedAt ? new Date(ca.completedAt).toISOString() : null,
    expiresAt: ca.expiresAt ? new Date(ca.expiresAt).toISOString() : null,
    codingResults: codingResults.length ? codingResults : null,
  };
}
