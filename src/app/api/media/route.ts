import { NextRequest } from 'next/server';
import { buildObjectKey, putObject } from '@/lib/r2';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files: File[] = [];
    form.forEach(value => {
      if (value instanceof File) files.push(value);
    });
    if (files.length === 0) return new Response('No files', { status: 400 });
    const postId = form.get('postId') as string || randomUUID();
  const urls: string[] = [];
    for (const file of files) {
      const key = buildObjectKey(file.name, postId);
      const arrayBuffer = await file.arrayBuffer();
      const url = await putObject({ key, contentType: file.type || 'application/octet-stream', body: Buffer.from(arrayBuffer) });
      urls.push(url);
    }
  return Response.json({ postId, urls });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
