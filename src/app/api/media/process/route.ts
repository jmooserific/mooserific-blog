import { NextRequest, NextResponse } from 'next/server';
import { processImageFromR2 } from '@/lib/image-processing';

export const runtime = 'nodejs';
// Hobby plan caps function duration at 60s. Reading the original back from R2 plus
// generating 5 Sharp variants is a few seconds, so this is comfortable headroom.
export const maxDuration = 60;

// Only accept keys our presign route hands out: `[dev/]photos/<postId>/<uuid>/<filename>`.
// Guards against the route being pointed at arbitrary bucket objects.
const PHOTO_KEY_RE = /^(dev\/)?photos\/[^/]+\/[0-9a-f-]{36}\/[^/]+$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key: unknown = body.key;
    const contentType: unknown = body.contentType;

    if (typeof key !== 'string' || !PHOTO_KEY_RE.test(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    const result = await processImageFromR2(key, contentType);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('process error', err);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
