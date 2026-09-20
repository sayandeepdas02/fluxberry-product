import { asyncHandler, ok, created } from '../utils/http';
import { gdprService } from '../services/gdpr.service';
import { gdprRequestRepository } from '../repositories/gdpr-request.repository';
import type { CreateGdprRequestInput } from '../shared';

export const gdprController = {
  create: asyncHandler(async (req, res) => {
    const request = await gdprService.requestDeletion(
      req.auth!.workspaceId!,
      req.params.candidateId,
      req.auth!.user.id,
      req.body as CreateGdprRequestInput,
    );
    created(res, request);
  }),

  list: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await gdprRequestRepository.findByWorkspace(req.auth!.workspaceId!, { page, limit });
    ok(res, result);
  }),
};
