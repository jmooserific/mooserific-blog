import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
