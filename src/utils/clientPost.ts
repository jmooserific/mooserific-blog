import type { Post as DbPost } from '@/lib/types';
import type { Post as ClientPost } from '@/components/PostCard';

/**
 * Map a stored post to the shape the feed/card renders. Shared by the homepage
 * SSR pass and the on-demand batch route so the two never drift.
 */
export function toClientPost(r: DbPost): ClientPost {
  return {
    id: r.id,
    date: r.date,
    author: r.author || '',
    caption: r.description || '',
    photos: (r.photos || []).map((p) => ({ filename: p.url, width: p.width, height: p.height })),
    slug: r.slug,
    videos: r.videos,
  };
}
