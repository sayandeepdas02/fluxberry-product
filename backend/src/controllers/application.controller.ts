import { asyncHandler, ok } from '../utils/http';
import { candidateService } from '../services/candidate.service';
import { stageService } from '../services/stage.service';
import { screeningService } from '../services/screening.service';
import type { StageChangeInput, RejectApplicationInput } from '@fluxberry/shared';

function actor(req: any) {
  return { userId: req.auth.user.id, label: req.auth.user.name };
}

export const applicationController = {
  getDetail: asyncHandler(async (req, res) => {
    const detail = await candidateService.getApplicationDetail(
      req.auth!.workspaceId!,
      req.params.applicationId,
    );
    ok(res, detail);
  }),

  getTimeline: asyncHandler(async (req, res) => {
    const timeline = await candidateService.getTimeline(req.auth!.workspaceId!, req.params.applicationId);
    ok(res, timeline);
  }),

  moveStage: asyncHandler(async (req, res) => {
    const body = req.body as StageChangeInput;
    const app = await stageService.moveToStage(
      req.auth!.workspaceId!,
      req.params.applicationId,
      body.stage,
      actor(req),
      { note: body.note },
    );
    ok(res, app);
  }),

  shortlist: asyncHandler(async (req, res) => {
    const app = await stageService.shortlist(req.auth!.workspaceId!, req.params.applicationId, actor(req));
    ok(res, app);
  }),

  hire: asyncHandler(async (req, res) => {
    const app = await stageService.hire(req.auth!.workspaceId!, req.params.applicationId, actor(req));
    ok(res, app);
  }),

  reject: asyncHandler(async (req, res) => {
    const app = await stageService.reject(
      req.auth!.workspaceId!,
      req.params.applicationId,
      actor(req),
      req.body as RejectApplicationInput,
    );
    ok(res, app);
  }),

  rescreen: asyncHandler(async (req, res) => {
    await screeningService.retry(req.auth!.workspaceId!, req.params.applicationId);
    ok(res, { status: 'queued' });
  }),
};
