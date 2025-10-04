import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { buildObjectKey, getPresignedPutUrl, getPublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 500 * 1024 * 1024); // 500 MB default

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
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

  const groupId = folderId || randomUUID();
  const kind: 'photo' | 'video' = requestedKind === 'video' || (contentType?.startsWith('video/') ?? false) ? 'video' : 'photo';
  const key = buildObjectKey(filename, groupId, kind);
    const uploadUrl = await getPresignedPutUrl({ key, contentType, expiresIn: 900 });
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      key,
      uploadUrl,
      headers: { 'Content-Type': contentType },
      publicUrl,
  folderId: groupId,
  kind,
      expiresIn: 900,
      maxBytes: MAX_FILE_BYTES,
    });
  } catch (err: any) {
    console.error('presign error', err);
    return NextResponse.json({ error: 'Failed to create presigned URL' }, { status: 500 });
  }
}
