import { NextRequest } from 'next/server';
import { listPosts, createPost } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const before = searchParams.get('before') || undefined;
  const limit = limitParam ? parseInt(limitParam) : undefined;
  try {
    const posts = await listPosts({ limit, before });
    return Response.json({ posts });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.photos) || body.photos.length === 0) {
      return new Response('photos array required', { status: 400 });
    }
    // Normalize: if array of strings convert to objects with placeholder dims
    const photos = body.photos.map((p: any) => typeof p === 'string' ? { url: p, width: 800, height: 600 } : p);
    const author = req.headers.get('x-auth-user') || body.author || undefined;
    const post = await createPost({
      id: body.id,
      photos,
      videos: body.videos,
      description: body.description,
      author
    });
    return Response.json(post, { status: 201 });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
