"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PostMetadata } from "../utils/postMetadata";

interface DateFilterPopoverProps {
  onClose: () => void;
  onSelect: (dateString: string) => void;
  initialValue?: string;
  postMetadata: PostMetadata;
}

const DateFilterPopover: React.FC<DateFilterPopoverProps> = ({ onClose, onSelect, initialValue, postMetadata }) => {
  // Parse initial value to extract year and month
  const getInitialYear = () => {
    if (initialValue && /^\d{4}/.test(initialValue)) {
      const year = parseInt(initialValue.substring(0, 4));
      return postMetadata.availableYears.includes(year) ? year : postMetadata.availableYears[0];
    }
    // Avoid using local current year which can cause hydration diffs.
    // Fall back to latest year in metadata, or a fixed constant (1970) if none.
    return postMetadata.availableYears[0] || 1970;
  };

  const [currentYear, setCurrentYear] = useState(getInitialYear());
  const ref = useRef<HTMLDivElement>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handlePreviousYear = () => {
    const currentIndex = postMetadata.availableYears.indexOf(currentYear);
    if (currentIndex < postMetadata.availableYears.length - 1) {
      setCurrentYear(postMetadata.availableYears[currentIndex + 1]);
    }
  };

  const handleNextYear = () => {
    const currentIndex = postMetadata.availableYears.indexOf(currentYear);
    if (currentIndex > 0) {
      setCurrentYear(postMetadata.availableYears[currentIndex - 1]);
    }
  };

  const handleYearClick = () => {
    onSelect(currentYear.toString());
    onClose();
  };

  const handleMonthClick = (monthIndex: number) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    onSelect(`${currentYear}-${monthStr}`);
    onClose();
  };

  const isMonthDisabled = (monthIndex: number) => {
    return !postMetadata.monthsWithPosts[currentYear]?.includes(monthIndex + 1);
  };

  const getPostCount = (yearOrMonth: string) => {
    return postMetadata.postCounts[yearOrMonth] || 0;
  };

  const currentIndex = postMetadata.availableYears.indexOf(currentYear);
  const canGoPrevious = currentIndex < postMetadata.availableYears.length - 1;
  const canGoNext = currentIndex > 0;

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white rounded-[10px] shadow-md border border-accent/15 w-80 left-1/2 -translate-x-1/2 top-full mt-1 sm:left-auto sm:translate-x-0 sm:right-0 sm:top-1/2 sm:mt-0"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Year Navigation Header */}
      <div className="flex items-center justify-between p-3 border-b border-accent/10">
        <button
          onClick={handlePreviousYear}
          disabled={!canGoPrevious}
          className={`p-2 rounded-lg transition-colors ${canGoPrevious
              ? 'text-accent hover:bg-accent/6'
              : 'text-accent/25 cursor-not-allowed'
            }`}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <button
          onClick={handleYearClick}
          className="text-2xl font-semibold text-accent transition-colors px-4 py-1 rounded-lg hover:bg-accent/6"
          title={`Filter by ${currentYear} (${getPostCount(currentYear.toString())} posts)`}
        >
          {currentYear}
        </button>

        <button
          onClick={handleNextYear}
          disabled={!canGoNext}
          className={`p-2 rounded-lg transition-colors ${canGoNext
              ? 'text-accent hover:bg-accent/6'
              : 'text-accent/25 cursor-not-allowed'
            }`}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1">
          {monthNames.map((month, index) => {
            const isDisabled = isMonthDisabled(index);
            const monthKey = `${currentYear}-${(index + 1).toString().padStart(2, '0')}`;
            const postCount = getPostCount(monthKey);

            return (
              <button
                key={month}
                onClick={() => !isDisabled && handleMonthClick(index)}
                disabled={isDisabled}
                className={`
                  relative p-3 rounded-lg text-sm font-medium transition-colors
                  ${isDisabled
                    ? 'text-accent/25 cursor-not-allowed'
                    : 'text-accent hover:bg-accent/6'
                  }
                `}
                title={isDisabled ? 'No posts this month' : `${month} ${currentYear} (${postCount} posts)`}
              >
                <div>{month}</div>
                {!isDisabled && postCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 bg-accent/10 text-accent text-xs font-semibold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
                    {postCount > 99 ? '99+' : postCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { DateFilterPopover };
