import { asyncHandler, ok, created, noContent } from '../utils/http';
import { labelService } from '../services/label.service';
import type { CreateLabelInput, UpdateLabelInput, SetApplicationLabelsInput } from '../shared';

export const labelController = {
  list: asyncHandler(async (req, res) => {
    const labels = await labelService.list(req.auth!.workspaceId!);
    ok(res, labels);
  }),

  create: asyncHandler(async (req, res) => {
    const label = await labelService.create(req.auth!.workspaceId!, req.auth!.user.id, req.body as CreateLabelInput);
    created(res, label);
  }),

  update: asyncHandler(async (req, res) => {
    const label = await labelService.update(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.labelId,
      req.body as UpdateLabelInput,
    );
    ok(res, label);
  }),

  remove: asyncHandler(async (req, res) => {
    await labelService.remove(req.auth!.workspaceId!, req.auth!.user.id, req.params.labelId);
    noContent(res);
  }),

  setApplicationLabels: asyncHandler(async (req, res) => {
    const labels = await labelService.setApplicationLabels(
      req.auth!.workspaceId!,
      req.params.applicationId,
      (req.body as SetApplicationLabelsInput).labelIds,
    );
    ok(res, labels);
  }),
};
