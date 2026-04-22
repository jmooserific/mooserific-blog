"use client"

import { Fragment } from "react";
import { PhotoIcon, FilmIcon, Bars2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import type { UploadItem } from "./types";

interface MediaItemRowProps {
  item: UploadItem;
  uploadProgress: Record<string, number>;
  isSubmitting: boolean;
  draggingId: string | null;
  dragOver: { id: string; position: 'before' | 'after' } | null;
  dropDisabled: boolean;
  itemRef: (el: HTMLLIElement | null) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (id: string, position: 'before' | 'after') => void;
  onRemove: (id: string) => void;
}

export function MediaItemRow({ item: it, uploadProgress, isSubmitting, draggingId, dragOver, dropDisabled, itemRef, onDragStart, onDragEnd, onDragOver, onDrop, onRemove }: MediaItemRowProps) {
  const progressValue = uploadProgress[it.id];
  const pct = progressValue ?? (it.source === 'existing' ? 100 : 0);
  const sizeMB = it.file ? it.file.size / (1024 * 1024) : null;
  const isDragging = draggingId === it.id;
  const showTopIndicator = dragOver?.id === it.id && dragOver.position === 'before';
  const showBottomIndicator = dragOver?.id === it.id && dragOver.position === 'after';
  const metaText = it.source === 'existing' ? 'existing asset' : sizeMB != null ? `${sizeMB.toFixed(2)} MB` : undefined;
  const showProgressBar = progressValue != null && (isSubmitting || progressValue < 100);

  return (
    <Fragment>
      {showTopIndicator && (
        <li
          className="h-px bg-[#845A2C]/70 rounded"
          role="separator"
          aria-hidden
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); onDrop(it.id, 'before'); }}
        />
      )}
      <li
        ref={itemRef}
        className={`relative text-sm text-gray-700 rounded ${isDragging ? 'opacity-50 bg-[#845A2C]/6 ring-1 ring-[#845A2C]/20' : ''}`}
        draggable={!dropDisabled}
        onDragStart={(e) => onDragStart(e, it.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, it.id)}
        onDrop={(e) => { e.preventDefault(); if (dragOver?.id === it.id) onDrop(it.id, dragOver.position); }}
      >
        <div className="flex items-center gap-2 py-1">
          <span className="text-gray-400 cursor-grab active:cursor-grabbing select-none" title="Drag to reorder" draggable={false}>
            <Bars2Icon className="h-4 w-4" />
          </span>
          {it.kind === 'photo' ? <PhotoIcon className="h-4 w-4 text-gray-500" /> : <FilmIcon className="h-4 w-4 text-gray-500" />}
          <span className="truncate flex-1" draggable={false}>
            {it.filename}
            {metaText && <span className="text-xs text-gray-400"> ({metaText})</span>}
          </span>
          <button
            type="button"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-900/6 hover:text-red-700/80 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50"
            onClick={() => onRemove(it.id)}
            disabled={dropDisabled}
            aria-label={`Remove ${it.filename}`}
            draggable={false}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        {showProgressBar && (
          <div className="w-full h-1 mt-1">
            <div className="bg-[#845A2C] h-1 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </li>
      {showBottomIndicator && (
        <li
          className="h-px bg-[#845A2C]/70 rounded"
          role="separator"
          aria-hidden
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); onDrop(it.id, 'after'); }}
        />
      )}
    </Fragment>
  );
}
