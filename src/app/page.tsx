
import { Suspense } from "react";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "./Pagination";
import { listPosts } from '@/lib/db';
import { getPostMetadata } from '../utils/postMetadata';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 10;

interface HomePageProps {
  searchParams: Promise<{ before?: string; after?: string; date_filter?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const dateFilter = params.date_filter || "";
  const before = params.before || undefined;
  const after = params.after || undefined;

  const rows = await listPosts({ limit: POSTS_PER_PAGE, before, after, dateFilter: dateFilter || undefined });
  const posts: Post[] = rows.map(r => ({
    date: r.date,
    author: r.author || '',
    caption: r.description || '',
    photos: (r.photos || []).map(p => ({ filename: p.url, width: p.width, height: p.height })),
    slug: r.id,
    videos: r.videos
  }));

  const postMetadata = await getPostMetadata();

  // Determine cursors for pagination controls
  const nextCursor = posts.length > 0 ? posts[posts.length - 1].date : undefined;
  const prevCursor = posts.length > 0 ? posts[0].date : undefined;

  return (
    <>
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostListClient posts={posts} postMetadata={postMetadata} />
      </Suspense>
      <Pagination 
        dateFilter={dateFilter}
        nextCursor={nextCursor}
        prevCursor={prevCursor}
      />
    </>
  );
}
