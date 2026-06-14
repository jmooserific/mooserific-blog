"use client"

import { useEffect, useRef } from "react";
import { PhotoIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { UploadItem } from "./types";
import { planMediaLayout } from "./planMediaLayout";
import { MediaTile } from "./MediaTile";
import { usePointerReorder } from "./usePointerReorder";

interface MediaGridProps {
  items: UploadItem[];
  uploadProgress: Record<string, number>;
  disabled: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
}

/**
 * The media surface of the editor: real thumbnails laid out the way the post card
 * will render them — a full-bleed hero (when the first photo is landscape/square
 * and the count is 1 or 3+, via the shared {@link shouldLeadWithHero}) above
 * justified rows, photos before videos. Reordering re-flows the layout live, so
 * authors see the published grid take shape as they drag. Empty, it's a single
 * drop target.
 */
export function MediaGrid({ items, uploadProgress, disabled, onFiles, onRemove, onMove }: MediaGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { draggingId, onPointerDown } = usePointerReorder(containerRef, { onMove, disabled });

  // Preview URLs: cache an object URL per new file so it survives the
  // new→existing transition after upload (no reload flicker), and revoke on
  // removal/unmount. Loaded-from-server items use their R2 url directly.
  const urlCache = useRef<Map<string, string>>(new Map());
  const previewUrl = (item: UploadItem): string => {
    const cached = urlCache.current.get(item.id);
    if (cached) return cached;
    if (item.file && !item.url) {
      const url = URL.createObjectURL(item.file);
      urlCache.current.set(item.id, url);
      return url;
    }
    return item.url ?? "";
  };

  useEffect(() => {
    const live = new Set(items.map((i) => i.id));
    for (const [id, url] of urlCache.current) {
      if (!live.has(id)) {
        URL.revokeObjectURL(url);
        urlCache.current.delete(id);
      }
    }
  }, [items]);
  // Capture the map ref once for the unmount-only cleanup.
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  function pickFiles() {
    if (!disabled) fileInputRef.current?.click();
  }

  if (items.length === 0) {
    return (
      <div className="px-5">
        <Dropzone disabled={disabled} onFiles={onFiles} onClick={pickFiles} />
        <FileInput ref={fileInputRef} onFiles={onFiles} />
      </div>
    );
  }

  const { hero, rows, videos } = planMediaLayout(items);

  const tileProps = (item: UploadItem) => ({
    item,
    previewUrl: previewUrl(item),
    isDragging: draggingId === item.id,
    progress: uploadProgress[item.id],
    disabled,
    onRemove,
  });

  return (
    <div className="px-5">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onDragOver={(e) => { if (!disabled) e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
        className="flex flex-col gap-2"
      >
        {hero && <MediaTile {...tileProps(hero)} isHero showHeroBadge />}
        {rows.map((row) => (
          <div key={row[0].id} className="flex gap-2">
            {row.map((p) => (
              <MediaTile key={p.id} {...tileProps(p)} isHero={false} showHeroBadge={false} />
            ))}
          </div>
        ))}
        {videos.map((v) => (
          <MediaTile key={v.id} {...tileProps(v)} isHero showHeroBadge={false} />
        ))}
      </div>

      <div className="flex justify-center pt-3">
        <button
          type="button"
          onClick={pickFiles}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent/15 bg-transparent px-3.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add more
        </button>
      </div>

      <p className="pt-2 text-xs text-accent-muted">
        Lead with a landscape photo to feature it as a big hero. Drag any tile to reorder.
      </p>

      <FileInput ref={fileInputRef} onFiles={onFiles} />
    </div>
  );
}

interface DropzoneProps {
  disabled: boolean;
  onFiles: (files: File[]) => void;
  onClick: () => void;
}

function Dropzone({ disabled, onFiles, onClick }: DropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
      onDragOver={(e) => { if (!disabled) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
      className={`rounded-xl border-2 border-dashed px-5 py-9 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed border-gray-200 text-gray-400"
          : "cursor-pointer border-accent/20 text-accent hover:border-accent/40 hover:bg-accent/6"
      }`}
    >
      <PhotoIcon className="mx-auto mb-2.5 h-8 w-8 opacity-85" aria-hidden="true" />
      <div className="text-[15px] font-bold">Add photos &amp; videos</div>
      <div className="mt-1 text-xs text-accent-muted">Tap to choose from your library or camera · or drop here</div>
    </div>
  );
}

interface FileInputProps {
  ref: React.Ref<HTMLInputElement>;
  onFiles: (files: File[]) => void;
}

function FileInput({ ref, onFiles }: FileInputProps) {
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*,video/*"
      multiple
      className="hidden"
      onChange={(e) => {
        onFiles(Array.from(e.target.files ?? []));
        e.target.value = "";
      }}
    />
  );
}
