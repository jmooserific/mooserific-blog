import React from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";


interface PaginationProps {
  currentPage: number;
  totalPages: number;
  dateFilter?: string;
}

export default function Pagination({ currentPage, totalPages, dateFilter }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (dateFilter) params.set("date_filter", dateFilter);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  };

  return (
    <nav className="flex justify-center my-8 gap-2">
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4 inline-block" /> Previous
        </Link>
      )}
      <span className="px-3 py-1 text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          Next <ArrowRightIcon className="h-4 w-4 inline-block" />
        </Link>
      )}
    </nav>
  );
}
