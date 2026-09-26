import { hasEnrichmentGap } from '../integrations/monid/types';
import type {
  SourcedContactDto,
  SourcingSearchDto,
  SourcingListDto,
  SourcingCampaignDto,
  SourcingCampaignStatsDto,
  SourcingCampaignRecipientDto,
} from '../shared';

/**
 * Serialize a sourced contact. `reveal` gates the actual email/phone: list rows
 * expose only the `hasEmail` contactability signal (spec §130), while the
 * profile detail and CSV export reveal the address itself.
 */
export function toSourcedContactDto(c: any, opts: { reveal: boolean }): SourcedContactDto {
  const hasEmail = Boolean(c.workEmail || c.personalEmail);
  return {
    id: String(c._id),
    workspaceId: String(c.workspaceId),
    fullName: c.fullName,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    title: c.title ?? null,
    seniority: c.seniority ?? null,
    company: c.company ?? null,
    companySize: c.companySize ?? null,
    industry: c.industry ?? null,
    location: c.location ?? null,
    country: c.country ?? null,
    yearsExperience: c.yearsExperience ?? null,
    skills: c.skills ?? [],
    linkedinUrl: c.linkedinUrl ?? null,
    githubUrl: c.githubUrl ?? null,
    workEmail: opts.reveal ? (c.workEmail ?? null) : null,
    personalEmail: opts.reveal ? (c.personalEmail ?? null) : null,
    hasEmail,
    phone: opts.reveal ? (c.phone ?? null) : null,
    enrichmentAttempted: Boolean(c.backfillAttemptedAt),
    hasEnrichmentGap: hasEnrichmentGap(c),
    compensationUnlocked: Boolean(c.compensationUnlockedAt),
    experience: (c.experience ?? []).map((e: any) => ({
      title: e.title ?? undefined,
      company: e.company ?? undefined,
      start: e.start ?? undefined,
      end: e.end ?? undefined,
    })),
    education: (c.education ?? []).map((e: any) => ({
      degree: e.degree ?? undefined,
      school: e.school ?? undefined,
      major: e.major ?? undefined,
    })),
    matchScore: c.matchScore ?? 0,
    matchReasons: c.matchReasons ?? [],
    source: c.provider ?? 'MOCK',
    provider: c.provider ?? 'MOCK',
    pdlId: c.pdlId ?? null,
    addedToJob: c.addedToJob
      ? {
          applicationId: String(c.addedToJob.applicationId),
          jobId: String(c.addedToJob.jobId),
          jobTitle: c.addedToJob.jobTitle ?? undefined,
        }
      : null,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}

export function toSourcingSearchDto(s: any): SourcingSearchDto {
  const fetched = s.fetched ?? (s.contactIds?.length ?? 0);
  return {
    id: String(s._id),
    workspaceId: String(s.workspaceId),
    prompt: s.prompt,
    criteria: s.criteria,
    status: s.status,
    total: s.total ?? 0,
    fetched,
    creditsUsed: s.creditsUsed ?? 0,
    canLoadMore: Boolean(s.scrollToken) && fetched < (s.total ?? 0),
    createdBy: s.createdBy ? String(s.createdBy) : null,
    createdAt: new Date(s.createdAt).toISOString(),
    lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toISOString() : null,
  };
}

export function toSourcingListDto(l: any): SourcingListDto {
  return {
    id: String(l._id),
    workspaceId: String(l.workspaceId),
    name: l.name,
    description: l.description ?? null,
    contactCount: l.contactCount ?? 0,
    createdBy: l.createdBy ? String(l.createdBy) : null,
    createdAt: new Date(l.createdAt).toISOString(),
    updatedAt: new Date(l.updatedAt).toISOString(),
  };
}

export function toCampaignStatsDto(s: any): SourcingCampaignStatsDto {
  return {
    recipients: s?.recipients ?? 0,
    sent: s?.sent ?? 0,
    delivered: s?.delivered ?? 0,
    opened: s?.opened ?? 0,
    replied: s?.replied ?? 0,
    bounced: s?.bounced ?? 0,
    unsubscribed: s?.unsubscribed ?? 0,
    failed: s?.failed ?? 0,
  };
}

export function toSourcingCampaignDto(c: any, listName?: string | null): SourcingCampaignDto {
  return {
    id: String(c._id),
    workspaceId: String(c.workspaceId),
    name: c.name,
    listId: String(c.listId),
    listName: listName ?? null,
    subject: c.subject,
    body: c.body,
    fromName: c.fromName ?? null,
    replyToEmail: c.replyToEmail ?? null,
    status: c.status,
    scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : null,
    sentAt: c.sentAt ? new Date(c.sentAt).toISOString() : null,
    stats: toCampaignStatsDto(c.stats),
    createdBy: c.createdBy ? String(c.createdBy) : null,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}

export function toSourcingCampaignRecipientDto(r: any): SourcingCampaignRecipientDto {
  return {
    id: String(r._id),
    contactId: String(r.contactId),
    fullName: r.fullName,
    email: r.email,
    company: r.company ?? null,
    title: r.title ?? null,
    status: r.status,
    sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
    error: r.error ?? null,
  };
}
