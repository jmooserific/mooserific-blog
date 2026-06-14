"use client"

import { ArrowsPointingOutIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type { UploadItem } from "./types";

interface MediaTileProps {
  item: UploadItem;
  previewUrl: string;
  isHero: boolean;
  showHeroBadge: boolean;
  isDragging: boolean;
  /** Upload progress 0–100, or undefined when not uploading. */
  progress?: number;
  disabled: boolean;
  onRemove: (id: string) => void;
}

/**
 * A single draggable thumbnail in the editor grid. Presentational: pointer-drag
 * is orchestrated by {@link MediaGrid} via the `data-tile-id` hook, so this only
 * renders the preview, the affordances, and any upload progress. Row tiles size
 * themselves by aspect ratio (`flex-grow` ∝ ratio, `flex-basis: 0`) so a row of
 * mixed shapes lands at one justified height — the same look the post card's
 * justified rows produce. The hero tile spans full width.
 */
export function MediaTile({
  item, previewUrl, isHero, showHeroBadge, isDragging, progress, disabled, onRemove,
}: MediaTileProps) {
  const ratio = item.width && item.height ? item.width / item.height : 1.5;
  const style: React.CSSProperties = isHero
    ? { aspectRatio: `${item.width ?? 3} / ${item.height ?? 2}` }
    : { flex: `${ratio} 1 0`, aspectRatio: `${item.width ?? 3} / ${item.height ?? 2}`, minWidth: 0 };
  const uploading = progress != null && progress < 100;

  return (
    <div
      data-tile-id={item.id}
      style={style}
      className={`group relative overflow-hidden rounded-xl bg-gray-100 select-none touch-none ${
        isDragging ? "opacity-40" : ""
      } ${isHero ? "w-full" : ""}`}
    >
      {item.kind === "video" ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <PlayIcon className="h-11 w-11 text-white/90 drop-shadow" aria-hidden="true" />
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" draggable={false} className="h-full w-full object-cover" />
      )}

      {/* hover scrim for affordance legibility */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />

      {showHeroBadge && (
        <span className="absolute left-2 top-2 rounded-md bg-accent/90 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
          Hero
        </span>
      )}

      <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/35 px-1.5 py-0.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <ArrowsPointingOutIcon className="h-3 w-3" aria-hidden="true" /> drag
      </span>

      {!disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          aria-label={`Remove ${item.filename}`}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-red-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white group-hover:opacity-100"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {uploading && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
          <span className="block h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </span>
      )}
    </div>
  );
}
