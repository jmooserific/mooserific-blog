"use client"

import { useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { formatPostDateUTC, toDatetimeLocalUTC, fromDatetimeLocalUTC } from "./dateField";

interface DateChipProps {
  date: Date;
  onChange: (date: Date) => void;
}

/**
 * The post's date as a tappable byline chip. Reads and writes in UTC (see
 * {@link formatPostDateUTC}) so what the author picks is exactly what the post
 * card byline shows and what the default slug encodes. Tapping reveals a native
 * `datetime-local` picker — the right control on a phone for on-the-go posting.
 */
export function DateChip({ date, onChange }: DateChipProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="datetime-local"
        autoFocus
        defaultValue={toDatetimeLocalUTC(date)}
        onChange={(e) => {
          const next = fromDatetimeLocalUTC(e.target.value);
          if (next) onChange(next);
        }}
        onBlur={() => setEditing(false)}
        aria-label="Post date and time (UTC)"
        className="rounded-[10px] border border-accent/15 bg-white px-2 py-1 text-[13px] text-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent/15 bg-transparent px-2.5 py-1 text-[13px] text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <CalendarDaysIcon className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
      {formatPostDateUTC(date)}
    </button>
  );
}
