"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FilterButton from "./FilterButton";
import ActiveFilterBadge from "./ActiveFilterBadge";
import { SignInButton } from "./SignInButton";
import { CreatePostButton } from "./CreatePostButton";
import type { PostMetadata } from "../utils/postMetadata";

const HeaderButtons: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdminPage = pathname.startsWith("/admin");

  const [isAdmin, setIsAdmin] = useState(false);
  const [postMetadata, setPostMetadata] = useState<PostMetadata | null>(null);

  const dateFilter = searchParams.get("date_filter") || "";

  useEffect(() => {
    if (isAdminPage) return;

    let cancelled = false;

    fetch('/api/auth/status', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (!cancelled) setIsAdmin(Boolean(data?.authenticated)); })
      .catch(() => { });

    fetch('/api/post-metadata')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setPostMetadata(data as PostMetadata); })
      .catch(() => { });

    return () => { cancelled = true; };
  }, [isAdminPage]);

  if (isAdminPage) return null;

  const handleSelectDate = (dateString: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateString) {
      params.set("date_filter", dateString);
    } else {
      params.delete("date_filter");
    }
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
    <div className="flex items-center justify-center sm:justify-end sm:ml-auto gap-2 flex-wrap">
      {postMetadata && (
        <FilterButton
          onSelect={handleSelectDate}
          initialValue={dateFilter}
          postMetadata={postMetadata}
        />
      )}
      {dateFilter && (
        <ActiveFilterBadge value={dateFilter} onClear={handleClearFilter} />
      )}
      {isAdmin ? <CreatePostButton /> : <SignInButton />}
    </div>
  );
};

export { HeaderButtons };
