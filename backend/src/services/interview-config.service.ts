import crypto from 'node:crypto';
import type { AiInterviewConfigDto, UpsertInterviewConfigInput } from '../shared';
import { AiInterviewConfigModel } from '../models/ai-interview-config.model';
import { jobRepository } from '../repositories/job.repository';
import { getInterviewProvider } from '../integrations';
import { toAiInterviewConfigDto } from '../serializers/interview.serializer';
import { shortId } from '../utils/ids';
import { logger } from '../utils/logger';
import { notFound } from '../utils/errors';

/** Content hash so we only re-sync a provider agent when the config changes. */
export function configHash(c: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      objective: c.objective,
      introduction: c.introduction,
      questions: (c.questions ?? []).map((q: any) => q.text),
      durationMinutes: c.durationMinutes,
      tone: c.tone,
      language: c.language,
    }))
    .digest('hex');
}

export const interviewConfigService = {
  /** Get the job's interview config, creating an empty one on first access. */
  async getOrCreate(workspaceId: string, jobId: string): Promise<AiInterviewConfigDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');

    let cfg = await AiInterviewConfigModel.findOne({ jobId });
    if (!cfg) {
      cfg = await AiInterviewConfigModel.create({ workspaceId, jobId });
      if (!job.interviewConfigId) await jobRepository.update(jobId, { interviewConfigId: cfg._id });
    }
    return toAiInterviewConfigDto(cfg.toObject());
  },

  async update(
    workspaceId: string,
    jobId: string,
    userId: string,
    input: UpsertInterviewConfigInput,
  ): Promise<AiInterviewConfigDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    await this.getOrCreate(workspaceId, jobId);

    const questions = (input.questions ?? []).map((q) => ({
      id: q.id || shortId(),
      text: q.text,
      followUpAllowed: Boolean(q.followUpAllowed),
    }));

    const cfg = await AiInterviewConfigModel.findOneAndUpdate(
      { jobId },
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        objective: input.objective ?? '',
        introduction: input.introduction ?? '',
        questions,
        durationMinutes: input.durationMinutes ?? 6,
        tone: input.tone ?? 'professional',
        language: input.language ?? 'en',
        ...(input.status ? { status: input.status } : {}),
        createdBy: userId,
      },
      { new: true },
    );

    // Sync a provider agent when the content changed (best-effort, non-fatal).
    const hash = configHash(cfg!);
    if (hash !== cfg!.agentSyncHash || !cfg!.bolnaAgentId) {
      try {
        const { agentId } = await getInterviewProvider().syncAgent({
          name: cfg!.name,
          objective: cfg!.objective,
          introduction: cfg!.introduction,
          questions: (cfg!.questions ?? []).map((q: any) => q.text),
          durationMinutes: cfg!.durationMinutes,
          tone: cfg!.tone,
          language: cfg!.language,
          existingAgentId: cfg!.bolnaAgentId,
        });
        cfg!.bolnaAgentId = agentId;
        cfg!.agentSyncHash = hash;
        await cfg!.save();
      } catch (err) {
        logger.warn({ jobId, err: (err as Error).message }, 'interview agent sync failed (config still saved)');
      }
    }

    return toAiInterviewConfigDto(cfg!.toObject());
  },
};
