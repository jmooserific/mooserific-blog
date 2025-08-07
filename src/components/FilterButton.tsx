"use client";

import { useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
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
        title="Filter posts"
        onMouseDown={e => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-600" />
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
