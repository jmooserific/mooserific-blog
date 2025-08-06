
import fs from "fs";
import path from "path";
import { Suspense } from "react";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "./Pagination";

const POSTS_PER_PAGE = 10;
const postsDir = path.join(process.cwd(), "posts");

function getPosts(): Post[] {
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
    .filter(Boolean) as Post[]);
}

export default function HomePage() {
  const allPosts = getPosts().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  return (
    <>
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostListClient posts={posts} />
      </Suspense>
      <Pagination currentPage={1} totalPages={totalPages} />
    </>
  );
}
