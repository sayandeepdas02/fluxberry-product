import type { CareersPageDto, PublicCareersJob } from '@fluxberry/shared';

export function toCareersPageDto(doc: any, careersSlug: string | null): CareersPageDto {
  return {
    slug: careersSlug,
    published: doc.published ?? false,
    headline: doc.headline ?? '',
    tagline: doc.tagline ?? '',
    about: { enabled: doc.about?.enabled ?? true, content: doc.about?.content ?? '' },
    links: { enabled: doc.links?.enabled ?? false, items: (doc.links?.items ?? []).map((l: any) => ({ label: l.label, url: l.url })) },
    team: { enabled: doc.team?.enabled ?? false, members: (doc.team?.members ?? []).map((m: any) => ({ name: m.name, role: m.role ?? '', avatarUrl: m.avatarUrl ?? '' })) },
    jobs: { enabled: doc.jobs?.enabled ?? true, heading: doc.jobs?.heading ?? 'Open roles' },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function toPublicJob(job: any, workspaceSlug: string): PublicCareersJob {
  return {
    title: job.title,
    location: job.location ?? null,
    employmentType: job.employmentType,
    workMode: job.workMode,
    salary: job.salary ? { min: job.salary.min ?? undefined, max: job.salary.max ?? undefined, currency: job.salary.currency ?? 'INR' } : null,
    applyPath: `/apply/${workspaceSlug}/${job.slug}`,
  };
}
