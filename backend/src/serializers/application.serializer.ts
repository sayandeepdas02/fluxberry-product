import type { ApplicationDto, ScreeningResultDto } from '@fluxberry/shared';

export function toScreeningResultDto(s: any): ScreeningResultDto | null {
  if (!s) return null;
  return {
    status: s.status ?? 'PENDING',
    score: s.score ?? null,
    breakdown: s.breakdown ?? null,
    summary: s.summary ?? null,
    strengths: s.strengths ?? [],
    concerns: s.concerns ?? [],
    provider: s.provider ?? null,
    model: s.model ?? null,
    promptVersion: s.promptVersion ?? null,
    version: s.version ?? 0,
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
  };
}

export function toApplicationDto(a: any): ApplicationDto {
  return {
    id: String(a._id),
    workspaceId: String(a.workspaceId),
    jobId: String(a.jobId),
    candidateId: String(a.candidateId),
    status: a.status,
    stage: a.stage,
    source: a.source,
    score: a.score ?? null,
    screeningResult: toScreeningResultDto(a.screeningResult),
    appliedAt: new Date(a.appliedAt).toISOString(),
    createdAt: new Date(a.createdAt).toISOString(),
    updatedAt: new Date(a.updatedAt).toISOString(),
  };
}
