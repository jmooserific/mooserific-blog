"use client"

import { MediaItemRow } from "./MediaItemRow";
import type { UploadItem } from "./types";

interface MediaUploaderProps {
  items: UploadItem[];
  uploadProgress: Record<string, number>;
  isSubmitting: boolean;
  loadingExisting: boolean;
  dropDisabled: boolean;
  draggingId: string | null;
  dragOver: { id: string; position: 'before' | 'after' } | null;
  itemRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>;
  onDrop: (e: React.DragEvent) => void;
  onFiles: (files: File[]) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onItemDrop: (id: string, position: 'before' | 'after') => void;
  onRemove: (id: string) => void;
}

export function MediaUploader({ items, uploadProgress, isSubmitting, loadingExisting, dropDisabled, draggingId, dragOver, itemRefs, onDrop, onFiles, onDragStart, onDragEnd, onDragOver, onItemDrop, onRemove }: MediaUploaderProps) {
  return (
    <>
      <div
        className={`rounded-[10px] border-2 border-dashed p-8 text-center transition-colors ${dropDisabled ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400' : 'cursor-pointer border-accent/20 text-accent hover:border-accent/40 hover:bg-accent/6'}`}
        onDrop={onDrop}
        onDragOver={(e) => { if (!dropDisabled) e.preventDefault(); }}
        onClick={() => { if (!dropDisabled) document.getElementById('file-upload')?.click(); }}
      >
        {dropDisabled ? 'Uploading or loading…' : 'Drop photos or videos here'}<br />
        {!dropDisabled && <span className="text-xs text-accent/70">or click to select</span>}
        <input
          id="file-upload"
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: 'none' }}
          disabled={dropDisabled}
          onChange={(e) => {
            if (dropDisabled) { e.target.value = ''; return; }
            onFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </div>
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {loadingExisting ? 'Loading post media…' : isSubmitting ? 'Uploading media…' : ''}
          </div>
          <ul
            className="mb-4 space-y-2"
            onDragOver={(e) => { if (draggingId) e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (dragOver) onItemDrop(dragOver.id, dragOver.position); }}
          >
            {items.map((it) => (
              <MediaItemRow
                key={it.id}
                item={it}
                uploadProgress={uploadProgress}
                isSubmitting={isSubmitting}
                draggingId={draggingId}
                dragOver={dragOver}
                dropDisabled={dropDisabled}
                itemRef={(el) => { itemRefs.current[it.id] = el; }}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onItemDrop}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
