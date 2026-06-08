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

/** Raised when an R2 object exceeds the caller-supplied byte ceiling. */
export class ObjectTooLargeError extends Error {
  constructor(public readonly key: string, public readonly size: number, public readonly maxBytes: number) {
    super(`R2 object ${key} is ${size} bytes, exceeds limit ${maxBytes}`);
    this.name = 'ObjectTooLargeError';
  }
}

/**
 * Reduce a client-supplied value to a single safe path segment: drop any directory
 * parts and traversal, and keep only filename-safe characters. Prevents a `/` or `..`
 * in a filename/folderId from injecting extra key segments (which would also desync
 * the presign key from the process route's expected shape).
 */
export function sanitizeKeySegment(value: string): string {
  const base = value.split(/[/\\]/).pop() ?? '';
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned || 'file';
}

export function buildObjectKey(originalName: string, postId: string, kind: 'photo' | 'video' = 'photo') {
  const prefix = env().ENVIRONMENT === 'development' ? 'dev/' : '';
  const folder = kind === 'video' ? 'videos' : 'photos';
  return `${prefix}${folder}/${sanitizeKeySegment(postId)}/${sanitizeKeySegment(originalName)}`;
}

/**
 * Build the uuid-namespaced keys for a photo. The original is stored under
 * `<base>/<filename>` and the WebP variants share the `<base>-<width>w.webp` prefix.
 * Shared by the presign route (which signs a PUT for `originalKey`) and the process
 * route (which derives `baseKey` to write variants), so both agree on the layout.
 */
export function buildPhotoKeys(postId: string, originalFilename: string): { baseKey: string; originalKey: string } {
  const prefix = env().ENVIRONMENT === 'development' ? 'dev/' : '';
  const baseKey = `${prefix}photos/${sanitizeKeySegment(postId)}/${randomUUID()}`;
  return { baseKey, originalKey: `${baseKey}/${sanitizeKeySegment(originalFilename)}` };
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

export async function getObject(key: string, opts: { maxBytes?: number } = {}): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(new GetObjectCommand({
    Bucket: env().R2_BUCKET_NAME,
    Key: key,
  }));
  if (!res.Body) throw new Error(`R2 object not found: ${key}`);
  // Enforce the ceiling from the response metadata before buffering the body into memory.
  // The presigned PUT can't constrain upload size, so this is where an oversized object
  // (declared small, uploaded huge) is rejected instead of being read into a Buffer.
  if (opts.maxBytes != null && typeof res.ContentLength === 'number' && res.ContentLength > opts.maxBytes) {
    throw new ObjectTooLargeError(key, res.ContentLength, opts.maxBytes);
  }
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
