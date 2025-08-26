"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FilterButton from "./FilterButton";
import ActiveFilterBadge from "./ActiveFilterBadge";
import PostCard, { Post } from "./PostCard";
import { PostMetadata } from "../utils/postMetadata";
import { LockClosedIcon, PlusIcon } from "@heroicons/react/24/outline";

interface PostListClientProps {
  posts: Post[];
  postMetadata: PostMetadata;
}

const PostListClient: React.FC<PostListClientProps> = ({ posts, postMetadata }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateFilter = searchParams.get("date_filter") || "";
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/status', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => {
        if (!cancelled) setIsAdmin(Boolean(data?.authenticated));
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  const handleSelectDate = (dateString: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateString) {
      params.set("date_filter", dateString);
    } else {
      params.delete("date_filter");
    }
    // Reset cursors when changing filter
    params.delete("before");
    params.delete("after");
    router.replace("?" + params.toString(), { scroll: false });
  };

  const handleClearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date_filter");
    params.delete("before");
    params.delete("after");
    router.replace("?" + params.toString(), { scroll: false });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <FilterButton onSelect={handleSelectDate} initialValue={dateFilter} postMetadata={postMetadata} />
        {dateFilter && (
          <ActiveFilterBadge value={dateFilter} onClear={handleClearFilter} />
        )}
        <div className="ml-auto">
          {isAdmin ? (
            <a
              href="/admin"
              title="Create a post"
              className="inline-flex items-center p-1 text-gray-600 hover:text-gray-900"
            >
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={`/api/auth/login?redirect=${encodeURIComponent('/')}`}
              title="Sign in"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-12 text-lg">
          {dateFilter ? `No posts found for ${dateFilter}.` : "No posts found."}
        </div>
      ) : (
        posts.map((post, idx) => (
          <PostCard
            key={post.slug}
            post={post}
            isAdmin={isAdmin}
            isFirstPost={idx === 0}
            onDeleted={() => router.refresh()}
          />
        ))
      )}
    </div>
  );
};

export default PostListClient;
