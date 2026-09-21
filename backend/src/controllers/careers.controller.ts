import { asyncHandler, ok } from '../utils/http';
import { careersService } from '../services/careers.service';
import { careersSlugSchema, setCareersSlugSchema, type UpdateCareersInput } from '../shared';
import { badRequest } from '../utils/errors';

export const careersController = {
  get: asyncHandler(async (req, res) => {
    ok(res, await careersService.getForWorkspace(req.auth!.workspaceId!));
  }),

  update: asyncHandler(async (req, res) => {
    const page = await careersService.update(req.auth!.workspaceId!, req.auth!.user.id, req.body as UpdateCareersInput);
    ok(res, page);
  }),

  slugAvailable: asyncHandler(async (req, res) => {
    const parsed = careersSlugSchema.safeParse(String(req.query.slug ?? ''));
    if (!parsed.success) {
      ok(res, { available: false, reason: parsed.error.issues[0]?.message ?? 'Invalid URL' });
      return;
    }
    const result = await careersService.checkSlug(req.auth!.workspaceId!, parsed.data);
    ok(res, result);
  }),

  setSlug: asyncHandler(async (req, res) => {
    const body = setCareersSlugSchema.parse(req.body);
    ok(res, await careersService.setSlug(req.auth!.workspaceId!, req.auth!.user.id, body.slug));
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    ok(res, await careersService.uploadAvatar(req.auth!.workspaceId!, file));
  }),

  uploadCoverImage: asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No image file provided');
    ok(res, await careersService.uploadCoverImage(req.auth!.workspaceId!, {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    }));
  }),

  generatePreview: asyncHandler(async (req, res) => {
    ok(res, careersService.generatePreviewToken(req.auth!.workspaceId!));
  }),

  // ---- public ----
  publicGet: asyncHandler(async (req, res) => {
    const previewToken = typeof req.query.preview === 'string' ? req.query.preview : undefined;
    ok(res, await careersService.getPublicCareers(req.params.slug, previewToken));
  }),

  publicJobs: asyncHandler(async (req, res) => {
    const data = await careersService.getPublicCareers(req.params.slug);
    ok(res, { company: data.company, heading: data.jobs.heading, openings: data.openings, accentColor: data.accentColor });
  }),

  publicSitemapEntries: asyncHandler(async (_req, res) => {
    ok(res, await careersService.getSitemapEntries());
  }),
};
