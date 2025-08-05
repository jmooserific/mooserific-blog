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
  // Parse initialValue into year, month, day
  const now = new Date();
  let initialYear = "";
  let initialMonth = "";
  let initialDay = "";
  if (initialValue) {
    const [y, m, d] = initialValue.split(/-|T/);
    if (y) initialYear = y;
    if (m) initialMonth = m;
    if (d && d.length === 2) initialDay = d;
  }
  const [year, setYear] = useState(initialYear);
  const [day, setDay] = useState(initialDay);
  // Years: current year to current year - 25
  const years = Array.from({ length: 26 }, (_, i) => (now.getFullYear() - i).toString());
  // Month names
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];
  // Map month name to number string (01-12)
  const monthNameToNumber = (name: string) => {
    const idx = monthNames.indexOf(name);
    return idx > 0 ? idx.toString().padStart(2, "0") : "";
  };
  // If initialMonth is a number, convert to name
  const initialMonthName = monthNames[Number(initialMonth)] || "";
  const [monthName, setMonthName] = useState(initialMonthName);
  // Days: 1-31, but filter based on month/year
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return [];
    const d = new Date(Number(y), Number(m), 0).getDate();
    return Array.from({ length: d }, (_, i) => (i + 1).toString().padStart(2, "0"));
  };
  const days = ["", ...getDaysInMonth(year, monthNameToNumber(monthName))];
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
    if (!year) return;
    let filter = year;
    const monthNum = monthNameToNumber(monthName);
    if (monthNum) filter += `-${monthNum}`;
    if (day) filter += `-${day}`;
    onSelect(filter);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute left-4 top-4 z-50 bg-white rounded-xl shadow-lg p-4 w-100 border border-gray-200"
      onMouseDown={e => e.stopPropagation()}
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by date</label>
      <div className="flex gap-2 mb-2">
        <select
          className={
            `w-1/3 border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ` +
            (!year ? '' : '')
          }
          value={year}
          onChange={e => { setYear(e.target.value); setMonthName(""); setDay(""); }}
          autoFocus
        >
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className={
            `w-1/3 border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ` +
            (!year ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : '')
          }
          value={monthName}
          onChange={e => { setMonthName(e.target.value); setDay(""); }}
          disabled={!year}
        >
          <option value="">Month</option>
          {monthNames.map((m, idx) => idx > 0 && <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          className={
            `w-1/3 border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ` +
            ((!year || !monthName) ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : '')
          }
          value={day}
          onChange={e => setDay(e.target.value)}
          disabled={!year || !monthName}
        >
          <option value="">Day</option>
          {days.map(d => d && <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <button
        className="w-full bg-blue-600 text-white rounded-md py-2 mt-1 hover:bg-blue-700 transition"
        onClick={handleSelect}
        disabled={!year}
      >Apply</button>
    </div>
  );
};

export default DateFilterPopover;
