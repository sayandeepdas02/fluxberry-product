import type { FileRef } from '@fluxberry/shared';

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
  fileName: string;
}

/** Provider-agnostic object storage (spec §127). Files never live in Mongo. */
export interface StorageProvider {
  readonly name: string;
  upload(input: UploadInput): Promise<FileRef>;
  /** Short-lived signed URL the browser can GET (spec §63). */
  createDownloadUrl(
    ref: Pick<FileRef, 'storageKey' | 'fileName' | 'mimeType'>,
    ttlSec?: number,
  ): Promise<string>;
  /** Fetch the raw bytes (used server-side by the resume parser). */
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export type { FileRef };
