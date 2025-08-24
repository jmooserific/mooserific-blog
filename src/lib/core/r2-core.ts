import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_R2_VARS = [
  'R2_BUCKET_NAME',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY'
];

export function getR2Client() {
  for (const v of REQUIRED_R2_VARS) {
    if (!process.env[v]) throw new Error(`Missing env var ${v}`);
  }
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    },
    forcePathStyle: true
  });
}

export function buildObjectKey(originalName: string, postId: string, kind: 'photo' | 'video' = 'photo') {
  const prefix = process.env.ENVIRONMENT === 'development' ? 'dev/' : '';
  const folder = kind === 'video' ? 'videos' : 'photos';
  return `${prefix}${folder}/${postId}/${originalName}`;
}

export async function putObject(opts: { key: string; contentType: string; body: Buffer | Uint8Array | Blob | string }) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    Body: opts.body as any,
    ContentType: opts.contentType
  }));
  return getPublicUrl(opts.key);
}

export function getPublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  return `/${key}`; // fallback relative path
}

export async function getPresignedPutUrl(opts: { key: string; contentType: string; expiresIn?: number }) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType
  });
  const url = await getSignedUrl(client, cmd, { expiresIn: opts.expiresIn ?? 900 });
  return url;
}
