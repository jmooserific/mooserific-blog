
import { Suspense } from "react";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "./Pagination";
import { listPosts } from '@/lib/db';
import { getPostMetadata } from '../utils/postMetadata';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 15;

interface HomePageProps {
  searchParams: Promise<{ before?: string; after?: string; date_filter?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const dateFilter = params.date_filter || "";
  const before = params.before || undefined;
  const after = params.after || undefined;

  // Fetch page
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
  let nextCursor: string | undefined = undefined; // older
  let prevCursor: string | undefined = undefined; // newer
  if (posts.length > 0) {
    const first = posts[0].date;
    const last = posts[posts.length - 1].date;
    // Probe for newer and older existence within the selected date filter
    const [newerProbe, olderProbe] = await Promise.all([
      listPosts({ limit: 1, after: first, dateFilter: dateFilter || undefined }),
      listPosts({ limit: 1, before: last, dateFilter: dateFilter || undefined })
    ]);
    if (newerProbe.length > 0) prevCursor = first;
    if (olderProbe.length > 0) nextCursor = last;
  }

  return (
    <>
      <Suspense fallback={<div className="text-center text-gray-500 py-12 text-lg">Loading posts...</div>}>
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
