import { WorkflowModel, WorkflowRunModel, WorkflowStepModel } from '../models/workflow.model';

export const workflowRepository = {
  findByJob: (jobId: string) => WorkflowModel.findOne({ jobId }),
  findById: (id: string) => WorkflowModel.findById(id),
  upsertForJob: (jobId: string, data: Record<string, any>) =>
    WorkflowModel.findOneAndUpdate({ jobId }, { $set: data }, { new: true, upsert: true }),
};

export const workflowRunRepository = {
  create: (data: Record<string, any>) => WorkflowRunModel.create(data),
  findById: (id: string) => WorkflowRunModel.findById(id),
  findByApplication: (applicationId: string) => WorkflowRunModel.findOne({ applicationId }),
  activeByApplication: (applicationId: string) =>
    WorkflowRunModel.findOne({ applicationId, status: { $in: ['RUNNING', 'WAITING'] } }),
  update: (id: string, patch: Record<string, any>) =>
    WorkflowRunModel.findByIdAndUpdate(id, patch, { new: true }),
};

export const workflowStepRepository = {
  create: (data: Record<string, any>) => WorkflowStepModel.create(data),
  listByRun: (runId: string) => WorkflowStepModel.find({ workflowRunId: runId }).sort({ startedAt: 1 }).lean(),
};
