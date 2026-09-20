import type {
  CreateJobInput,
  UpdateJobInput,
  UpdateJobAccessInput,
  GenerateJdInput,
  GenerateJdResult,
  JobDto,
  JobListQuery,
  JobStatus,
  PipelineStage,
} from '../shared';
import { APPLICATION_STAGES, defaultPipelineStages } from '../shared';
import { jobRepository } from '../repositories/job.repository';
import { applicationRepository } from '../repositories/application.repository';
import { memberRepository } from '../repositories/member.repository';
import { toJobDto } from '../serializers/job.serializer';
import { uniqueSlug } from '../utils/slug';
import { notFound, badRequest, conflict } from '../utils/errors';
import { auditService } from './audit.service';
import { eventBus } from '../events/event-bus';
import { getAIProvider } from '../integrations';
import { candidateService } from './candidate.service';
import { logger } from '../utils/logger';
import { JobModel } from '../models/job.model';
import { ApplicationModel } from '../models/application.model';
import { ApplicationFormModel } from '../models/application-form.model';
import { WorkflowModel } from '../models/workflow.model';
import { trackEvent } from '../integrations/posthog';
import type { AuthContext } from '../types/auth-context';

const SYSTEM_STAGE_IDS = new Set<string>(APPLICATION_STAGES);

/** Force-derive system/terminal flags server-side — never trust client input for these. */
function normalizeStages(input: PipelineStage[], existingSystemIds: Set<string>): PipelineStage[] {
  return input.map((s, index) => {
    const isSystem = existingSystemIds.has(s.id) || SYSTEM_STAGE_IDS.has(s.id);
    return {
      id: s.id,
      label: s.label,
      color: s.color ?? null,
      sortOrder: index,
      system: isSystem,
      terminal: isSystem ? s.id === 'REJECTED' : Boolean(s.terminal),
    };
  });
}

