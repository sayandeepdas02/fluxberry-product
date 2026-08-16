import type { UpsertWorkflowInput, WorkflowDto, WorkflowRunDto } from '@fluxberry/shared';
import { workflowRepository, workflowRunRepository, workflowStepRepository } from '../repositories/workflow.repository';
import { jobRepository } from '../repositories/job.repository';
import { toWorkflowDto, toWorkflowRunDto } from '../serializers/workflow.serializer';
import { auditService } from './audit.service';
import { notFound } from '../utils/errors';

export const workflowService = {
  /** Get the job's workflow, creating an empty draft on first access. */
  async getForJob(workspaceId: string, jobId: string): Promise<WorkflowDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    let wf = await workflowRepository.findByJob(jobId);
    if (!wf) {
      wf = await workflowRepository.upsertForJob(jobId, {
        workspaceId,
        jobId,
        name: 'Hiring workflow',
        status: 'DRAFT',
        nodes: [],
        edges: [],
      });
      if (!job.workflowId) await jobRepository.update(jobId, { workflowId: wf._id });
    }
    return toWorkflowDto(wf.toObject());
  },

  async save(workspaceId: string, jobId: string, actorId: string, input: UpsertWorkflowInput): Promise<WorkflowDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    const patch: Record<string, any> = { workspaceId, jobId, nodes: input.nodes, edges: input.edges };
    if (input.name !== undefined) patch.name = input.name;
    if (input.status !== undefined) patch.status = input.status;
    const wf = await workflowRepository.upsertForJob(jobId, patch);
    if (!job.workflowId) await jobRepository.update(jobId, { workflowId: wf._id });
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'workflow.updated',
      resourceType: 'workflow',
      resourceId: String(wf._id),
      metadata: { status: wf.status, nodes: input.nodes.length },
    });
    return toWorkflowDto(wf.toObject());
  },

  async getRunForApplication(applicationId: string): Promise<WorkflowRunDto | null> {
    const run = await workflowRunRepository.findByApplication(applicationId);
    if (!run) return null;
    const steps = await workflowStepRepository.listByRun(String(run._id));
    return toWorkflowRunDto(run.toObject(), steps);
  },
};
