import fs from "fs";
import path from "path";
import PostListClient from "@/components/PostListClient";
import { Post } from "@/components/PostCard";
import Pagination from "../../Pagination";
import { notFound } from "next/navigation";

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

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) notFound();
  const allPosts = getPosts().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (pageNum > totalPages && totalPages !== 0) notFound();
  const posts = allPosts.slice((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE);
  return (
    <>
      <PostListClient posts={posts} />
      <Pagination currentPage={pageNum} totalPages={totalPages} />
    </>
  );
}
