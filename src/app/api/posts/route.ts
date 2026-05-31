import { NextRequest } from 'next/server';
import { z } from 'zod';
import { listPosts, createPost, SlugConflictError } from '@/lib/db';
import type { PhotoAsset } from '@/lib/types';
import { isValidSlug } from '@/utils/slug';

// Shape validation at the boundary; photos/videos are validated loosely here and
// coerced by normalizePhoto, since they accept both string and object forms.
const createPostSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const before = searchParams.get('before') || undefined;
  const after = searchParams.get('after') || undefined;
  const dateFilter = searchParams.get('date_filter') || undefined;
  const limit = limitParam ? parseInt(limitParam) : undefined;
  try {
    const posts = await listPosts({ limit, before, after, dateFilter });
    const nextCursor = posts.length > 0 ? posts[posts.length - 1].date : undefined; // for older page
    const prevCursor = posts.length > 0 ? posts[0].date : undefined; // for newer page
    return Response.json({ posts, nextCursor, prevCursor });
  } catch (e: unknown) {
    console.error('GET /api/posts error', e);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json: unknown = await req.json().catch(() => undefined);
    const parsed = createPostSchema.safeParse(json);
    if (!parsed.success) {
      return new Response('Invalid request body', { status: 400 });
    }
    const b = parsed.data;
    const rawPhotos: unknown[] = b.photos ?? [];
    const rawVideos: unknown[] = b.videos ?? [];

    if (rawPhotos.length === 0 && rawVideos.length === 0) {
      return new Response('At least one photo or video is required', { status: 400 });
    }
    if (b.slug !== undefined && !isValidSlug(b.slug)) {
      return new Response('Invalid permalink: use lowercase letters, numbers, and hyphens', { status: 400 });
    }
    // Normalize photos: if array of strings convert to objects with placeholder dims
    const photos = rawPhotos.map(normalizePhoto);
    const videos = rawVideos.filter((v): v is string => typeof v === 'string');
    const author = req.headers.get('x-auth-user') || b.author;
    let date: string | undefined;
    if (b.date !== undefined) {
      const d = new Date(b.date);
      if (isNaN(d.getTime())) {
        return new Response('Invalid date format', { status: 400 });
      }
      date = d.toISOString();
    }
    const post = await createPost({
      id: b.id,
      slug: b.slug,
      photos,
      videos,
      description: b.description,
      author,
      date,
    });
    return Response.json(post, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SlugConflictError) {
      return new Response('That permalink is already in use', { status: 409 });
    }
    console.error('POST /api/posts error', e);
    return new Response('Internal server error', { status: 500 });
  }
}
