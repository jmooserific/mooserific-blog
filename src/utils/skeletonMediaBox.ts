/**
 * Estimates the box a feed card's media block will occupy, from just the lead
 * photo dimensions + photo count carried in the post index. The virtual list's
 * placeholder (`PostSkeleton`) reserves this box so a row doesn't jump when the
 * real `PostCard` swaps in.
 *
 * We only return a box for the cases we can size *exactly* from the lead photo
 * alone — a single photo, whether it leads as a wide hero or a lone portrait.
 * Multi-photo posts lay out as justified rows whose height depends on every
 * photo's aspect ratio (which the lightweight index deliberately doesn't carry),
 * so they keep the caller's fixed fallback rather than a bad guess.
 *
 * The caps mirror `PostCard`: the hero is clamped to 85vh, and a single album
 * photo to react-photo-album's `singleRowMaxHeight` (535px).
 */
export interface SkeletonMediaBox {
  /** width / height — drop straight into a CSS `aspect-ratio`. */
  aspectRatio: number;
  /** Matches the card's `maxHeight` clamp for this layout. */
  maxHeight: string;
}

export function estimateSkeletonMediaBox(
  lead: { width: number; height: number } | null,
  photoCount: number,
): SkeletonMediaBox | null {
  if (!lead || lead.width <= 0 || lead.height <= 0 || photoCount !== 1) return null;

  const aspectRatio = lead.width / lead.height;
  // A lone landscape/square photo leads as the full-bleed hero (see
  // shouldLeadWithHero); a lone portrait renders as a single album row.
  const isHero = lead.width >= lead.height;
  return { aspectRatio, maxHeight: isHero ? "85vh" : "535px" };
}
