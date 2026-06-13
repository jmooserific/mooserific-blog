'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  type TimelineModel,
  monthToFrac,
  fracToMonth,
  clampMonth,
  dateToFrac,
} from '@/utils/timeline';

interface TimelineProps {
  model: TimelineModel;
  /** ISO date of the post currently at the top of the feed; drives the playhead. */
  activeDate?: string;
  /** Commit a jump: the feed maps this 0..1 position to the nearest post and scrolls. */
  onJump: (frac: number) => void;
}

type Orientation = 'portrait' | 'landscape';

// Stay horizontal until the viewport drops below Tailwind's `sm` breakpoint.
// Above it the header's sign-in / create-post button is right-aligned
// (`sm:justify-end`); a vertical rail on the right edge would cover it. Below it
// the button re-centers, so the rail is clear to take the right edge.
const PORTRAIT_BELOW_PX = 640;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const labelFromMonthIndex = (mi: number, startYear: number) =>
  `${MONTHS[mi % 12]} ${startYear + Math.floor(mi / 12)}`;
const labelFromDateISO = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export function Timeline({ model, activeDate, onJump }: TimelineProps) {
  const { totalMonths, startYear, endYear, counts, maxCount } = model;

  // Null until mounted, so server + first client render agree (avoids hydration
  // mismatch). Everything geometric derives from this one measurement.
  const [viewportW, setViewportW] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // The playhead position is owned by the feed (via activeDate); we just map it
  // to a fraction + label. Falls back to the newest end before the first report.
  const playhead = useMemo(() => {
    if (activeDate) {
      return { frac: dateToFrac(activeDate, model), label: labelFromDateISO(activeDate) };
    }
    const frac = monthToFrac(totalMonths - 1, totalMonths);
    return { frac, label: labelFromMonthIndex(totalMonths - 1, startYear) };
  }, [activeDate, model, totalMonths, startYear]);

  // Keyboard cursor: rides hidden with the playhead until the user steers it
  // ("detached"), then commits/blurs back onto the playhead.
  const [cursor, setCursor] = useState({ month: fracToMonth(playhead.frac, totalMonths), detached: false });
  const [hover, setHover] = useState<{ frac: number; label: string } | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  const orientation: Orientation | null =
    viewportW === null ? null : viewportW < PORTRAIT_BELOW_PX ? 'portrait' : 'landscape';
  const portrait = orientation === 'portrait';

  // Newest at right (landscape) / top (portrait): consistent under a clockwise
  // quarter-turn, so the playhead tracks scroll the same way in both.
  const axisPos = useCallback((f: number) => (portrait ? (1 - f) * 100 : f * 100), [portrait]);

  // ── Measure viewport (drives orientation + panel/mini geometry) ──────────
  // On the first measurement, default to collapsed in portrait so the vertical
  // rail doesn't cover the photos on initial load. After that the user owns the
  // expand/collapse state — a later resize never re-collapses it.
  const didInitCollapse = useRef(false);
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      setViewportW(w);
      if (!didInitCollapse.current) {
        didInitCollapse.current = true;
        if (w < PORTRAIT_BELOW_PX) setCollapsed(true);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Cursor rides with the playhead (fed by the feed) while attached.
  const playheadMonth = fracToMonth(playhead.frac, totalMonths);
  useEffect(() => {
    setCursor((c) => (c.detached ? c : { month: playheadMonth, detached: false }));
  }, [playheadMonth]);

  // ── Jump = hand a 0..1 position to the feed, which snaps to the nearest post ─
  const jumpToMonth = useCallback(
    (monthIndex: number) => {
      onJump(monthToFrac(clampMonth(monthIndex, totalMonths), totalMonths));
    },
    [onJump, totalMonths]
  );

  // ── Keyboard (the accessible path that replaces the date picker) ─────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    const base = cursor.detached ? cursor.month : playheadMonth;
    let next = base;
    let detached = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clampMonth(base + (e.shiftKey ? 12 : 1), totalMonths);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clampMonth(base - (e.shiftKey ? 12 : 1), totalMonths);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = totalMonths - 1;
        break;
      case 'Enter':
      case ' ':
        jumpToMonth(base);
        setCursor({ month: base, detached: false });
        e.preventDefault();
        return;
      default:
        return;
    }
    setCursor({ month: next, detached });
    e.preventDefault();
  };

  // ── Pointer ──────────────────────────────────────────────────────────────
  const fracFromEvent = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    const raw = portrait ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    const clamped = Math.min(1, Math.max(0, raw));
    return portrait ? 1 - clamped : clamped; // top = newest in portrait
  };
  const onMove = (e: React.MouseEvent) => {
    const frac = fracFromEvent(e);
    setHover({ frac, label: labelFromMonthIndex(fracToMonth(frac, totalMonths), startYear) });
  };
  // Pointer jumps pass the raw fraction (finer than month granularity) straight
  // to the feed; the keyboard path stays month-quantized via jumpToMonth.
  const onClick = (e: React.MouseEvent) => onJump(fracFromEvent(e));

  // Don't render positioned content until measured (keeps SSR === first paint).
  if (!orientation) return null;

  const steering = cursor.detached;
  const cursorMonth = steering ? cursor.month : playheadMonth;
  const activeMonth = playheadMonth;

  // ── Density bars ───────────────────────────────────────────────────────
  const bars = counts.map((count, m) => {
    const lenPx = (count ? 22 + (count / maxCount) * 70 : 8) * 0.42;
    const pos = `calc(${axisPos(monthToFrac(m, totalMonths))}% - 1.5px)`;
    const isActive = m === activeMonth && count > 0;
    const opacity = isActive ? 0.85 : count > 0 ? 0.4 : 0.16;
    const style: React.CSSProperties = portrait
      ? { top: pos, right: 14, height: 3, width: lenPx, opacity }
      : { left: pos, bottom: 26, width: 3, height: lenPx, opacity };
    return (
      <div
        key={m}
        aria-hidden="true"
        className="absolute rounded-[1px] bg-accent transition-opacity duration-200"
        style={style}
      />
    );
  });

  // ── Year labels ──────────────────────────────────────────────────────────
  const yearLabels = [];
  for (let y = startYear; y <= endYear; y++) {
    const mid = axisPos(monthToFrac((y - startYear) * 12 + 6, totalMonths));
    const style: React.CSSProperties = portrait
      ? { top: `calc(${mid}% - 7px)`, left: 10 }
      : { left: `${mid}%`, transform: 'translateX(-50%)', bottom: 4 };
    yearLabels.push(
      <div
        key={y}
        aria-hidden="true"
        className="absolute whitespace-nowrap text-[11px] font-medium tracking-[0.03em] text-accent-muted"
        style={style}
      >
        {`’${String(y).slice(2)}`}
      </div>
    );
  }

  // ── Playhead + cursor geometry ─────────────────────────────────────────
  const lineStyle = (frac: number): React.CSSProperties =>
    portrait
      ? { top: `${axisPos(frac)}%`, left: 8, right: 8, height: 2 }
      : { left: `${axisPos(frac)}%`, top: 8, bottom: 20, width: 2 };
  const arrowStyle: React.CSSProperties = portrait
    ? {
        left: -2,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: '6px solid transparent',
        borderBottom: '6px solid transparent',
        borderLeft: '8px solid var(--color-accent)',
      }
    : {
        top: -2,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '8px solid var(--color-accent)',
      };
  const chipPos: React.CSSProperties = portrait
    ? { top: '50%', left: -6, transform: 'translate(-100%, -50%)' }
    : { top: -30, left: '50%', transform: 'translateX(-50%)' };

  const cursorFrac = monthToFrac(cursorMonth, totalMonths);
  const cursorLabel = labelFromMonthIndex(cursorMonth, startYear);

  const panelWidth = Math.min(viewportW! - 96, 1080);
  const miniRight = portrait ? 14 : (viewportW! - panelWidth) / 2;

  // ── Collapsed read-only pill ───────────────────────────────────────────
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Open timeline to jump through time"
        title="Jump through time"
        onClick={() => setCollapsed(false)}
        style={{ right: miniRight }}
        className="fixed bottom-3.5 z-50 flex items-center gap-2 rounded-[14px] border border-white/55 bg-white/65 px-2.5 py-1.75 pl-3 text-accent shadow-[0_8px_30px_-6px_rgba(0,0,0,0.18)] backdrop-blur-lg backdrop-saturate-150 transition-colors hover:bg-white/80"
      >
        {/* Calendar hint: signals the pill is a time-jump control, not just a label */}
        <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
        <span className="text-[12px] font-bold uppercase tracking-wider">{playhead.label}</span>
        <ArrowsPointingOutIcon className="h-3.75 w-3.75 opacity-70" aria-hidden="true" />
      </button>
    );
  }

  const panelStyle: React.CSSProperties = portrait
    ? { top: 14, bottom: 14, right: 14, width: 80 }
    : { width: panelWidth, height: 80, bottom: 14 };

  return (
    <nav
      aria-label="Timeline"
      style={panelStyle}
      className={`fixed z-50 rounded-[18px] border border-white/55 bg-white/65 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.18)] backdrop-blur-lg backdrop-saturate-150 has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 ${
        portrait ? '' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      <button
        type="button"
        aria-label="Minimize timeline"
        title="Minimize timeline"
        onClick={() => {
          setCollapsed(true);
          trackRef.current?.blur();
        }}
        className="absolute bottom-1 right-1 z-7 flex items-center justify-center rounded-lg border border-transparent p-1.5 text-accent transition-colors hover:bg-accent/6"
      >
        <ArrowsPointingInIcon className="h-4.5 w-4.5" aria-hidden="true" />
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-orientation={portrait ? 'vertical' : 'horizontal'}
        aria-valuemin={0}
        aria-valuemax={totalMonths - 1}
        aria-valuenow={cursorMonth}
        aria-valuetext={cursorLabel}
        aria-label="Jump to a point in time. Arrow keys move by month, hold Shift for years, Enter to go there."
        onKeyDown={onKeyDown}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        className={`absolute cursor-pointer outline-none ${
          // Extra inset on the button's side (bottom in portrait, right in
          // landscape) so the track end + parked playhead clear the corner
          // minimize button instead of crowding it.
          portrait ? 'inset-x-0 top-7 bottom-11' : 'inset-y-0 left-7 right-11'
        }`}
      >
        {bars}
        {yearLabels}

        {/* Hover flag — offset off the pointer so it never covers the aim point */}
        {hover && (
          <div
            aria-hidden="true"
            style={
              portrait
                ? { top: `${axisPos(hover.frac)}%`, right: 'calc(100% + 12px)', transform: 'translateY(-50%)' }
                : { left: `${axisPos(hover.frac)}%`, bottom: 'calc(100% + 12px)', transform: 'translateX(-50%)' }
            }
            className="pointer-events-none absolute z-3 whitespace-nowrap rounded-lg border border-accent/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-accent shadow-[0_6px_16px_-3px_rgba(0,0,0,0.22)]"
          >
            {hover.label}
          </div>
        )}

        {/* Keyboard cursor — primary/filled "Enter commits this jump" */}
        {steering && (
          <div className="absolute z-6 bg-accent" style={lineStyle(cursorFrac)} aria-hidden="true">
            <div
              className="absolute whitespace-nowrap rounded-lg border border-accent bg-accent px-2 py-0.75 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_6px_16px_-3px_rgba(132,90,44,0.4)]"
              style={chipPos}
            >
              {cursorLabel}
            </div>
          </div>
        )}

        {/* Playhead — ghost/umber "you are here"; recedes while steering */}
        <div
          aria-hidden="true"
          className="absolute z-2 rounded-xs bg-accent transition-[left,top,opacity] duration-120 motion-reduce:transition-none"
          style={{ ...lineStyle(playhead.frac), opacity: steering ? 0.4 : 1 }}
        >
          <div className="absolute" style={arrowStyle} />
          <div
            className="absolute whitespace-nowrap rounded-lg border border-accent/15 bg-white px-2 py-0.75 text-[11px] font-bold uppercase tracking-wider text-accent shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08)] transition-opacity duration-120"
            style={{ ...chipPos, opacity: steering ? 0 : 1 }}
          >
            {playhead.label}
          </div>
        </div>
      </div>
    </nav>
  );
}
