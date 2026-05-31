"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { PostCard, Post } from "@/components/PostCard";

interface SinglePostViewProps {
  post: Post;
  isAdmin: boolean;
}

/**
 * Client wrapper for the permalink page: renders a single post and, if an admin
 * deletes it, returns to the home feed (since the post's own URL no longer exists).
 */
const SinglePostView: React.FC<SinglePostViewProps> = ({ post, isAdmin }) => {
  const router = useRouter();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start rounded-[10px] border border-transparent bg-transparent px-2 py-1.5 text-sm text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span>Back to posts</span>
        </Link>
      </nav>
      <PostCard post={post} isAdmin={isAdmin} isAboveFold onDeleted={() => router.replace("/")} />
    </div>
  );
};

export { SinglePostView };
