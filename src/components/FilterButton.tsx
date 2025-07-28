"use client";

import { useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import DateFilterPopover from "./DateFilterPopover";

interface FilterButtonProps {
  onSelect: (dateString: string) => void;
  initialValue?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onSelect, initialValue }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-4 top-4 z-50">
      <button
        className="bg-white border border-gray-300 rounded-full p-2 shadow hover:bg-gray-100 transition"
        aria-label="Filter posts by date"
        onClick={() => setOpen((v) => !v)}
      >
        <AdjustmentsHorizontalIcon className="h-6 w-6 text-blue-600" />
      </button>
      {open && (
        <DateFilterPopover
          onClose={() => setOpen(false)}
          onSelect={onSelect}
          initialValue={initialValue}
        />
      )}
    </div>
  );
};

export default FilterButton;
