import type { ApplicationFormDto, FormQuestion } from '../shared';

export function toFormDto(f: any): ApplicationFormDto {
  return {
    id: String(f._id),
    jobId: String(f.jobId),
    questions: (f.questions ?? []).map(toQuestion).sort((a: FormQuestion, b: FormQuestion) => a.sortOrder - b.sortOrder),
    createdAt: new Date(f.createdAt).toISOString(),
    updatedAt: new Date(f.updatedAt).toISOString(),
  };
}

function toQuestion(q: any): FormQuestion {
  return {
    id: q.id,
    key: q.key ?? undefined,
    type: q.type,
    label: q.label,
    description: q.description ?? undefined,
    required: q.required,
    enabled: q.enabled,
    options: (q.options ?? []).map((o: any) => ({ id: o.id, label: o.label })),
    sortOrder: q.sortOrder ?? 0,
    system: q.system ?? false,
    variant: q.variant ?? undefined,
    linkPlatform: q.linkPlatform ?? undefined,
  };
}
