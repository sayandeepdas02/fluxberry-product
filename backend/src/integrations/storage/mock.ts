import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import type { FileRef } from '@fluxberry/shared';
import type { DownloadUrlOptions, StorageProvider, UploadInput } from './types';
import { config } from '../../config/env';
import { notFound, forbidden } from '../../utils/errors';

const ROOT = path.resolve(process.cwd(), '.storage');
const SIGN_SECRET = config.auth.testTokenSecret + ':storage';

function sign(key: string, exp: number, mime: string, disposition: string): string {
  return crypto.createHmac('sha256', SIGN_SECRET).update(`${key}:${exp}:${mime}:${disposition}`).digest('base64url');
}

/** Local-filesystem storage used when no S3/R2 keys are configured. */
export class MockStorageProvider implements StorageProvider {
  readonly name = 'mock';

  async upload(input: UploadInput): Promise<FileRef> {
    const full = path.join(ROOT, input.key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, input.body);
    return {
      storageKey: input.key,
      fileName: input.fileName,
      fileSize: input.body.length,
      mimeType: input.contentType,
    };
  }

  async createDownloadUrl(
    ref: Pick<FileRef, 'storageKey' | 'fileName' | 'mimeType'>,
    ttlSec = 300,
    opts?: DownloadUrlOptions,
  ): Promise<string> {
    const exp = Date.now() + ttlSec * 1000;
    const disposition = opts?.disposition ?? 'inline';
    const mime = ref.mimeType || 'application/octet-stream';
    const sig = sign(ref.storageKey, exp, mime, disposition);
    const qs = new URLSearchParams({
      key: ref.storageKey,
      exp: String(exp),
      sig,
      mime,
      disposition,
      fileName: ref.fileName,
    });
    const origin = opts?.originOverride || config.publicApiUrl;
    return `${origin}/files/mock?${qs.toString()}`;
  }

  getPublicUrl(key: string): string {
    return `${config.publicApiUrl}/files/public/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const full = path.join(ROOT, key);
    if (!full.startsWith(ROOT + path.sep)) throw notFound('Invalid key');
    return fs.promises.readFile(full);
  }

  async delete(key: string): Promise<void> {
    const full = path.join(ROOT, key);
    await fs.promises.rm(full, { force: true });
  }
}

/**
 * Serves mock-stored files behind the same signed-URL contract as S3. Mounted
 * unconditionally; only serves files with a valid, unexpired signature.
 */
export const mockStorageRouter = Router();
mockStorageRouter.get('/files/mock', (req, res, next) => {
  try {
    const key = String(req.query.key ?? '');
    const exp = Number(req.query.exp ?? 0);
    const sig = String(req.query.sig ?? '');
    const mime = String(req.query.mime ?? 'application/octet-stream');
    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
    const fileName = String(req.query.fileName ?? path.basename(key));
    if (!key || !exp || !sig) throw notFound('File not found');
    if (Date.now() > exp) throw forbidden('Link expired');
    const expected = sign(key, exp, mime, disposition);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw forbidden('Invalid signature');
    }
    // Prevent path traversal.
    const full = path.join(ROOT, key);
    if (!full.startsWith(ROOT + path.sep)) throw forbidden('Invalid key');
    if (!fs.existsSync(full)) throw notFound('File not found');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName.replace(/"/g, '')}"`);
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    next(err);
  }
});

/** Unsigned, permanent access for assets meant to be public (e.g. workspace logos). */
mockStorageRouter.get('/files/public/*', (req, res, next) => {
  try {
    const key = String((req.params as unknown as string[])[0] ?? '');
    const full = path.join(ROOT, key);
    if (!full.startsWith(ROOT + path.sep) || !fs.existsSync(full)) throw notFound('File not found');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(key)}"`);
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    next(err);
  }
});
