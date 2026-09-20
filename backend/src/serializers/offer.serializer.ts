import type { OfferDto, OfferCompensationDto, PublicOfferDto } from '@fluxberry/shared';

function toCompensationDto(c: any): OfferCompensationDto {
  return {
    baseSalary: c.baseSalary,
    currency: c.currency ?? 'USD',
    bonus: c.bonus ?? null,
    equity: c.equity ?? null,
    startDate: new Date(c.startDate).toISOString(),
    employmentType: c.employmentType ?? null,
  };
}

export function toOfferDto(o: any): OfferDto {
  return {
    id: String(o._id),
    workspaceId: String(o.workspaceId),
    applicationId: String(o.applicationId),
    candidateId: String(o.candidateId),
    jobId: String(o.jobId),
    status: o.status,
    compensation: toCompensationDto(o.compensation),
    note: o.note ?? null,
    expiresAt: new Date(o.expiresAt).toISOString(),
    sentAt: o.sentAt ? new Date(o.sentAt).toISOString() : null,
    respondedAt: o.respondedAt ? new Date(o.respondedAt).toISOString() : null,
    decisionNote: o.decisionNote ?? null,
    createdBy: o.createdBy ? String(o.createdBy) : null,
    createdAt: new Date(o.createdAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
  };
}

export function toPublicOfferDto(
  o: any,
  meta: { jobTitle: string; companyName: string; candidateName: string },
): PublicOfferDto {
  return {
    status: o.status,
    jobTitle: meta.jobTitle,
    companyName: meta.companyName,
    candidateName: meta.candidateName,
    compensation: toCompensationDto(o.compensation),
    note: o.note ?? null,
    expiresAt: new Date(o.expiresAt).toISOString(),
    sentAt: o.sentAt ? new Date(o.sentAt).toISOString() : null,
    respondedAt: o.respondedAt ? new Date(o.respondedAt).toISOString() : null,
  };
}
