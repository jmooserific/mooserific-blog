"use client";

import { useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { DateFilterPopover } from "./DateFilterPopover";
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
        title="Filter posts by date"
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-transparent p-2 text-[#845A2C] transition-colors hover:bg-[#845A2C]/6 focus:outline-none focus:ring-2 focus:ring-[#845A2C] focus:ring-offset-2"
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

export { FilterButton };
