"use client";

import { useSearchParams, useRouter } from "next/navigation";
import FilterButton from "./FilterButton";
import ActiveFilterBadge from "./ActiveFilterBadge";
import PostCard, { Post } from "./PostCard";
import { matchesDateFilter } from "../utils/dateFilter";

interface PostListClientProps {
  posts: Post[];
}

const PostListClient: React.FC<PostListClientProps> = ({ posts }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateFilter = searchParams.get("date_filter") || "";

  const filteredPosts = dateFilter
    ? posts.filter((post) => matchesDateFilter(post.date, dateFilter))
    : posts;

  const handleSelectDate = (dateString: string) => {
    const params = new URLSearchParams(window.location.search);
    if (dateString) {
      params.set("date_filter", dateString);
    } else {
      params.delete("date_filter");
    }
    router.replace("?" + params.toString(), { scroll: false });
  };

  const handleClearFilter = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("date_filter");
    router.replace("?" + params.toString(), { scroll: false });
  };

  return (
    <main>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <FilterButton onSelect={handleSelectDate} initialValue={dateFilter} />
          {dateFilter && (
            <ActiveFilterBadge value={dateFilter} onClear={handleClearFilter} />
          )}
        </div>
        {filteredPosts.length === 0 ? (
          <div className="text-center text-gray-500 py-12 text-lg">No posts found for this date.</div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))
        )}
      </div>
    </main>
  );
};

export default PostListClient;
