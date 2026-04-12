"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PostCard, Post } from "./PostCard";

interface PostListClientProps {
  posts: Post[];
  isAdmin: boolean;
}

const PostListClient: React.FC<PostListClientProps> = ({ posts, isAdmin }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateFilter = searchParams.get("date_filter") || "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-12 text-lg">
          {dateFilter ? `No posts found for ${dateFilter}.` : "No posts found."}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.slug}
            post={post}
            isAdmin={isAdmin}
            onDeleted={() => router.refresh()}
          />
        ))
      )}
    </div>
  );
};

export { PostListClient };
