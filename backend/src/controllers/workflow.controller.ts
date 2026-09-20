import { asyncHandler, ok } from '../utils/http';
import { workflowService } from '../services/workflow.service';
import type { UpsertWorkflowInput } from '../shared';

export const workflowController = {
  get: asyncHandler(async (req, res) => {
    ok(res, await workflowService.getForJob(req.auth!.workspaceId!, req.params.jobId));
  }),
  save: asyncHandler(async (req, res) => {
    const wf = await workflowService.save(
      req.auth!.workspaceId!,
      req.params.jobId,
      req.auth!.user.id,
      req.body as UpsertWorkflowInput,
    );
    ok(res, wf);
  }),
  getRun: asyncHandler(async (req, res) => {
    ok(res, await workflowService.getRunForApplication(req.params.applicationId));
  }),
};
