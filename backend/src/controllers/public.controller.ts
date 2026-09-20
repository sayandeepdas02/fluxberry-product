import { asyncHandler, ok, created } from '../utils/http';
import { applicationService } from '../services/application.service';
import { workspaceService } from '../services/workspace.service';
import { publicApplicationSchema } from '../shared';

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
};
