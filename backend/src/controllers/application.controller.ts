import { asyncHandler, ok } from '../utils/http';
import { candidateService } from '../services/candidate.service';
import { stageService } from '../services/stage.service';
import { screeningService } from '../services/screening.service';
import { assessmentService } from '../services/assessment.service';
import { ApplicationModel } from '../models/application.model';
import { isJobAccessible } from '../utils/job-access';
import type { StageChangeInput, RejectApplicationInput, BulkActionInput } from '@fluxberry/shared';

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

  getAnswerFileUrl: asyncHandler(async (req, res) => {
    const url = await candidateService.getAnswerFileUrl(
      req.auth!.workspaceId!,
      req.params.applicationId,
      req.params.questionId,
    );
    ok(res, { url });
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

  bulkAction: asyncHandler(async (req, res) => {
    const workspaceId = req.auth!.workspaceId!;
    const body = req.body as BulkActionInput;
    const act = actor(req);

    // Validate all IDs belong to this workspace, and skip any the actor can't
    // see under per-job access control (restricted job, actor not listed).
    const owned = await ApplicationModel.find({
      _id: { $in: body.applicationIds },
      workspaceId,
    }).select('_id jobRestrictedTo').lean();
    const ownedSet = new Set(
      owned.filter((a) => isJobAccessible(req.auth!, a.jobRestrictedTo)).map((a) => String(a._id)),
    );

    const results = await Promise.allSettled(
      body.applicationIds
        .filter((id) => ownedSet.has(id))
        .map((id) => {
          if (body.action === 'move_stage') return stageService.moveToStage(workspaceId, id, body.stage, act);
          if (body.action === 'reject') return stageService.reject(workspaceId, id, act, { reason: body.reason, note: body.note });
          return assessmentService.send(workspaceId, id, { assessmentId: body.assessmentId, expiresInHours: body.expiresInHours }, act);
        }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const skipped = body.applicationIds.length - ownedSet.size;

    ok(res, { succeeded, failed, skipped });
  }),
};
