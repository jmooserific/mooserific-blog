import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPostsByIds } from '@/lib/db';
import { toClientPost } from '@/utils/clientPost';

// The feed fetches one batch of full posts at a time, so cap the count to keep
// a single request bounded. Ids come from the trusted post index, but we still
// validate shape and size at the boundary.
const MAX_BATCH = 60;
const idsSchema = z
  .string()
  .min(1)
  .transform((s) => s.split(',').map((p) => p.trim()).filter(Boolean))
  .pipe(z.array(z.string().min(1)).min(1).max(MAX_BATCH));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = idsSchema.safeParse(searchParams.get('ids') ?? '');
  if (!parsed.success) {
    return new Response('Invalid ids', { status: 400 });
  }
  try {
    const posts = await getPostsByIds(parsed.data);
    return Response.json({ posts: posts.map(toClientPost) });
  } catch (e: unknown) {
    console.error('GET /api/posts/batch error', e);
    return new Response('Internal server error', { status: 500 });
  }
}
