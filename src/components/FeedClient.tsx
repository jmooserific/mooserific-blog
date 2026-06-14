'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useRouter } from 'next/navigation';
import { PostCard, type Post } from './PostCard';
import { Timeline } from './Timeline';
import type { TimelineModel } from '@/utils/timeline';
import { fracToDateISO, nearestIndexByDate } from '@/utils/timeline';
import { estimateSkeletonMediaBox } from '@/utils/skeletonMediaBox';
import { planJump, hasArrived, type FeedScrollConfig } from '@/utils/feedScroll';
import type { PostIndexEntry } from '@/lib/db';

interface FeedClientProps {
  /** Every post as {id, date}, newest first — drives the list length and jumps. */
  index: PostIndexEntry[];
  /** Full posts for the top of the feed, SSR'd; seeds the cache for indices 0..n-1. */
  firstBatch: Post[];
  isAdmin: boolean;
  timelineModel: TimelineModel | null;
}

// Full post bodies are fetched a chunk at a time as rows scroll into view.
const BATCH_SIZE = 12;
// Fetch this many rows beyond the visible range so scrolling rarely hits a gap.
const PREFETCH = 8;
// A far jump flies through: animate smoothly so the timeline feels continuous,
// but suppress metadata fetches for the rows streaming past so they render as
// gray skeletons (no PostCards, no images for posts we're only scrolling past),
// and bound the animated distance for a short, cross-browser-consistent glide.
// See feedScroll.ts for the planning logic and the rationale.
const FEED_SCROLL_CONFIG: FeedScrollConfig = {
  flythroughMinRows: 8,
  flythroughGlideRows: 4,
};

const batchOf = (i: number) => Math.floor(i / BATCH_SIZE);

