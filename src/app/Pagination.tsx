import React from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";


interface PaginationProps {
  nextCursor?: string; // date of last item in current page (for older)
  prevCursor?: string; // date of first item in current page (for newer)
  dateFilter?: string;
}

export default function Pagination({ nextCursor, prevCursor, dateFilter }: PaginationProps) {
  if (!nextCursor && !prevCursor) return null;

  const buildUrl = (opts: { before?: string; after?: string }) => {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.after) params.set("after", opts.after);
    if (dateFilter) params.set("date_filter", dateFilter);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  };

  return (
    <nav className="flex justify-center my-8 gap-2">
      {prevCursor && (
        <Link
          href={buildUrl({ after: prevCursor })}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4 inline-block" /> Newer
        </Link>
      )}
      {nextCursor && (
        <Link
          href={buildUrl({ before: nextCursor })}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          Older <ArrowRightIcon className="h-4 w-4 inline-block" />
        </Link>
      )}
    </nav>
  );
}
