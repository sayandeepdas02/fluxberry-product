import type { AiInterviewConfigDto, InterviewDto, InterviewEvaluationDto } from '@fluxberry/shared';

export function toAiInterviewConfigDto(c: any): AiInterviewConfigDto {
  return {
    id: String(c._id),
    jobId: String(c.jobId),
    name: c.name,
    objective: c.objective ?? '',
    introduction: c.introduction ?? '',
    questions: (c.questions ?? []).map((q: any) => ({
      id: q.id,
      text: q.text,
      followUpAllowed: Boolean(q.followUpAllowed),
    })),
    durationMinutes: c.durationMinutes,
    tone: c.tone,
    language: c.language,
    status: c.status,
    agentReady: Boolean(c.bolnaAgentId),
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}

function toEvaluationDto(e: any): InterviewEvaluationDto | null {
  if (!e) return null;
  return {
    communicationScore: e.communicationScore ?? 0,
    technicalScore: e.technicalScore ?? 0,
    confidenceScore: e.confidenceScore ?? 0,
    problemSolvingScore: e.problemSolvingScore ?? 0,
    overallScore: e.overallScore ?? 0,
    summary: e.summary ?? '',
    strengths: e.strengths ?? [],
    concerns: e.concerns ?? [],
  };
}

export function toInterviewDto(i: any): InterviewDto {
  return {
    id: String(i._id),
    applicationId: String(i.applicationId),
    candidateId: String(i.candidateId),
    jobId: String(i.jobId),
    status: i.status,
    provider: i.provider,
    durationSec: i.durationSec ?? null,
    transcript: i.transcript ?? null,
    recordingUrl: i.recordingUrl ?? null,
    evaluation: toEvaluationDto(i.evaluation),
    invitedAt: i.invitedAt ? new Date(i.invitedAt).toISOString() : null,
    startedAt: i.startedAt ? new Date(i.startedAt).toISOString() : null,
    completedAt: i.completedAt ? new Date(i.completedAt).toISOString() : null,
    expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : null,
  };
}
