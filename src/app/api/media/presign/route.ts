import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { buildObjectKey, buildPhotoKeys, getPresignedPutUrl, getPublicUrl } from '@/lib/r2';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = env().MAX_FILE_BYTES;
const MAX_IMAGE_BYTES = env().MAX_IMAGE_BYTES;

function isAllowedType(t: string) {
  return t.startsWith('image/') || t === 'video/mp4' || t === 'video/quicktime' || t === 'video/webm';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
  const filename: string | undefined = body.filename;
  const contentType: string | undefined = body.contentType;
  const size: number | undefined = body.size;
  const folderId: string | undefined = body.folderId;
  const requestedKind: string | undefined = body.kind;

    if (!filename || !contentType || typeof size !== 'number') {
      return NextResponse.json({ error: 'Missing filename/contentType/size' }, { status: 400 });
    }
    if (!isAllowedType(contentType)) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

  const groupId = folderId || randomUUID();
  const kind: 'photo' | 'video' = requestedKind === 'video' || (contentType?.startsWith('video/') ?? false) ? 'video' : 'photo';
  // Photos are buffered into memory for Sharp, so they get the tighter image cap; videos
  // stream straight to R2 and only need the overall file ceiling. This is an early reject
  // on the *declared* size — the authoritative check is on the actual object in /process.
  const maxBytes = kind === 'photo' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (size > maxBytes) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }
  // Photos use the uuid-namespaced original key so the process route can derive the
  // variant base key. Videos keep the flat key (no server-side processing).
  const key = kind === 'photo' ? buildPhotoKeys(groupId, filename).originalKey : buildObjectKey(filename, groupId, kind);
  // 1 hour: long enough for a large file on a slow mobile link to finish a direct PUT.
  const EXPIRES_IN = 3600;
    const uploadUrl = await getPresignedPutUrl({ key, contentType, expiresIn: EXPIRES_IN });
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      key,
      uploadUrl,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
      publicUrl,
  folderId: groupId,
  kind,
      expiresIn: EXPIRES_IN,
      maxBytes,
    });
  } catch (err: unknown) {
    console.error('presign error', err);
    return NextResponse.json({ error: 'Failed to create presigned URL' }, { status: 500 });
  }
}
