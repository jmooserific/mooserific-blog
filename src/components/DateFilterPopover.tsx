"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parse, isValid } from "date-fns";

interface DateFilterPopoverProps {
  onClose: () => void;
  onSelect: (dateString: string) => void;
  initialValue?: string;
}

const parseDateInput = (input: string): string | null => {
  // Accepts YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH-MM
  if (/^\d{4}$/.test(input)) return input;
  if (/^\d{4}-\d{2}$/.test(input)) return input;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/.test(input)) return input;
  return null;
};

const DateFilterPopover: React.FC<DateFilterPopoverProps> = ({ onClose, onSelect, initialValue }) => {
  const [input, setInput] = useState(initialValue || "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSelect = () => {
    const parsed = parseDateInput(input.trim());
    if (parsed) {
      onSelect(parsed);
      onClose();
    }
  };

  return (
    <div ref={ref} className="absolute right-4 top-16 z-50 bg-white rounded-xl shadow-lg p-4 w-72 border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by date</label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="YYYY, YYYY-MM, YYYY-MM-DD, ..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSelect(); }}
        autoFocus
      />
      <button
        className="w-full bg-blue-600 text-white rounded-md py-2 mt-1 hover:bg-blue-700 transition"
        onClick={handleSelect}
        disabled={!parseDateInput(input.trim())}
      >Apply</button>
    </div>
  );
};

export default DateFilterPopover;
