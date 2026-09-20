import { asyncHandler, ok, requestOrigin, requestDisposition } from '../utils/http';
import { candidateService } from '../services/candidate.service';
import type { CandidateListQuery } from '../shared';

export const candidateController = {
  list: asyncHandler(async (req, res) => {
    const result = await candidateService.list(
      req.auth!.workspaceId!,
      req.query as unknown as CandidateListQuery,
      req.auth!,
    );
    ok(res, result);
  }),

  getProfile: asyncHandler(async (req, res) => {
    const profile = await candidateService.getProfile(req.auth!.workspaceId!, req.params.candidateId, req.auth!);
    ok(res, profile);
  }),

  getResumeUrl: asyncHandler(async (req, res) => {
    const url = await candidateService.getResumeUrl(req.auth!.workspaceId!, req.params.candidateId, req.auth!, {
      disposition: requestDisposition(req),
      originOverride: requestOrigin(req),
    });
    ok(res, { url });
  }),
};
