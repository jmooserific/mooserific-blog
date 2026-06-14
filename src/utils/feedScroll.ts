/**
 * Pure scroll-planning for a timeline jump in the feed.
 *
 * A jump from one row to another is either a single scroll or a "fly-through":
 * for far jumps we teleport to within a few rows of the target, then smooth-
 * scroll only that last stretch. Bounding the animated distance keeps the glide
 * short and the same length in every browser — Blink/Chrome scales smooth-scroll
 * duration with distance (so an unbounded far jump crawls there), while
 * WebKit/Safari uses a near-constant duration. The orchestration (the actual
 * scrollToIndex calls, requestAnimationFrame, suppression lifecycle) lives in
 * FeedClient; this module only decides what should happen.
 */

export interface FeedScrollConfig {
  /** Jump distance (in rows) above which we fly through instead of one scroll. */
  flythroughMinRows: number;
  /** How many rows short of the target a fly-through teleports before gliding. */
  flythroughGlideRows: number;
}

/**
 * What a jump should do, as a discriminated union:
 * - `instant`  — teleport straight to the target (reduced motion).
 * - `smooth`   — one smooth scroll to the target (short hop).
 * - `flythrough` — teleport to `near`, then smooth-glide to `target`.
 */
export type ScrollPlan =
  | { kind: 'instant'; target: number }
  | { kind: 'smooth'; target: number }
  | { kind: 'flythrough'; near: number; target: number };

/**
 * Decide how to scroll from row `from` to row `to` in a feed of `count` rows.
 * `target` is assumed already valid (in range); `near` is clamped to the feed.
 */
export function planJump(
  from: number,
  to: number,
  count: number,
  reduceMotion: boolean,
  config: FeedScrollConfig
): ScrollPlan {
  if (reduceMotion) return { kind: 'instant', target: to };

  const far = Math.abs(to - from) > config.flythroughMinRows;
  if (!far) return { kind: 'smooth', target: to };

  // Teleport to GLIDE_ROWS short of the target on the side we're travelling from,
  // so the glide always moves toward the target (down for to > from, up otherwise).
  const near =
    to > from
      ? Math.max(0, to - config.flythroughGlideRows)
      : Math.min(count - 1, to + config.flythroughGlideRows);
  return { kind: 'flythrough', near, target: to };
}

/**
 * Whether a fly-through has reached its target. The teleport lands us
 * GLIDE_ROWS short, so suppression can't lift on the first range change; we wait
 * until the visible top is within a row of the target (tolerance absorbs
 * off-by-one from height measurement).
 */
export function hasArrived(startIndex: number, target: number): boolean {
  return Math.abs(startIndex - target) <= 1;
}
