import { asyncHandler, ok } from '../utils/http';
import { formService } from '../services/form.service';
import type { UpsertFormInput } from '../shared';

export const formController = {
  get: asyncHandler(async (req, res) => {
    const form = await formService.getOrCreate(req.auth!.workspaceId!, req.params.jobId);
    ok(res, form);
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.body as UpsertFormInput;
    const form = await formService.update(req.auth!.workspaceId!, req.params.jobId, body.questions);
    ok(res, form);
  }),
};
