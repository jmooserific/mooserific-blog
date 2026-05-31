// Derives human-readable metadata (page title, formatted date) for a post.
// Posts have no explicit title, so we synthesize one from the Markdown caption,
// falling back to the formatted date when there's nothing usable.

const MAX_TITLE = 70;

/** Format an ISO date as e.g. "May 31, 2026" in UTC (matches how posts render dates). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * A short, plain-text title for a post: the first non-empty line of its caption
 * with the most common Markdown markers stripped and length capped, or the
 * formatted date when the caption is empty or has no textual content.
 */
export function deriveTitle(description: string | undefined, isoDate: string): string {
  const firstLine = (description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) {
    const plain = firstLine
      .replace(/^#{1,6}\s+/, "") // leading ATX heading marker
      .replace(/[*_`>#~]/g, "") // emphasis / code / quote / strike markers
      .trim();
    if (plain) {
      return plain.length > MAX_TITLE ? `${plain.slice(0, MAX_TITLE - 1).trimEnd()}…` : plain;
    }
  }
  return formatDate(isoDate);
}
