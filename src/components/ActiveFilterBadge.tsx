"use client";

interface ActiveFilterBadgeProps {
  value: string;
  onClear: () => void;
}

const ActiveFilterBadge: React.FC<ActiveFilterBadgeProps> = ({ value, onClear }) => (
  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-4 mt-2">
    <span>Filter: {value}</span>
    <button
      className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
      onClick={onClear}
      aria-label="Clear date filter"
    >
      ×
    </button>
  </div>
);

export default ActiveFilterBadge;
