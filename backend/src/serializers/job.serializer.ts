import type { JobDto, JobFunnelCounts, PublicJobDto } from '@fluxberry/shared';
import { defaultPipelineStages } from '@fluxberry/shared';

function linkedInStatus(j: any): { status: 'NOT_POSTED' | 'POSTED' | 'CLOSED'; postedAt: string | null } {
  if (!j.linkedInPostedAt) return { status: 'NOT_POSTED', postedAt: null };
  const postedAt = new Date(j.linkedInPostedAt).toISOString();
  const closed = j.status === 'CLOSED' || j.status === 'ARCHIVED';
  return { status: closed ? 'CLOSED' : 'POSTED', postedAt };
}

/* Accepts a lean job document or hydrated doc. */
export function toJobDto(j: any, counts?: JobFunnelCounts): JobDto {
  return {
    id: String(j._id),
    workspaceId: String(j.workspaceId),
    title: j.title,
    slug: j.slug,
    description: j.description ?? '',
    status: j.status,
    employmentType: j.employmentType,
    workMode: j.workMode,
    location: j.location ?? null,
    openings: j.openings ?? 1,
    salary: j.salary ? { min: j.salary.min ?? undefined, max: j.salary.max ?? undefined, currency: j.salary.currency ?? 'INR' } : null,
    experience: j.experience ? { min: j.experience.min ?? undefined, max: j.experience.max ?? undefined } : null,
    skills: (j.skills ?? []).map((s: any) => ({ name: s.name, required: s.required, weight: s.weight })),
    structuredRequirements: j.structuredRequirements ?? null,
    stages: j.stages && j.stages.length ? j.stages : defaultPipelineStages(),
    restrictedTo: (j.restrictedTo ?? []).map((id: unknown) => String(id)),
    applicationFormId: j.applicationFormId ? String(j.applicationFormId) : null,
    workflowId: j.workflowId ? String(j.workflowId) : null,
    createdBy: j.createdBy ? String(j.createdBy) : null,
    publishedAt: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
    closedAt: j.closedAt ? new Date(j.closedAt).toISOString() : null,
    createdAt: new Date(j.createdAt).toISOString(),
    updatedAt: new Date(j.updatedAt).toISOString(),
    counts,
    linkedIn: linkedInStatus(j),
  };
}

export function toPublicJobDto(
  j: any,
  workspace: { name: string; slug: string; logoUrl?: string | null },
): PublicJobDto {
  return {
    title: j.title,
    slug: j.slug,
    description: j.description ?? '',
    employmentType: j.employmentType,
    workMode: j.workMode,
    location: j.location ?? null,
    salary: j.salary ? { min: j.salary.min ?? undefined, max: j.salary.max ?? undefined, currency: j.salary.currency ?? 'INR' } : null,
    experience: j.experience ? { min: j.experience.min ?? undefined, max: j.experience.max ?? undefined } : null,
    workspace: { name: workspace.name, slug: workspace.slug, logoUrl: workspace.logoUrl ?? null },
  };
}
