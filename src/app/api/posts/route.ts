import { NextRequest } from 'next/server';
import { listPosts, createPost } from '@/lib/db';

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
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhotos: any[] = Array.isArray(body.photos) ? body.photos : [];
    const rawVideos: any[] = Array.isArray(body.videos) ? body.videos : [];

    if (rawPhotos.length === 0 && rawVideos.length === 0) {
      return new Response('At least one photo or video is required', { status: 400 });
    }
    // Normalize photos: if array of strings convert to objects with placeholder dims
    const photos = rawPhotos.map((p: any) => typeof p === 'string' ? { url: p, width: 800, height: 600 } : p);
    const author = req.headers.get('x-auth-user') || body.author || undefined;
    const post = await createPost({
      id: body.id,
      photos,
      videos: rawVideos,
      description: body.description,
      author
    });
    return Response.json(post, { status: 201 });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
