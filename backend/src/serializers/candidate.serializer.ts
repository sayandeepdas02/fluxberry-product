import type { CandidateDto } from '@fluxberry/shared';

export function toCandidateDto(c: any): CandidateDto {
  return {
    id: String(c._id),
    workspaceId: String(c.workspaceId),
    name: c.name,
    email: c.email,
    phone: c.phone ?? null,
    location: c.location ?? null,
    currentSalary: c.currentSalary ?? null,
    expectedSalary: c.expectedSalary ?? null,
    linkedinUrl: c.linkedinUrl ?? null,
    resume: c.resume
      ? {
          storageKey: c.resume.storageKey,
          fileName: c.resume.fileName,
          fileSize: c.resume.fileSize,
          mimeType: c.resume.mimeType,
        }
      : null,
    resumeStatus: c.resumeStatus ?? 'PENDING',
    parsedProfile: c.parsedProfile ?? null,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}
