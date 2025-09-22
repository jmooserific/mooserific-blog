"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

interface DateTimePopoverProps {
  initialDate?: Date;
  onApply: (date: Date) => void;
  onClose: () => void;
}

// Simple date/time popover inspired by DateFilterPopover styling.
export default function DateTimePopover({ initialDate, onApply, onClose }: DateTimePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [temp, setTemp] = useState<Date>(() => initialDate ?? new Date());

  const monthLabel = useMemo(() => format(temp, "MMMM yyyy"), [temp]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const shiftMonth = (delta: number) => {
    setTemp((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + delta);
      return nd;
    });
  };

  const setFromDateInput = (val: string) => {
    // val is YYYY-MM-DD (local)
    if (!val) return;
    setTemp((prev) => {
      const [y, m, day] = val.split("-").map(Number);
      const nd = new Date(prev);
      nd.setFullYear(y, (m || 1) - 1, day || 1);
      return nd;
    });
  };

  const setFromTimeInput = (val: string) => {
    // val is HH:mm or HH:mm:ss (local)
    if (!val) return;
    const [hh, mm, ss] = val.split(":").map((s) => Number(s));
    setTemp((prev) => {
      const nd = new Date(prev);
      nd.setHours(hh || 0, mm || 0, ss || 0, 0);
      return nd;
    });
  };

  const localDateValue = useMemo(() => {
    // Convert to local date input format YYYY-MM-DD
    const y = temp.getFullYear();
    const m = `${temp.getMonth() + 1}`.padStart(2, "0");
    const d = `${temp.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [temp]);

  const localTimeValue = useMemo(() => {
    const h = `${temp.getHours()}`.padStart(2, "0");
    const m = `${temp.getMinutes()}`.padStart(2, "0");
    return `${h}:${m}`;
  }, [temp]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-gray-200 w-80"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="text-lg font-semibold text-gray-800 select-none">Post Date/Time</div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <label className="block text-sm text-gray-700">
          <span className="block mb-1">Date</span>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={localDateValue}
            onChange={(e) => setFromDateInput(e.target.value)}
          />
        </label>
        <label className="block text-sm text-gray-700">
          <span className="block mb-1">Time</span>
          <input
            type="time"
            step={60}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={localTimeValue}
            onChange={(e) => setFromTimeInput(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
              onClick={() => setTemp(new Date())}
            >
              Now
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                onApply(temp);
                onClose();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
