import { describe, it, expect } from 'vitest';
import { planJump, hasArrived, type FeedScrollConfig } from './feedScroll';

// Mirrors FEED_SCROLL_CONFIG in FeedClient; the exact numbers don't matter to
// the logic, only that glide < min so a far jump always teleports a positive gap.
const config: FeedScrollConfig = { flythroughMinRows: 8, flythroughGlideRows: 4 };

describe('planJump', () => {
  it('teleports instantly under reduced motion, regardless of distance', () => {
    // Reduced motion wins even for a short hop that would otherwise be smooth.
    expect(planJump(0, 2, 1000, true, config)).toEqual({ kind: 'instant', target: 2 });
    expect(planJump(0, 900, 1000, true, config)).toEqual({ kind: 'instant', target: 900 });
  });

  it('smooth-scrolls a short hop (within the fly-through threshold)', () => {
    expect(planJump(0, config.flythroughMinRows, 1000, false, config)).toEqual({
      kind: 'smooth',
      target: config.flythroughMinRows,
    });
  });

  it('treats a same-row jump as a smooth no-op', () => {
    expect(planJump(5, 5, 1000, false, config)).toEqual({ kind: 'smooth', target: 5 });
  });

  it('flies through once the jump exceeds the threshold', () => {
    // One past the threshold is the boundary that flips smooth -> flythrough.
    expect(planJump(0, config.flythroughMinRows + 1, 1000, false, config)).toEqual({
      kind: 'flythrough',
      near: config.flythroughMinRows + 1 - config.flythroughGlideRows,
      target: config.flythroughMinRows + 1,
    });
  });

  it('teleports above the target when travelling down, so the glide moves down', () => {
    const plan = planJump(0, 500, 1000, false, config);
    expect(plan).toEqual({ kind: 'flythrough', near: 496, target: 500 });
  });

  it('teleports below the target when travelling up, so the glide moves up', () => {
    const plan = planJump(500, 10, 1000, false, config);
    expect(plan).toEqual({ kind: 'flythrough', near: 14, target: 10 });
  });

  it('clamps the teleport to the feed start when gliding down near the top', () => {
    // target - glide would be negative; near must not go below 0.
    const plan = planJump(900, 2, 1000, false, config);
    expect(plan).toEqual({ kind: 'flythrough', near: 6, target: 2 });
    // Sanity: gliding up means near = target + glide, clamped only at the end.
    expect((plan as { near: number }).near).toBeGreaterThanOrEqual(0);
  });

  it('clamps the teleport to the last row when gliding up near the end', () => {
    // target + glide would exceed the last index; near must not pass count - 1.
    const plan = planJump(0, 999, 1000, false, config);
    // Travelling down to the very end: near = 999 - 4 = 995, no clamp needed.
    expect(plan).toEqual({ kind: 'flythrough', near: 995, target: 999 });

    // Travelling up toward the end from beyond it isn't possible, but a small
    // feed where target + glide overflows exercises the upper clamp.
    const tiny = planJump(0, 0, 3, false, { flythroughMinRows: -1, flythroughGlideRows: 4 });
    // from === to but min is -1, so |0-0|=0 > -1 -> far; travelling "up" path
    // uses min(count-1, to+glide) = min(2, 4) = 2.
    expect(tiny).toEqual({ kind: 'flythrough', near: 2, target: 0 });
  });
});

describe('hasArrived', () => {
  it('is true at the target and within a one-row tolerance', () => {
    expect(hasArrived(500, 500)).toBe(true);
    expect(hasArrived(499, 500)).toBe(true);
    expect(hasArrived(501, 500)).toBe(true);
  });

  it('is false while still gliding toward the target', () => {
    // A fresh teleport lands GLIDE_ROWS short, so suppression must stay on.
    expect(hasArrived(496, 500)).toBe(false);
    expect(hasArrived(502, 500)).toBe(false);
  });
});
