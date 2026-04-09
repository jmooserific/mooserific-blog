import { NextRequest } from 'next/server';
import { listPosts, createPost } from '@/lib/db';
import type { PhotoAsset } from '@/lib/types';

function normalizePhoto(p: unknown): PhotoAsset {
  if (typeof p === 'string') return { url: p, width: 800, height: 600 };
  if (p && typeof p === 'object' && 'url' in p) return p as PhotoAsset;
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
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return new Response('Invalid request body', { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const rawPhotos: unknown[] = Array.isArray(b.photos) ? b.photos : [];
    const rawVideos: unknown[] = Array.isArray(b.videos) ? b.videos : [];

    if (rawPhotos.length === 0 && rawVideos.length === 0) {
      return new Response('At least one photo or video is required', { status: 400 });
    }
    // Normalize photos: if array of strings convert to objects with placeholder dims
    const photos = rawPhotos.map(normalizePhoto);
    const videos = rawVideos.filter((v): v is string => typeof v === 'string');
    const author = req.headers.get('x-auth-user') || (typeof b.author === 'string' ? b.author : undefined);
    let date: string | undefined;
    if (typeof b.date === 'string') {
      const d = new Date(b.date);
      if (isNaN(d.getTime())) {
        return new Response('Invalid date format', { status: 400 });
      }
      date = d.toISOString();
    }
    const post = await createPost({
      id: typeof b.id === 'string' ? b.id : undefined,
      photos,
      videos,
      description: typeof b.description === 'string' ? b.description : undefined,
      author,
      date,
    });
    return Response.json(post, { status: 201 });
  } catch (e: unknown) {
    console.error('POST /api/posts error', e);
    return new Response('Internal server error', { status: 500 });
  }
}
