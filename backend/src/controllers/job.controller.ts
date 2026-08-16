import { asyncHandler, ok, created } from '../utils/http';
import { jobService } from '../services/job.service';
import type {
  CreateJobInput,
  UpdateJobInput,
  GenerateJdInput,
  JobListQuery,
  JobStatusInput,
} from '@fluxberry/shared';

export const jobController = {
  create: asyncHandler(async (req, res) => {
    const job = await jobService.create(req.auth!.workspaceId!, req.auth!.user.id, req.body as CreateJobInput);
    created(res, job);
  }),

  list: asyncHandler(async (req, res) => {
    const jobs = await jobService.list(req.auth!.workspaceId!, req.query as unknown as JobListQuery);
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
};
