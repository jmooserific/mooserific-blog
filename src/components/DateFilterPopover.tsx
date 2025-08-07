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
    return postMetadata.availableYears[0] || new Date().getFullYear();
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
      className="absolute left-4 top-4 z-50 bg-white rounded-xl shadow-lg border border-gray-200 w-80"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Year Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button
          onClick={handlePreviousYear}
          disabled={!canGoPrevious}
          className={`p-2 rounded-md transition-colors ${
            canGoPrevious
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleYearClick}
          className="text-2xl font-semibold text-gray-800 hover:text-blue-600 transition-colors px-4 py-2 rounded-md hover:bg-blue-50"
          title={`Filter by ${currentYear} (${getPostCount(currentYear.toString())} posts)`}
        >
          {currentYear}
        </button>
        
        <button
          onClick={handleNextYear}
          disabled={!canGoNext}
          className={`p-2 rounded-md transition-colors ${
            canGoNext
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
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
                  p-3 rounded-lg text-sm font-medium transition-all duration-150
                  ${isDisabled
                    ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200'
                  }
                `}
                title={isDisabled ? 'No posts this month' : `${month} ${currentYear} (${postCount} posts)`}
              >
                <div>{month}</div>
                {!isDisabled && postCount > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {postCount} post{postCount !== 1 ? 's' : ''}
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

export default DateFilterPopover;
