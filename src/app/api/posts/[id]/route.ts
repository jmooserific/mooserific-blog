import { getPost, updatePost, deletePost } from '@/lib/db';
import type { PhotoAsset } from '@/lib/types';

function normalizePhoto(p: unknown): PhotoAsset {
  if (typeof p === 'string') return { url: p, width: 800, height: 600 };
  if (p && typeof p === 'object' && 'url' in p) {
    const obj = p as Record<string, unknown>;
    return {
      url: String(obj.url),
      width: typeof obj.width === 'number' ? obj.width : 800,
      height: typeof obj.height === 'number' ? obj.height : 600,
      ...(typeof obj.originalUrl === 'string' ? { originalUrl: obj.originalUrl } : {}),
      ...(typeof obj.originalContentType === 'string' ? { originalContentType: obj.originalContentType } : {}),
    };
  }
  return { url: String(p), width: 800, height: 600 };
}

// Dynamic route params must be awaited in App Router API routes.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: unknown) {
    console.error('GET /api/posts/[id] error', e);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return new Response('Invalid request body', { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const photos = Array.isArray(b.photos) ? b.photos.map(normalizePhoto) : undefined;
    const videos = Array.isArray(b.videos)
      ? b.videos.filter((v): v is string => typeof v === 'string')
      : undefined;
    let date: string | undefined;
    if (typeof b.date === 'string') {
      const parsed = new Date(b.date);
      if (Number.isNaN(parsed.getTime())) {
        return new Response('Invalid date format', { status: 400 });
      }
      date = parsed.toISOString();
    }
    const description = typeof b.description === 'string' ? b.description : undefined;
    const post = await updatePost(id, { description, photos, videos, date });
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: unknown) {
    console.error('PUT /api/posts/[id] error', e);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deletePost(id);
    return new Response(ok ? 'Deleted' : 'Not found', { status: ok ? 200 : 404 });
  } catch (e: unknown) {
    console.error('DELETE /api/posts/[id] error', e);
    return new Response('Internal server error', { status: 500 });
  }
}
