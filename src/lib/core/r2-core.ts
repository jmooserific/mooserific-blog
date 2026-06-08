import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../env';

export function getR2Client() {
  const e = env();
  return new S3Client({
    region: 'auto',
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

export function buildObjectKey(originalName: string, postId: string, kind: 'photo' | 'video' = 'photo') {
  const prefix = env().ENVIRONMENT === 'development' ? 'dev/' : '';
  const folder = kind === 'video' ? 'videos' : 'photos';
  return `${prefix}${folder}/${postId}/${originalName}`;
}

/**
 * Build the uuid-namespaced keys for a photo. The original is stored under
 * `<base>/<filename>` and the WebP variants share the `<base>-<width>w.webp` prefix.
 * Shared by the presign route (which signs a PUT for `originalKey`) and the process
 * route (which derives `baseKey` to write variants), so both agree on the layout.
 */
export function buildPhotoKeys(postId: string, originalFilename: string): { baseKey: string; originalKey: string } {
  const prefix = env().ENVIRONMENT === 'development' ? 'dev/' : '';
  const baseKey = `${prefix}photos/${postId}/${randomUUID()}`;
  return { baseKey, originalKey: `${baseKey}/${originalFilename}` };
}

/** Recover the variant base key from an original photo key (strip the trailing `/filename`). */
export function baseKeyFromOriginalKey(originalKey: string): string {
  return originalKey.slice(0, originalKey.lastIndexOf('/'));
}

export async function putObject(opts: { key: string; contentType: string; body: Buffer | Uint8Array | Blob | string }) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: env().R2_BUCKET_NAME,
    Key: opts.key,
    Body: opts.body as any,
    ContentType: opts.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return getPublicUrl(opts.key);
}

export async function getObject(key: string): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(new GetObjectCommand({
    Bucket: env().R2_BUCKET_NAME,
    Key: key,
  }));
  if (!res.Body) throw new Error(`R2 object not found: ${key}`);
  // The v3 SDK stream exposes transformToByteArray() in both Node and edge runtimes.
  const bytes = await (res.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes);
}

export function getPublicUrl(key: string) {
  const base = env().R2_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  return `/${key}`;
}

export async function getPresignedPutUrl(opts: { key: string; contentType: string; expiresIn?: number }) {
  const client = getR2Client();
  const cmd = new PutObjectCommand({
    Bucket: env().R2_BUCKET_NAME,
    Key: opts.key,
    ContentType: opts.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });
  return getSignedUrl(client, cmd, { expiresIn: opts.expiresIn ?? 900 });
}
