import { asyncHandler, ok } from '../utils/http';
import { candidateService } from '../services/candidate.service';
import type { CandidateListQuery } from '@fluxberry/shared';

export const candidateController = {
  list: asyncHandler(async (req, res) => {
    const result = await candidateService.list(
      req.auth!.workspaceId!,
      req.query as unknown as CandidateListQuery,
    );
    ok(res, result);
  }),

  getProfile: asyncHandler(async (req, res) => {
    const profile = await candidateService.getProfile(req.auth!.workspaceId!, req.params.candidateId);
    ok(res, profile);
  }),

  getResumeUrl: asyncHandler(async (req, res) => {
    const url = await candidateService.getResumeUrl(req.auth!.workspaceId!, req.params.candidateId);
    ok(res, { url });
  }),
};
