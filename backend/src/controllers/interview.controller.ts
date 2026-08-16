import { asyncHandler, ok, created } from '../utils/http';
import { interviewConfigService } from '../services/interview-config.service';
import { interviewService } from '../services/interview.service';
import type { UpsertInterviewConfigInput, SendInterviewInput } from '@fluxberry/shared';

export const interviewController = {
  // ---- Recruiter: per-job interview configuration ----
  getConfig: asyncHandler(async (req, res) => {
    ok(res, await interviewConfigService.getOrCreate(req.auth!.workspaceId!, req.params.jobId));
  }),
  updateConfig: asyncHandler(async (req, res) => {
    ok(
      res,
      await interviewConfigService.update(
        req.auth!.workspaceId!,
        req.params.jobId,
        req.auth!.user.id,
        req.body as UpsertInterviewConfigInput,
      ),
    );
  }),

  // ---- Recruiter: send an interview + list a candidate's interviews ----
  send: asyncHandler(async (req, res) => {
    const ca = await interviewService.send(
      req.auth!.workspaceId!,
      req.params.applicationId,
      req.body as SendInterviewInput,
      { userId: req.auth!.user.id, label: req.auth!.user.name },
    );
    created(res, ca);
  }),
  listForApplication: asyncHandler(async (req, res) => {
    ok(res, await interviewService.listForApplication(req.auth!.workspaceId!, req.params.applicationId));
  }),
};