export const jobService = {
  async create(workspaceId: string, userId: string, input: CreateJobInput): Promise<JobDto> {
    const slug = await uniqueSlug(input.title, (s) => jobRepository.slugExists(workspaceId, s));
    const job = await jobRepository.create({
      workspaceId: workspaceId as any,
      title: input.title,
      slug,
      department: input.department ?? null,
      description: input.description ?? '',
      status: 'DRAFT',
      employmentType: input.employmentType,
      workMode: input.workMode,
      location: input.location ?? null,
      openings: input.openings,
      salary: input.salary ?? undefined,
      experience: input.experience ?? undefined,
      skills: input.skills ?? [],
      structuredRequirements: input.structuredRequirements ?? null,
      rawGenerationPrompt: input.rawGenerationPrompt ?? null,
      generatedDescription: input.rawGenerationPrompt ? input.description ?? null : null,
      aiMeta: input.aiMeta
        ? { ...input.aiMeta, generatedAt: new Date() }
        : undefined,
      createdBy: userId as any,
    });

    await auditService.log({
      workspaceId,
      userId,
      action: 'job.created',
      resourceType: 'job',
      resourceId: String(job._id),
      metadata: { title: job.title },
    });
    await eventBus.publish({
      workspaceId,
      type: 'job.created',
      entityType: 'job',
      entityId: job._id,
      actorId: userId,
      actorLabel: 'user',
      payload: { title: job.title },
    });

    return toJobDto(job.toObject());
  },

  async list(workspaceId: string, query: JobListQuery, auth: AuthContext): Promise<JobDto[]> {
    const jobs = await jobRepository.list(workspaceId, { status: query.status, search: query.search }, auth);
    // Unfiltered by design: only counts for jobs already present in `jobs` (itself
    // access-filtered above) ever get attached below, so a restricted job's counts
    // are computed but never exposed to an excluded viewer.
    const counts = await candidateService.funnelCountsByJob(workspaceId);
    return jobs.map((j) => toJobDto(j, counts[String(j._id)]));
  },

  async get(workspaceId: string, id: string): Promise<JobDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, id);
    if (!job) throw notFound('Job not found');
    const counts = await candidateService.funnelCountsForJob(workspaceId, id);
    return toJobDto(job.toObject(), counts);
  },

  async update(
    workspaceId: string,
    userId: string,
    id: string,
    input: UpdateJobInput,
  ): Promise<JobDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, id);
    if (!job) throw notFound('Job not found');

    const patch: Record<string, unknown> = {};
    const assignable: (keyof UpdateJobInput)[] = [
      'title', 'department', 'employmentType', 'workMode', 'location', 'openings',
      'salary', 'experience', 'skills', 'description', 'structuredRequirements',
    ];
    for (const key of assignable) if (input[key] !== undefined) patch[key] = input[key];
    if (input.rawGenerationPrompt !== undefined) {
      patch.rawGenerationPrompt = input.rawGenerationPrompt;
      patch.generatedDescription = input.description ?? job.description;
    }
    if (input.aiMeta) patch.aiMeta = { ...input.aiMeta, generatedAt: new Date() };
    // Slug intentionally preserved across title changes (spec §20).

    const updated = await jobRepository.update(id, patch);
    await auditService.log({
      workspaceId,
      userId,
      action: 'job.updated',
      resourceType: 'job',
      resourceId: id,
    });
    return toJobDto(updated!.toObject());
  },

  async publish(workspaceId: string, userId: string, id: string): Promise<JobDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, id);
    if (!job) throw notFound('Job not found');
    const patch: Record<string, unknown> = { status: 'PUBLISHED' };
    if (!job.publishedAt) patch.publishedAt = new Date();
    const updated = await jobRepository.update(id, patch);
    await auditService.log({
      workspaceId,
      userId,
      action: 'job.published',
      resourceType: 'job',
      resourceId: id,
    });
    await eventBus.publish({
      workspaceId,
      type: 'job.published',
      entityType: 'job',
      entityId: id,
      actorId: userId,
      actorLabel: 'user',
      payload: { slug: job.slug },
    });
    trackEvent(userId, 'job.published', { workspaceId, jobId: id, title: job.title });
    return toJobDto(updated!.toObject());
  },

  async setStatus(
    workspaceId: string,
    userId: string,
    id: string,
    status: JobStatus,
  ): Promise<JobDto> {
    if (status === 'PUBLISHED') return this.publish(workspaceId, userId, id);
    const job = await jobRepository.findInWorkspace(workspaceId, id);
    if (!job) throw notFound('Job not found');

    const patch: Record<string, unknown> = { status };
    if (status === 'CLOSED') patch.closedAt = new Date();
    const updated = await jobRepository.update(id, patch);

    await auditService.log({
      workspaceId,
      userId,
      action: status === 'CLOSED' ? 'job.closed' : 'job.status_changed',
      resourceType: 'job',
      resourceId: id,
      metadata: { status },
    });
    if (status === 'CLOSED') {
      await eventBus.publish({
        workspaceId,
        type: 'job.closed',
        entityType: 'job',
        entityId: id,
        actorId: userId,
        actorLabel: 'user',
      });
    }
    return toJobDto(updated!.toObject());
  },

  /** Synchronous AI job-description generation (user waits with a loading state). */
  async generateDescription(input: GenerateJdInput): Promise<GenerateJdResult> {
    if (!input.title?.trim()) throw badRequest('A job title is required');
    const ai = getAIProvider();
    const result = await ai.generateJobDescription({
      title: input.title,
      userPrompt: input.userPrompt,
      employmentType: input.employmentType,
      workMode: input.workMode,
      location: input.location,
      salary: input.salary,
      experience: input.experience,
      skills: input.skills,
    });
    logger.info({ provider: result.meta.provider, model: result.meta.model }, 'JD generated');
    return {
      description: result.description,
      structuredRequirements: result.structuredRequirements,
      provider: result.meta.provider,
      model: result.meta.model,
      promptVersion: result.meta.promptVersion,
    };
  },

  async clone(workspaceId: string, jobId: string, userId: string): Promise<JobDto> {
    const original = await JobModel.findOne({ _id: jobId, workspaceId }).lean();
    if (!original) throw notFound('Job not found');

    const newSlug = await uniqueSlug(`${original.title} copy`, (s) => jobRepository.slugExists(workspaceId, s));
    const newJob = await JobModel.create({
      workspaceId: original.workspaceId,
      title: `${original.title} (Copy)`,
      slug: newSlug,
      description: original.description,
      status: 'DRAFT',
      employmentType: original.employmentType,
      workMode: original.workMode,
      location: original.location,
      openings: original.openings,
      salary: original.salary,
      experience: original.experience,
      skills: original.skills,
      structuredRequirements: original.structuredRequirements,
      stages: original.stages,
      restrictedTo: original.restrictedTo,
      rawGenerationPrompt: original.rawGenerationPrompt,
      generatedDescription: original.generatedDescription,
      createdBy: userId,
    });

    const updates: Record<string, unknown> = {};

    if (original.applicationFormId) {
      const form = await ApplicationFormModel.findById(original.applicationFormId).lean();
      if (form) {
        const cloned = await ApplicationFormModel.create({
          workspaceId,
          jobId: newJob._id,
          questions: form.questions,
        });
        updates.applicationFormId = cloned._id;
      }
    }

    if (original.workflowId) {
      const wf = await WorkflowModel.findById(original.workflowId).lean();
      if (wf) {
        const cloned = await WorkflowModel.create({
          workspaceId,
          jobId: newJob._id,
          nodes: wf.nodes,
          edges: wf.edges,
          status: 'DRAFT',
        });
        updates.workflowId = cloned._id;
      }
    }

    if (Object.keys(updates).length) {
      await JobModel.findByIdAndUpdate(newJob._id, updates);
    }

    await auditService.log({
      workspaceId,
      userId,
      action: 'job.cloned',
      resourceType: 'job',
      resourceId: String(newJob._id),
      metadata: { sourceJobId: jobId, title: newJob.title },
    });

    const fresh = await JobModel.findById(newJob._id).lean();
    return toJobDto(fresh!);
  },

  async getStages(workspaceId: string, jobId: string): Promise<PipelineStage[]> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    return (job.stages as PipelineStage[] | null) ?? defaultPipelineStages();
  },

  async updateStages(
    workspaceId: string,
    userId: string,
    jobId: string,
    input: PipelineStage[],
  ): Promise<PipelineStage[]> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');

    const existing = (job.stages as PipelineStage[] | null) ?? defaultPipelineStages();
    const existingSystemIds = new Set(existing.filter((s) => s.system).map((s) => s.id));

    const ids = input.map((s) => s.id);
    if (new Set(ids).size !== ids.length) throw badRequest('Stage ids must be unique');

    const newIds = new Set(ids);
    const missingSystemIds = [...existingSystemIds].filter((id) => !newIds.has(id));
    if (missingSystemIds.length) {
      throw badRequest(`Built-in stages can be renamed or reordered but not deleted: ${missingSystemIds.join(', ')}`);
    }

    const removedIds = existing.filter((s) => !s.system && !newIds.has(s.id)).map((s) => s.id);
    for (const id of removedIds) {
      const count = await applicationRepository.countByJobAndStage(jobId, id);
      if (count > 0) {
        throw conflict(`${count} candidate${count === 1 ? ' is' : 's are'} on the stage you're removing — move them first.`, {
          stageId: id,
          count,
        });
      }
    }

    const normalized = normalizeStages(input, existingSystemIds);
    if (!normalized.some((s) => !s.terminal)) {
      throw badRequest('At least one non-terminal stage is required');
    }

    await jobRepository.update(jobId, { stages: normalized });

    await auditService.log({
      workspaceId,
      userId,
      action: 'job.stages_updated',
      resourceType: 'job',
      resourceId: jobId,
      metadata: { stageCount: normalized.length },
    });

    return normalized;
  },

  /**
   * Full-replace the set of users allowed to see this job. Empty = visible to
   * everyone (today's default). Denormalizes onto every existing application
   * for this job so hot-path candidate/analytics queries never need to
   * `$lookup` the job (see `Application.jobRestrictedTo`).
   */
  async updateAccess(
    workspaceId: string,
    userId: string,
    jobId: string,
    input: UpdateJobAccessInput,
  ): Promise<JobDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');

    const unique = Array.from(new Set(input.restrictedTo));
    if (unique.length) {
      const members = await memberRepository.listByWorkspace(workspaceId);
      const memberIds = new Set(members.map((m) => String(m.userId)));
      const invalid = unique.filter((id) => !memberIds.has(id));
      if (invalid.length) throw badRequest(`Not workspace members: ${invalid.join(', ')}`);
    }

    const updated = await jobRepository.update(jobId, { restrictedTo: unique });
    await ApplicationModel.updateMany({ workspaceId, jobId }, { jobRestrictedTo: unique });

    await auditService.log({
      workspaceId,
      userId,
      action: 'job.access_updated',
      resourceType: 'job',
      resourceId: jobId,
      metadata: { restrictedCount: unique.length },
    });

    const counts = await candidateService.funnelCountsForJob(workspaceId, jobId);
    return toJobDto(updated!.toObject(), counts);
  },

  /**
   * Manual "I shared this on LinkedIn" toggle (Phase 3.2) — there's no real
   * LinkedIn job-posting API integration (needs Talent Solutions partnership
   * access), so this just records that the recruiter used the pre-filled
   * share link the frontend generates. See job.serializer.ts's linkedInStatus.
   */
  async setLinkedInPosted(workspaceId: string, userId: string, jobId: string, posted: boolean): Promise<JobDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    const updated = await jobRepository.update(jobId, { linkedInPostedAt: posted ? new Date() : null });
    await auditService.log({
      workspaceId,
      userId,
      action: posted ? 'job.linkedin_marked_posted' : 'job.linkedin_marked_unposted',
      resourceType: 'job',
      resourceId: jobId,
    });
    return toJobDto(updated!.toObject());
  },
};
