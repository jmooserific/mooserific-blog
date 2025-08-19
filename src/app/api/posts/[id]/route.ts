import { getPost, updatePost, deletePost } from '@/lib/db';

// Next.js will pass the params via the context object (second arg) but we keep it untyped here to avoid type mismatch.
export async function GET(_req: Request, context: any) {
  try {
    const id = context.params.id as string;
    const post = await getPost(id);
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function PUT(req: Request, context: any) {
  try {
    const id = context.params.id as string;
  const body = await req.json();
  const photos = Array.isArray(body.photos) ? body.photos.map((p: any) => typeof p === 'string' ? { url: p, width: 800, height: 600 } : p) : undefined;
  const post = await updatePost(id, { description: body.description, photos, videos: body.videos });
    if (!post) return new Response('Not found', { status: 404 });
    return Response.json(post);
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id = context.params.id as string;
    const ok = await deletePost(id);
    return new Response(ok ? 'Deleted' : 'Not found', { status: ok ? 200 : 404 });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
