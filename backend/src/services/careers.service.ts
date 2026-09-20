import crypto from 'node:crypto';
import type { CareersPageDto, UpdateCareersInput, PublicCareersDto } from '@fluxberry/shared';
import { careersRepository } from '../repositories/careers.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { toCareersPageDto, toPublicJob } from '../serializers/careers.serializer';
import { auditService } from './audit.service';
import { conflict, notFound } from '../utils/errors';
import { config } from '../config/env';
import { getStorageProvider } from '../integrations';
import { assertValidImage } from '../utils/file-validation';

export const careersService = {
  async getForWorkspace(workspaceId: string): Promise<CareersPageDto> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw notFound('Workspace not found');
    let page = await careersRepository.findByWorkspace(workspaceId);
    if (!page) {
      page = await careersRepository.create({
        workspaceId,
        headline: workspace.name,
        tagline: '',
        about: { enabled: true, content: '' },
        jobs: { enabled: true, heading: 'Open roles' },
      });
    }
    return toCareersPageDto(page.toObject(), workspace.careersSlug ?? null);
  },

  async update(workspaceId: string, actorId: string, input: UpdateCareersInput): Promise<CareersPageDto> {
    await this.getForWorkspace(workspaceId); // ensure exists
    const patch: Record<string, any> = {};
    for (const k of ['headline', 'tagline', 'published', 'about', 'links', 'team', 'jobs', 'benefits', 'sectionOrder', 'accentColor', 'coverImageUrl'] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    const page = await careersRepository.update(workspaceId, patch);
    const workspace = await workspaceRepository.findById(workspaceId);
    await auditService.log({
      workspaceId, userId: actorId, action: 'careers.updated', resourceType: 'careers_page', resourceId: String(page!._id),
      metadata: { published: page!.published },
    });
    return toCareersPageDto(page!.toObject(), workspace?.careersSlug ?? null);
  },

  async checkSlug(workspaceId: string, slug: string): Promise<{ available: boolean }> {
    const taken = await workspaceRepository.careersSlugTaken(slug, workspaceId);
    return { available: !taken };
  },

  async setSlug(workspaceId: string, actorId: string, slug: string): Promise<{ slug: string }> {
    if (await workspaceRepository.careersSlugTaken(slug, workspaceId)) {
      throw conflict('That careers URL is already taken');
    }
    try {
      await workspaceRepository.setCareersSlug(workspaceId, slug);
    } catch (err) {
      if (isDup(err)) throw conflict('That careers URL is already taken');
      throw err;
    }
    await auditService.log({ workspaceId, userId: actorId, action: 'careers.slug_set', resourceType: 'workspace', resourceId: workspaceId, metadata: { slug } });
    return { slug };
  },

  generatePreviewToken(workspaceId: string): { token: string; expiresAt: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const payload = `${workspaceId}:${expiresAt}`;
    const sig = crypto.createHmac('sha256', config.careersPreviewSecret).update(payload).digest('hex');
    return { token: Buffer.from(`${payload}:${sig}`).toString('base64url'), expiresAt };
  },

  validatePreviewToken(token: string, workspaceId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      if (parts.length !== 3) return false;
      const [tokenWsId, expiresAtStr, sig] = parts;
      if (tokenWsId !== workspaceId) return false;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() / 1000 > expiresAt) return false;
      const expected = crypto.createHmac('sha256', config.careersPreviewSecret)
        .update(`${tokenWsId}:${expiresAtStr}`)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  },

  async uploadAvatar(
    workspaceId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<{ url: string }> {
    const ext = assertValidImage(file.buffer);
    const key = `careers-avatars/${workspaceId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const storage = getStorageProvider();
    const fileRef = await storage.upload({ key, body: file.buffer, contentType: file.mimetype, fileName: file.originalname });
    return { url: storage.getPublicUrl(fileRef.storageKey) };
  },

  async uploadCoverImage(
    workspaceId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<CareersPageDto> {
    const ext = assertValidImage(file.buffer);
    const key = `careers-covers/${workspaceId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const storage = getStorageProvider();
    const fileRef = await storage.upload({ key, body: file.buffer, contentType: file.mimetype, fileName: file.originalname });
    const coverImageUrl = storage.getPublicUrl(fileRef.storageKey);
    const page = await careersRepository.update(workspaceId, { coverImageUrl });
    const workspace = await workspaceRepository.findById(workspaceId);
    return toCareersPageDto(page!.toObject(), workspace?.careersSlug ?? null);
  },

  async getPublicCareers(careersSlug: string, previewToken?: string): Promise<PublicCareersDto> {
    const workspace = await workspaceRepository.findByCareersSlug(careersSlug);
    if (!workspace) throw notFound('Careers page not found');
    const page = await careersRepository.findByWorkspace(String(workspace._id));
    if (!page) throw notFound('Careers page not found');
    if (!page.published) {
      if (!previewToken || !this.validatePreviewToken(previewToken, String(workspace._id))) {
        throw notFound('Careers page not found');
      }
    }

    const jobs = await careersRepository.publishedJobs(String(workspace._id));
    const dto = toCareersPageDto(page.toObject(), workspace.careersSlug ?? null);

    return {
      company: { name: workspace.name, logoUrl: workspace.logoUrl ?? null, careersSlug: workspace.careersSlug! },
      headline: dto.headline || workspace.name,
      tagline: dto.tagline,
      about: dto.about.enabled ? dto.about : { enabled: false, content: '' },
      links: dto.links.enabled ? dto.links : { enabled: false, items: [] },
      team: dto.team.enabled ? dto.team : { enabled: false, members: [] },
      jobs: dto.jobs,
      benefits: dto.benefits.enabled ? dto.benefits : { enabled: false, items: [] },
      sectionOrder: dto.sectionOrder,
      accentColor: dto.accentColor,
      coverImageUrl: dto.coverImageUrl,
      openings: dto.jobs.enabled ? jobs.map((j) => toPublicJob(j, workspace.slug)) : [],
    };
  },
};

function isDup(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000;
}
