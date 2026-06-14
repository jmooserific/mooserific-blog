// Date helpers for the byline date chip. The post card renders dates from their
// UTC components (PostCard uses getUTC* so SSR and client agree) and the default
// slug is derived in UTC too. To keep the editor truly WYSIWYG — what you pick is
// what the card shows and what the slug encodes — the chip both displays and edits
// in UTC. These are pure so the timezone math is testable without a real <input>.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => n.toString().padStart(2, "0");

/** Format a date the same way the post card byline does: `May 14, 2026` (UTC). */
export function formatPostDateUTC(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/**
 * Render a date as the `YYYY-MM-DDTHH:mm` string an `<input type="datetime-local">`
 * expects, using UTC components so the control shows the same wall-clock time the
 * card and slug will use.
 */
export function toDatetimeLocalUTC(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  );
}

/**
 * Parse a `datetime-local` value back into a Date, interpreting the fields as UTC
 * (the inverse of {@link toDatetimeLocalUTC}). Returns null for an empty or
 * unparseable value so the caller can keep the previous date.
 */
export function fromDatetimeLocalUTC(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  return Number.isNaN(date.getTime()) ? null : date;
}
