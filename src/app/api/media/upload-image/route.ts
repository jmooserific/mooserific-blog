import { NextRequest, NextResponse } from 'next/server';
import { processAndUploadImage } from '@/lib/image-processing';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 500 * 1024 * 1024);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const folderId = form.get('folderId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const postId = typeof folderId === 'string' && folderId ? folderId : crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { baseUrl, width, height } = await processAndUploadImage(buffer, postId);

    return NextResponse.json({ baseUrl, width, height, folderId: postId });
  } catch (err: unknown) {
    console.error('upload-image error', err);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
