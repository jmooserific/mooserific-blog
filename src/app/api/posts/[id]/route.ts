import { z } from 'zod';
import { getPost, updatePost, deletePost, SlugConflictError } from '@/lib/db';
import type { PhotoAsset } from '@/lib/types';
import { isValidSlug } from '@/utils/slug';

const updatePostSchema = z.object({
  slug: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  photos: z.array(z.unknown()).optional(),
  videos: z.array(z.unknown()).optional(),
});

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
    const json: unknown = await req.json().catch(() => undefined);
    const parsed = updatePostSchema.safeParse(json);
    if (!parsed.success) {
      return new Response('Invalid request body', { status: 400 });
    }
    const b = parsed.data;
    if (b.slug !== undefined && !isValidSlug(b.slug)) {
      return new Response('Invalid permalink: use lowercase letters, numbers, and hyphens', { status: 400 });
    }
    const photos = b.photos ? b.photos.map(normalizePhoto) : undefined;
    const videos = b.videos
      ? b.videos.filter((v): v is string => typeof v === 'string')
      : undefined;
    let date: string | undefined;
    if (b.date !== undefined) {
      const parsedDate = new Date(b.date);
      if (Number.isNaN(parsedDate.getTime())) {
        return new Response('Invalid date format', { status: 400 });
      }
      date = parsedDate.toISOString();
    }
    const post = await updatePost(id, { slug: b.slug, description: b.description, photos, videos, date });
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: unknown) {
    if (e instanceof SlugConflictError) {
      return new Response('That permalink is already in use', { status: 409 });
    }
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
