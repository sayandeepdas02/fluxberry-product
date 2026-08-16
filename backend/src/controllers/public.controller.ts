import { asyncHandler, ok, created } from '../utils/http';
import { applicationService } from '../services/application.service';
import { candidateAssessmentService } from '../services/candidate-assessment.service';
import {
  publicApplicationSchema,
  autosaveAnswerSchema,
  submitAssessmentSchema,
  runCodeSchema,
} from '@fluxberry/shared';

export const publicController = {
  getJob: asyncHandler(async (req, res) => {
    const data = await applicationService.getPublicJob(req.params.workspaceSlug, req.params.jobSlug);
    ok(res, data);
  }),

  apply: asyncHandler(async (req, res) => {
    // Multipart fields arrive as strings; answers is a JSON-encoded array.
    const raw: Record<string, unknown> = { ...req.body };
    if (typeof raw.answers === 'string') {
      try {
        raw.answers = JSON.parse(raw.answers);
      } catch {
        raw.answers = [];
      }
    }
    const input = publicApplicationSchema.parse(raw);
    const file = req.file;
    const result = await applicationService.submitPublicApplication(
      req.params.workspaceSlug,
      req.params.jobSlug,
      input,
      file
        ? { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size }
        : undefined,
    );
    created(res, { applicationId: result.applicationId, message: 'Application submitted' });
  }),

  // ---- Candidate assessment (public, token-gated) ----
  getAssessment: asyncHandler(async (req, res) => {
    ok(res, await candidateAssessmentService.getByToken(req.params.token));
  }),
  startAssessment: asyncHandler(async (req, res) => {
    ok(res, await candidateAssessmentService.start(req.params.token));
  }),
  autosaveAnswer: asyncHandler(async (req, res) => {
    const body = autosaveAnswerSchema.parse(req.body);
    ok(res, await candidateAssessmentService.autosave(req.params.token, body));
  }),
  submitAssessment: asyncHandler(async (req, res) => {
    const body = submitAssessmentSchema.parse(req.body);
    ok(res, await candidateAssessmentService.submit(req.params.token, body));
  }),
  runCode: asyncHandler(async (req, res) => {
    const body = runCodeSchema.parse(req.body);
    ok(res, await candidateAssessmentService.run(req.params.token, body));
  }),
};
