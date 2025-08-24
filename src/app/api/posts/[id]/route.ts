import { getPost, updatePost, deletePost } from '@/lib/db';

// Dynamic route params must be awaited in App Router API routes.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const photos = Array.isArray(body.photos)
      ? body.photos.map((p: any) => (typeof p === 'string' ? { url: p, width: 800, height: 600 } : p))
      : undefined;
    const post = await updatePost(id, { description: body.description, photos, videos: body.videos });
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deletePost(id);
    return new Response(ok ? 'Deleted' : 'Not found', { status: ok ? 200 : 404 });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
