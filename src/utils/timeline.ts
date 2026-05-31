// Pure model + math for the timeline navigation component.
//
// The timeline is "a map, not an index": it spans the whole archive (every
// month between the first and last post) and lets you browse to roughly the
// right neighbourhood in time. These helpers own the time<->position math so
// it can be unit-tested independently of the DOM. All date math is in UTC to
// match the post card's date rendering and the slug format.

export interface TimelineModel {
  /** First year that has posts. */
  startYear: number;
  /** Last year that has posts. */
  endYear: number;
  /** (endYear - startYear + 1) * 12 — every month in the span, gaps included. */
  totalMonths: number;
  /** Posts per month, indexed by months since January of startYear. */
  counts: number[];
  /** Largest single-month count, floored at 1 so density never divides by zero. */
  maxCount: number;
}

const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

/**
 * Build the density model from `getDateMetadata().postCounts`, whose keys are
 * `"YYYY"` (year totals) and `"YYYY-MM"` (month totals). Only the month keys
 * feed the per-month density. Returns `null` for an empty archive so callers
 * can skip rendering the timeline entirely.
 */
export function buildTimelineModel(postCounts: Record<string, number>): TimelineModel | null {
  const months: Array<{ year: number; month: number; count: number }> = [];
  for (const [key, count] of Object.entries(postCounts)) {
    const m = YEAR_MONTH.exec(key);
    if (!m || count <= 0) continue;
    months.push({ year: Number(m[1]), month: Number(m[2]) - 1, count });
  }
  if (months.length === 0) return null;

  let startYear = Infinity;
  let endYear = -Infinity;
  for (const { year } of months) {
    if (year < startYear) startYear = year;
    if (year > endYear) endYear = year;
  }

  const totalMonths = (endYear - startYear + 1) * 12;
  const counts = new Array<number>(totalMonths).fill(0);
  for (const { year, month, count } of months) {
    counts[(year - startYear) * 12 + month] = count;
  }
  const maxCount = Math.max(1, ...counts);

  return { startYear, endYear, totalMonths, counts, maxCount };
}

/** Centre of a month along the time axis, as a 0..1 fraction of the span. */
export function monthToFrac(monthIndex: number, totalMonths: number): number {
  return (monthIndex + 0.5) / totalMonths;
}

/** Nearest month index for a 0..1 fraction, clamped to the span. */
export function fracToMonth(frac: number, totalMonths: number): number {
  return clampMonth(Math.round(frac * totalMonths - 0.5), totalMonths);
}

export function clampMonth(monthIndex: number, totalMonths: number): number {
  if (monthIndex < 0) return 0;
  if (monthIndex > totalMonths - 1) return totalMonths - 1;
  return monthIndex;
}

/**
 * Position of a post's date along the time axis (0..1). Dates outside the span
 * clamp to the ends so an out-of-range value never throws off the playhead.
 */
export function dateToFrac(dateISO: string, model: TimelineModel): number {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return 0;
  const monthIndex = (d.getUTCFullYear() - model.startYear) * 12 + d.getUTCMonth();
  const dayFrac = (d.getUTCDate() - 1) / 31; // sub-month offset, good enough for a map
  const frac = (monthIndex + dayFrac) / model.totalMonths;
  return Math.min(1, Math.max(0, frac));
}

/** Start/end of the archive span in epoch ms (Jan 1 startYear .. Jan 1 endYear+1). */
function spanBounds(model: TimelineModel): { start: number; end: number } {
  return {
    start: Date.UTC(model.startYear, 0, 1),
    end: Date.UTC(model.endYear + 1, 0, 1),
  };
}

/** Inverse of `dateToFrac`: a 0..1 timeline position back to an ISO date. */
export function fracToDateISO(frac: number, model: TimelineModel): string {
  const { start, end } = spanBounds(model);
  const clamped = Math.min(1, Math.max(0, frac));
  return new Date(start + clamped * (end - start)).toISOString();
}

/**
 * Index of the post nearest to `targetISO` in a date-DESC-sorted index (the
 * shape `listPostIndex` returns). Used to turn a timeline jump into a real post
 * to scroll to, so empty stretches snap to the closest post instead of nowhere.
 * Returns -1 only for an empty index.
 */
export function nearestIndexByDate(entries: ReadonlyArray<{ date: string }>, targetISO: string): number {
  const n = entries.length;
  if (n === 0) return -1;
  const target = new Date(targetISO).getTime();
  if (Number.isNaN(target)) return 0;

  // Times descend with index; find the first index whose time is <= target.
  let lo = 0;
  let hi = n - 1;
  let firstAtOrBelow = n;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(entries[mid].date).getTime() <= target) {
      firstAtOrBelow = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  if (firstAtOrBelow === 0) return 0;
  if (firstAtOrBelow >= n) return n - 1;

  // The nearest is whichever of the straddling neighbours is closer in time.
  const below = firstAtOrBelow;
  const above = firstAtOrBelow - 1;
  const dBelow = Math.abs(new Date(entries[below].date).getTime() - target);
  const dAbove = Math.abs(new Date(entries[above].date).getTime() - target);
  return dAbove <= dBelow ? above : below;
}
