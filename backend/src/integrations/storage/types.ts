import type { FileRef } from '@fluxberry/shared';

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
  fileName: string;
}

export interface DownloadUrlOptions {
  /** 'inline' (default) renders in-browser; 'attachment' forces a download. */
  disposition?: 'inline' | 'attachment';
  /**
   * Externally-reachable origin to build the URL against (e.g. derived from
   * the incoming request's protocol/host), taking precedence over the
   * server's own `PUBLIC_API_URL` config. Only meaningful for providers that
   * build URLs against this server (the mock/local provider); ignored by
   * providers that return an already-absolute external URL (e.g. S3).
   */
  originOverride?: string;
}

/** Provider-agnostic object storage (spec §127). Files never live in Mongo. */
export interface StorageProvider {
  readonly name: string;
  upload(input: UploadInput): Promise<FileRef>;
  /** Short-lived signed URL the browser can GET (spec §63). */
  createDownloadUrl(
    ref: Pick<FileRef, 'storageKey' | 'fileName' | 'mimeType'>,
    ttlSec?: number,
    opts?: DownloadUrlOptions,
  ): Promise<string>;
  /** Permanent, unsigned URL for assets meant to be public (e.g. workspace logos). */
  getPublicUrl(key: string): string;
  /** Fetch the raw bytes (used server-side by the resume parser). */
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export type { FileRef };
