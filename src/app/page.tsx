// Homepage: lists latest posts

import fs from "fs";
import path from "path";
import PostCard, { Post } from "@/components/PostCard";

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
  const posts: Post[] = getPosts().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <main>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
