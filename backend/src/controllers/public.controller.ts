import { asyncHandler, ok, created } from '../utils/http';
import { applicationService } from '../services/application.service';
import { candidateAssessmentService } from '../services/candidate-assessment.service';
import { interviewService } from '../services/interview.service';
import { scheduledInterviewService } from '../services/scheduled-interview.service';
import { workspaceService } from '../services/workspace.service';
import {
  publicApplicationSchema,
  autosaveAnswerSchema,
  submitAssessmentSchema,
  runCodeSchema,
  submitInterviewFeedbackSchema,
} from '../shared';

export const publicController = {
  getInvite: asyncHandler(async (req, res) => {
    ok(res, await workspaceService.getInviteByToken(req.params.token));
  }),

  getJob: asyncHandler(async (req, res) => {
    const data = await applicationService.getPublicJob(req.params.workspaceSlug, req.params.jobSlug);
    ok(res, data);
  }),

  apply: asyncHandler(async (req, res) => {
    // Multipart fields arrive as strings; answers/questionFileMeta are JSON-encoded arrays.
    const raw: Record<string, unknown> = { ...req.body };
    for (const field of ['answers', 'questionFileMeta'] as const) {
      if (typeof raw[field] === 'string') {
        try {
          raw[field] = JSON.parse(raw[field] as string);
        } catch {
          raw[field] = [];
        }
      }
    }
    const input = publicApplicationSchema.parse(raw);
    const files = req.files as { resume?: Express.Multer.File[]; questionFiles?: Express.Multer.File[] } | undefined;
    const resumeFile = files?.resume?.[0];
    const questionFiles = (files?.questionFiles ?? []).map((f, i) => ({
      questionId: input.questionFileMeta[i]?.questionId,
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));
    const result = await applicationService.submitPublicApplication(
      req.params.workspaceSlug,
      req.params.jobSlug,
      input,
      resumeFile
        ? { buffer: resumeFile.buffer, originalname: resumeFile.originalname, mimetype: resumeFile.mimetype, size: resumeFile.size }
        : undefined,
      questionFiles,
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

  // ---- Candidate AI interview (public, token-gated) ----
  getInterview: asyncHandler(async (req, res) => {
    ok(res, await interviewService.getByToken(req.params.token));
  }),
  interviewSession: asyncHandler(async (req, res) => {
    ok(res, await interviewService.mintSession(req.params.token));
  }),
  completeInterview: asyncHandler(async (req, res) => {
    const executionId = typeof req.body?.executionId === 'string' ? req.body.executionId : undefined;
    ok(res, await interviewService.reportCompletion(req.params.token, executionId));
  }),

  // ---- Interviewer access link ("link that only interviewer can access", token-gated, no account) ----
  getInterviewerAccess: asyncHandler(async (req, res) => {
    ok(res, await scheduledInterviewService.getInterviewerAccess(req.params.token));
  }),
  submitInterviewerFeedback: asyncHandler(async (req, res) => {
    const body = submitInterviewFeedbackSchema.parse(req.body);
    created(res, await scheduledInterviewService.submitInterviewerFeedback(req.params.token, body));
  }),

  // ---- Bolna webhook (secret-in-URL; Bolna does not sign) ----
  bolnaWebhook: asyncHandler(async (req, res) => {
    await interviewService.handleWebhook(req.params.secret, req.body);
    ok(res, { received: true });
  }),
};
