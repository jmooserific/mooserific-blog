import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processImageFromR2 } from '@/lib/image-processing';
import { ObjectTooLargeError } from '@/lib/r2';

export const runtime = 'nodejs';
// Hobby plan caps function duration at 60s. Reading the original back from R2 plus
// generating 5 Sharp variants is a few seconds, so this is comfortable headroom.
export const maxDuration = 60;

// Only accept keys our presign route hands out: `[dev/]photos/<postId>/<uuid>/<filename>`.
// Guards against the route being pointed at arbitrary bucket objects.
const PHOTO_KEY_RE = /^(dev\/)?photos\/[^/]+\/[0-9a-f-]{36}\/[^/]+$/i;

const processSchema = z.object({
  key: z.string().regex(PHOTO_KEY_RE),
  contentType: z.string().startsWith('image/'),
});

export async function POST(req: NextRequest) {
  try {
    const json: unknown = await req.json().catch(() => undefined);
    const parsed = processSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await processImageFromR2(parsed.data.key, parsed.data.contentType);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof ObjectTooLargeError) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }
    console.error('process error', err);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
