"use client";

import { useSearchParams, useRouter } from "next/navigation";
import FilterButton from "./FilterButton";
import ActiveFilterBadge from "./ActiveFilterBadge";
import PostCard, { Post } from "./PostCard";

interface PostListClientProps {
  posts: Post[];
}

const PostListClient: React.FC<PostListClientProps> = ({ posts }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateFilter = searchParams.get("date_filter") || "";

  const handleSelectDate = (dateString: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateString) {
      params.set("date_filter", dateString);
    } else {
      params.delete("date_filter");
    }
    // Reset to first page when changing filter
    params.delete("page");
    router.replace("?" + params.toString(), { scroll: false });
  };

  const handleClearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date_filter");
    params.delete("page");
    router.replace("?" + params.toString(), { scroll: false });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <FilterButton onSelect={handleSelectDate} initialValue={dateFilter} />
        {dateFilter && (
          <ActiveFilterBadge value={dateFilter} onClear={handleClearFilter} />
        )}
      </div>
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-12 text-lg">
          {dateFilter ? `No posts found for ${dateFilter}.` : "No posts found."}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))
      )}
    </div>
  );
};

export default PostListClient;
