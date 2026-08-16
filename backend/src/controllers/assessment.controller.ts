import { asyncHandler, ok, created } from '../utils/http';
import { assessmentService } from '../services/assessment.service';
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  SendAssessmentInput,
  AssessmentStatus,
} from '@fluxberry/shared';

function actor(req: any) {
  return { userId: req.auth.user.id, label: req.auth.user.name };
}

export const assessmentController = {
  list: asyncHandler(async (req, res) => {
    ok(res, await assessmentService.list(req.auth!.workspaceId!));
  }),
  get: asyncHandler(async (req, res) => {
    ok(res, await assessmentService.get(req.auth!.workspaceId!, req.params.assessmentId));
  }),
  create: asyncHandler(async (req, res) => {
    const a = await assessmentService.create(req.auth!.workspaceId!, req.auth!.user.id, req.body as CreateAssessmentInput);
    created(res, a);
  }),
  update: asyncHandler(async (req, res) => {
    ok(res, await assessmentService.update(req.auth!.workspaceId!, req.params.assessmentId, req.body as UpdateAssessmentInput));
  }),
  setStatus: asyncHandler(async (req, res) => {
    ok(res, await assessmentService.setStatus(req.auth!.workspaceId!, req.params.assessmentId, (req.body as { status: AssessmentStatus }).status));
  }),

  // Sending + candidate assessments live under an application.
  send: asyncHandler(async (req, res) => {
    const ca = await assessmentService.send(
      req.auth!.workspaceId!,
      req.params.applicationId,
      req.body as SendAssessmentInput,
      actor(req),
    );
    created(res, ca);
  }),
  listForApplication: asyncHandler(async (req, res) => {
    ok(res, await assessmentService.listForApplication(req.auth!.workspaceId!, req.params.applicationId));
  }),
};
