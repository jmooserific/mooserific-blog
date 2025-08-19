
import { Suspense } from "react";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "./Pagination";
import { matchesDateFilter } from "../utils/dateFilter";
import { listPosts } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 10;

async function getPosts(): Promise<Post[]> {
  const rows = await listPosts({ limit: 500 }); // adjust as needed
  return rows.map(r => ({
    date: r.date,
    author: r.author || '',
    caption: r.description || '',
    photos: (r.photos || []).map(p => ({ filename: p.url, width: p.width, height: p.height })),
    slug: r.id,
    videos: r.videos
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildMetadata(posts: Post[]) {
  const availableYears = new Set<number>();
  const monthsWithPosts: { [year: number]: Set<number> } = {};
  const postCounts: { [yearMonth: string]: number } = {};
  posts.forEach(p => {
    const d = new Date(p.date);
    if (isNaN(d.getTime())) return;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    availableYears.add(year);
    if (!monthsWithPosts[year]) monthsWithPosts[year] = new Set();
    monthsWithPosts[year].add(month);
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    postCounts[ym] = (postCounts[ym] || 0) + 1;
    postCounts[year] = (postCounts[year] || 0) + 1;
  });
  return {
    availableYears: Array.from(availableYears).sort((a,b)=> b-a),
    monthsWithPosts: Object.fromEntries(
      Object.entries(monthsWithPosts).map(([y, set]) => [Number(y), Array.from(set).sort((a,b)=>a-b)])
    ),
    postCounts
  };
}

interface HomePageProps {
  searchParams: Promise<{ page?: string; date_filter?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const allPosts = await getPosts();
  const postMetadata = buildMetadata(allPosts);
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1");
  const dateFilter = params.date_filter || "";
  
  // Apply date filter first
  const filteredPosts = dateFilter
    ? allPosts.filter((post) => matchesDateFilter(post.date, dateFilter))
    : allPosts;
  
  // Then apply pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <>
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostListClient posts={paginatedPosts} postMetadata={postMetadata} />
      </Suspense>
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages}
        dateFilter={dateFilter}
      />
    </>
  );
}
