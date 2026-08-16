import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FileRef } from '@fluxberry/shared';
import type { StorageProvider, UploadInput } from './types';
import { config } from '../../config/env';

/** S3-compatible storage — works for AWS S3 and Cloudflare R2 (via endpoint). */
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private client: S3Client;
  private bucket: string;

  constructor() {
    const s = config.providers.storage;
    this.bucket = s.bucket;
    this.client = new S3Client({
      region: s.region || 'auto',
      endpoint: s.endpoint || undefined,
      forcePathStyle: Boolean(s.endpoint), // needed for R2 / MinIO
      credentials: { accessKeyId: s.accessKey, secretAccessKey: s.secretKey },
    });
  }

  async upload(input: UploadInput): Promise<FileRef> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
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
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: ref.storageKey,
        ResponseContentDisposition: `inline; filename="${ref.fileName}"`,
      }),
      { expiresIn: ttlSec },
    );
  }

  async download(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
