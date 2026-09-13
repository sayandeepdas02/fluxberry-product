import type { ApplicationDto, ScreeningResultDto, LabelDto } from '@fluxberry/shared';

/** `labelIds` may or may not be `.populate()`d — only map entries that actually came back as label docs. */
function toLabels(labelIds: any): LabelDto[] {
  if (!Array.isArray(labelIds)) return [];
  return labelIds
    .filter((l: any) => l && typeof l === 'object' && 'name' in l)
    .map((l: any) => ({
      id: String(l._id),
      workspaceId: String(l.workspaceId ?? ''),
      name: l.name,
      color: l.color,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    }));
}

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
    referralCode: a.referralCode ?? null,
    score: a.score ?? null,
    screeningResult: toScreeningResultDto(a.screeningResult),
    labels: toLabels(a.labelIds),
    appliedAt: new Date(a.appliedAt).toISOString(),
    createdAt: new Date(a.createdAt).toISOString(),
    updatedAt: new Date(a.updatedAt).toISOString(),
  };
}
