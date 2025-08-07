
import fs from "fs";
import path from "path";
import { Suspense } from "react";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "./Pagination";
import { matchesDateFilter } from "../utils/dateFilter";
import { getPostMetadata } from "../utils/postMetadata";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 10;
const postsDir = path.join(process.cwd(), "posts");

function getPosts(): Post[] {
  // Handle case where posts directory doesn't exist (e.g., during build)
  if (!fs.existsSync(postsDir)) {
    return [];
  }
  
  const postFolders = fs.readdirSync(postsDir);
  return (postFolders
    .map((folder) => {
      const postPath = path.join(postsDir, folder, "post.json");
      if (fs.existsSync(postPath)) {
        const post = JSON.parse(fs.readFileSync(postPath, "utf-8"));
        return { ...post, slug: folder } as Post;
      }
      return null;
    })
    .filter(Boolean) as Post[])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

interface HomePageProps {
  searchParams: Promise<{ page?: string; date_filter?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const allPosts = getPosts();
  const postMetadata = getPostMetadata();
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
