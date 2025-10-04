"use client";

import { useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import DateFilterPopover from "./DateFilterPopover";
import { PostMetadata } from "../utils/postMetadata";

interface FilterButtonProps {
  onSelect: (dateString: string) => void;
  initialValue?: string;
  postMetadata: PostMetadata;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onSelect, initialValue, postMetadata }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        title="Filter posts"
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full border border-transparent bg-white p-2 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onMouseDown={e => {
          // Prevent the global popover listener from closing immediately while still allowing focus
          e.stopPropagation();
        }}
        onClick={() => setOpen(v => !v)}
      >
        <CalendarDaysIcon className="h-5 w-5" />
      </button>
      {open && (
        <DateFilterPopover
          onClose={() => setOpen(false)}
          onSelect={onSelect}
          initialValue={initialValue}
          postMetadata={postMetadata}
        />
      )}
    </div>
  );
};

export default FilterButton;
