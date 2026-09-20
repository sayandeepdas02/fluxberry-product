import { asyncHandler, ok, created } from '../utils/http';
import { jobService } from '../services/job.service';
import type {
  CreateJobInput,
  UpdateJobInput,
  UpdateJobAccessInput,
  GenerateJdInput,
  JobListQuery,
  JobStatusInput,
  UpsertPipelineStagesInput,
  SetLinkedInPostedInput,
} from '../shared';

export const jobController = {
  create: asyncHandler(async (req, res) => {
    const job = await jobService.create(req.auth!.workspaceId!, req.auth!.user.id, req.body as CreateJobInput);
    created(res, job);
  }),

  list: asyncHandler(async (req, res) => {
    const jobs = await jobService.list(req.auth!.workspaceId!, req.query as unknown as JobListQuery, req.auth!);
    ok(res, jobs);
  }),

  get: asyncHandler(async (req, res) => {
    const job = await jobService.get(req.auth!.workspaceId!, req.params.jobId);
    ok(res, job);
  }),

  update: asyncHandler(async (req, res) => {
    const job = await jobService.update(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.jobId,
      req.body as UpdateJobInput,
    );
    ok(res, job);
  }),

  publish: asyncHandler(async (req, res) => {
    const job = await jobService.publish(req.auth!.workspaceId!, req.auth!.user.id, req.params.jobId);
    ok(res, job);
  }),

  setStatus: asyncHandler(async (req, res) => {
    const job = await jobService.setStatus(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.jobId,
      (req.body as JobStatusInput).status,
    );
    ok(res, job);
  }),

  generateDescription: asyncHandler(async (req, res) => {
    const result = await jobService.generateDescription(req.body as GenerateJdInput);
    ok(res, result);
  }),

  clone: asyncHandler(async (req, res) => {
    const job = await jobService.clone(req.auth!.workspaceId!, req.params.jobId, req.auth!.user.id);
    created(res, job);
  }),

  getStages: asyncHandler(async (req, res) => {
    const stages = await jobService.getStages(req.auth!.workspaceId!, req.params.jobId);
    ok(res, stages);
  }),

  updateStages: asyncHandler(async (req, res) => {
    const stages = await jobService.updateStages(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.jobId,
      (req.body as UpsertPipelineStagesInput).stages,
    );
    ok(res, stages);
  }),

  updateAccess: asyncHandler(async (req, res) => {
    const job = await jobService.updateAccess(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.jobId,
      req.body as UpdateJobAccessInput,
    );
    ok(res, job);
  }),

  setLinkedInPosted: asyncHandler(async (req, res) => {
    const job = await jobService.setLinkedInPosted(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.jobId,
      (req.body as SetLinkedInPostedInput).posted,
    );
    ok(res, job);
  }),
};
