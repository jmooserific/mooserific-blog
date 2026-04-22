"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface DateTimePopoverProps {
  initialDate?: Date;
  onApply: (date: Date) => void;
  onClose: () => void;
}

export function DateTimePopover({ initialDate, onApply, onClose }: DateTimePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [temp, setTemp] = useState<Date>(() => initialDate ?? new Date());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
      className="absolute z-50 bg-white rounded-[10px] shadow-md border border-[#845A2C]/15 w-80"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#845A2C]/10">
        <div className="text-lg font-semibold text-[#845A2C] select-none">Post Date/Time</div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <label className="block text-sm text-gray-700">
          <span className="block mb-1">Date</span>
          <input
            type="date"
            className="w-full rounded-[10px] border border-[#845A2C]/15 px-3 py-2 text-gray-800 transition-colors focus:outline-none focus:border-[#845A2C] focus:ring-2 focus:ring-[#845A2C]/30"
            value={localDateValue}
            onChange={(e) => setFromDateInput(e.target.value)}
          />
        </label>
        <label className="block text-sm text-gray-700">
          <span className="block mb-1">Time</span>
          <input
            type="time"
            step={60}
            className="w-full rounded-[10px] border border-[#845A2C]/15 px-3 py-2 text-gray-800 transition-colors focus:outline-none focus:border-[#845A2C] focus:ring-2 focus:ring-[#845A2C]/30"
            value={localTimeValue}
            onChange={(e) => setFromTimeInput(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="rounded-[10px] border border-transparent bg-transparent px-3 py-1.5 text-sm text-[#845A2C] transition-colors hover:bg-[#845A2C]/6 focus:outline-none focus:ring-2 focus:ring-[#845A2C] focus:ring-offset-2"
            onClick={() => setTemp(new Date())}
          >
            Now
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-[10px] border border-transparent bg-transparent px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-[10px] border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-[#845A2C] transition-colors hover:bg-[#845A2C]/6 focus:outline-none focus:ring-2 focus:ring-[#845A2C] focus:ring-offset-2"
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