export function FeedClient({ index, firstBatch, isAdmin, timelineModel }: FeedClientProps) {
  const router = useRouter();
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // index -> full post. Seeded with the SSR'd first batch so the top of the feed
  // is populated on first paint (no fetch, no skeleton flash).
  const [cache, setCache] = useState<Map<number, Post>>(() => {
    const m = new Map<number, Post>();
    firstBatch.forEach((p, i) => m.set(i, p));
    return m;
  });
  const inFlight = useRef<Set<number>>(new Set());
  // Latest visible range: a jump measures its distance from the top, and the
  // settle handler reuses it to resume prefetch where we land.
  const rangeRef = useRef({ startIndex: 0, endIndex: 0 });
  // Set while a far jump animates: suppresses fly-by prefetch (see
  // FLYTHROUGH_MIN_ROWS) until we reach the target (or the user interrupts).
  const flyingRef = useRef(false);
  // Destination index of the in-progress fly-through; the suppression lifts once
  // the visible top reaches it.
  const jumpTargetRef = useRef(0);
  const [activeDate, setActiveDate] = useState<string | undefined>(index[0]?.date);

  const fetchBatch = useCallback(
    async (batch: number) => {
      if (batch < 0 || inFlight.current.has(batch)) return;
      const start = batch * BATCH_SIZE;
      if (start >= index.length) return;
      const end = Math.min(start + BATCH_SIZE, index.length);

      // Skip if every index in this batch is already cached.
      let missing = false;
      for (let i = start; i < end; i++) {
        if (!cache.has(i)) {
          missing = true;
          break;
        }
      }
      if (!missing) return;

      inFlight.current.add(batch);
      try {
        const ids = index.slice(start, end).map((e) => e.id);
        const res = await fetch(`/api/posts/batch?ids=${ids.map(encodeURIComponent).join(',')}`);
        if (!res.ok) return;
        const data: { posts: Post[] } = await res.json();
        const byId = new Map(data.posts.map((p) => [p.id, p]));
        setCache((prev) => {
          const next = new Map(prev);
          for (let i = start; i < end; i++) {
            const post = byId.get(index[i].id);
            if (post) next.set(i, post);
          }
          return next;
        });
      } catch {
        // Leave the batch uncached; a later rangeChanged will retry it.
      } finally {
        inFlight.current.delete(batch);
      }
    },
    [cache, index]
  );

  const prefetchAround = useCallback(
    (startIndex: number, endIndex: number) => {
      const first = batchOf(Math.max(0, startIndex - PREFETCH));
      const last = batchOf(Math.min(index.length - 1, endIndex + PREFETCH));
      for (let b = first; b <= last; b++) fetchBatch(b);
    },
    [fetchBatch, index]
  );

  const onRangeChanged = useCallback(
    ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      rangeRef.current = { startIndex, endIndex };
      setActiveDate(index[startIndex]?.date);
      if (flyingRef.current) {
        // Keep the rows streaming past as skeletons until we actually reach the
        // destination (the instant teleport lands us GLIDE_ROWS short of it, so
        // we can't lift on first range change). Then fall through to prefetch.
        if (!hasArrived(startIndex, jumpTargetRef.current)) return;
        flyingRef.current = false;
      }
      prefetchAround(startIndex, endIndex);
    },
    [prefetchAround, index]
  );

  // Fallback for an interrupted fly-through: if the user grabs the scroll mid-
  // flight, we may never reach the target, so resume normal loading once any
  // scroll stops (Virtuoso reports false) while suppression is still on.
  const onIsScrolling = useCallback(
    (scrolling: boolean) => {
      if (scrolling || !flyingRef.current) return;
      flyingRef.current = false;
      const { startIndex, endIndex } = rangeRef.current;
      prefetchAround(startIndex, endIndex);
    },
    [prefetchAround]
  );

  const onJump = useCallback(
    (frac: number) => {
      if (!timelineModel || index.length === 0) return;
      const targetISO = fracToDateISO(frac, timelineModel);
      const target = nearestIndexByDate(index, targetISO);
      if (target < 0) return;
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scroll = virtuosoRef.current;
      if (!scroll) return;

      const plan = planJump(
        rangeRef.current.startIndex,
        target,
        index.length,
        reduceMotion,
        FEED_SCROLL_CONFIG
      );
      switch (plan.kind) {
        case 'instant':
          scroll.scrollToIndex({ index: plan.target, align: 'start', behavior: 'auto' });
          return;
        case 'smooth':
          scroll.scrollToIndex({ index: plan.target, align: 'start', behavior: 'smooth' });
          return;
        case 'flythrough':
          // Suppress fly-by prefetch until we arrive; warm only the destination so
          // it's real when the glide lands. Teleport to GLIDE_ROWS short, then
          // smooth-scroll the last stretch on the next frame.
          flyingRef.current = true;
          jumpTargetRef.current = plan.target;
          fetchBatch(batchOf(plan.target));
          scroll.scrollToIndex({ index: plan.near, align: 'start', behavior: 'auto' });
          requestAnimationFrame(() => {
            scroll.scrollToIndex({ index: plan.target, align: 'start', behavior: 'smooth' });
          });
          return;
      }
    },
    [index, timelineModel, fetchBatch]
  );

  if (index.length === 0) {
    return <div className="text-center text-gray-500 py-12 text-lg">No posts yet.</div>;
  }

  return (
    <>
      <Virtuoso
        ref={virtuosoRef}
        useWindowScroll
        totalCount={index.length}
        initialItemCount={firstBatch.length}
        rangeChanged={onRangeChanged}
        isScrolling={onIsScrolling}
        components={{
          List: FeedList,
        }}
        itemContent={(i) => {
          const post = cache.get(i);
          if (!post) return <PostSkeleton entry={index[i]} />;
          return (
            <PostCard post={post} isAdmin={isAdmin} isAboveFold={i < 2} onDeleted={() => router.refresh()} />
          );
        }}
      />
      {timelineModel && <Timeline model={timelineModel} activeDate={activeDate} onJump={onJump} />}
    </>
  );
}

// The track matches the cards: every post renders at max-w-6xl (hero posts
// additionally bleed to the viewport edge below `sm`).
const FeedList = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-28">
    {children}
  </div>
);
FeedList.displayName = 'FeedList';

// Height-reserving placeholder so uncached rows don't shift layout as batches
// arrive. Mirrors the card's shape: byline + caption lead-in, then a photo block.
// When the index carries the lead photo's dimensions, the photo block reserves
// the card's real aspect-ratio box (single-photo posts); otherwise it falls back
// to a fixed height (multi-photo rows / dimensionless rows).
function PostSkeleton({ entry }: { entry: PostIndexEntry }) {
  const box = estimateSkeletonMediaBox(
    entry.leadWidth != null && entry.leadHeight != null
      ? { width: entry.leadWidth, height: entry.leadHeight }
      : null,
    entry.photoCount,
  );
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden bg-white rounded-[20px] mb-8 p-4" aria-hidden="true">
      <div className="h-3.5 w-40 rounded bg-gray-100 mb-3" />
      <div className="h-4 w-3/4 rounded bg-gray-100 mb-2" />
      <div className="h-4 w-1/2 rounded bg-gray-100 mb-4" />
      <div
        className="w-full rounded-xl bg-gray-100"
        style={box ? { aspectRatio: box.aspectRatio, maxHeight: box.maxHeight } : { height: '14rem' }}
      />
    </div>
  );
}
