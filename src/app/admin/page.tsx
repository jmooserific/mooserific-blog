"use client"

// Admin UI: drag & drop images, caption, create post
import { Fragment, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PhotoIcon, FilmIcon, Bars2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import DateTimePopover from "@/components/DateTimePopover";

type UploadItem = {
  id: string;
  file: File;
  kind: "photo" | "video";
  width?: number;
  height?: number;
};

export default function AdminPage() {
  const [caption, setCaption] = useState<string>("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const folderId = useMemo(() => crypto.randomUUID(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [postDate, setPostDate] = useState<Date | null>(new Date());
  const [showDatePopover, setShowDatePopover] = useState(false);

  function measurePositions() {
    const map: Record<string, number> = {};
    for (const [id, el] of Object.entries(itemRefs.current)) {
      if (el) map[id] = el.getBoundingClientRect().top;
    }
    return map;
  }

  function animateReorder(prevPositions: Record<string, number>) {
    // Double rAF to ensure DOM has re-rendered before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const [id, el] of Object.entries(itemRefs.current)) {
          if (!el) continue;
          const prevTop = prevPositions[id];
          const newTop = el.getBoundingClientRect().top;
          if (prevTop == null) continue;
          const dy = prevTop - newTop;
          if (Math.abs(dy) < 1) continue;
          el.style.transition = 'transform 0s';
          el.style.transform = `translateY(${dy}px)`;
          el.style.willChange = 'transform';
          // Next frame: animate back to place
          requestAnimationFrame(() => {
            el.style.transition = 'transform 180ms ease';
            el.style.transform = '';
            const cleanup = () => {
              el.style.transition = '';
              el.style.willChange = '';
              el.removeEventListener('transitionend', cleanup);
            };
            el.addEventListener('transitionend', cleanup);
          });
        }
      });
    });
  }

  function normalizeGroupedOrder(arr: UploadItem[]) {
    const photos = arr.filter((i) => i.kind === 'photo');
    const videos = arr.filter((i) => i.kind === 'video');
    return [...photos, ...videos];
  }

  function addFilesToItems(newFiles: File[]) {
    if (newFiles.length === 0) return;
    setItems((prev) => {
      const remaining = Math.max(0, 10 - prev.length);
      const toAdd = newFiles.slice(0, remaining);
      const created: UploadItem[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        kind: file.type.startsWith("image/") ? "photo" : "video",
      }));
      // After state commit, asynchronously populate image dimensions
      queueMicrotask(() => {
        created.forEach((it) => {
          if (it.kind === "photo") {
            const img = new window.Image();
            const url = URL.createObjectURL(it.file);
            img.onload = () => {
              setItems((cur) => cur.map((c) => (c.id === it.id ? { ...c, width: img.width, height: img.height } : c)));
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }
        });
      });
  const next = [...prev, ...created];
  return normalizeGroupedOrder(next);
    });
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
  const droppedFiles = Array.from(e.dataTransfer.files);
  addFilesToItems(droppedFiles);
  }

  function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void) {
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(null, { status: xhr.status }));
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  function reorder(array: UploadItem[], from: number, to: number) {
    const copy = array.slice();
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOver(null);
  }

  function handleDragOverItem(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === overId) {
      setDragOver(null);
      return;
    }
    const from = items.find((i) => i.id === draggingId);
    const over = items.find((i) => i.id === overId);
    if (!from || !over) return;

    // Enforce photos before videos group rule
    if (from.kind !== over.kind) {
      e.dataTransfer.dropEffect = 'none';
      setDragOver(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ id: overId, position });
  }

  function handleItemDrop(overId: string, position: 'before' | 'after') {
    if (!draggingId || draggingId === overId) return;
    // Measure before positions for FLIP
    const prevPositions = measurePositions();

    const fromIndex = items.findIndex((i) => i.id === draggingId);
    const overIndex = items.findIndex((i) => i.id === overId);
    if (fromIndex === -1 || overIndex === -1) return;
    if (items[fromIndex].kind !== items[overIndex].kind) return; // keep photos before videos

    let toIndex = position === 'before' ? overIndex : overIndex + 1;
    if (fromIndex < toIndex) toIndex -= 1;

    const next = items.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDraggingId(null);
    setDragOver(null);
    animateReorder(prevPositions);
  }

  function removeItem(id: string) {
    const prevPositions = measurePositions();
    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    setUploadProgress((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });
    animateReorder(prevPositions);
  }

  async function handleSubmit() {
    try {
      if (items.length === 0) {
        alert('Select at least one file');
        return;
      }
      setIsSubmitting(true);
      setUploadProgress({});
      // 1. Direct upload each file to R2 via presigned URL
      const uploaded: { id: string; kind: "photo" | "video"; url: string; filename: string }[] = [];
      for (const it of items) {
        const file = it.file;
        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, folderId })
        });
        if (!presignRes.ok) {
          throw new Error(await presignRes.text());
        }
        const presign = await presignRes.json();
        await putWithProgress(presign.uploadUrl, file, presign.headers, (pct) => {
          setUploadProgress((prev) => ({ ...prev, [it.id]: pct }));
        });
        setUploadProgress((prev) => ({ ...prev, [it.id]: 100 }));
        uploaded.push({ id: it.id, kind: it.kind, url: presign.publicUrl, filename: file.name });
      }
      // Preserve current ordering while ensuring photos precede videos due to UI constraint
      const photoUploaded = uploaded.filter(u => u.kind === 'photo');
      const videoUploaded = uploaded.filter(u => u.kind === 'video');
      const photoAssets = photoUploaded.map(u => {
        const it = items.find(i => i.id === u.id);
        const width = it?.width ?? 800;
        const height = it?.height ?? 600;
        return { url: u.url, width, height };
      });
      const videoUrls: string[] = videoUploaded.map(u => u.url);
      // 2. Create post record
      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId, description: caption, photos: photoAssets, videos: videoUrls, date: postDate ? postDate.toISOString() : undefined })
      });
      if (!postRes.ok) {
        throw new Error(await postRes.text());
      }
  const created = await postRes.json();
  toast.success('Post created', { description: `ID: ${created.id}` });
  setCaption('');
  setItems([]);
      setUploadProgress({});
    } catch (e: any) {
      toast.error('Failed to create post', { description: e.message || 'Unknown error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-6">
        <a href="/" className="text-blue-600 hover:underline text-sm">← Back to posts</a>
      </nav>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 text-center">Create a new post</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          className="appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 my-0"
          rows={3}
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="prose text-gray-600 text-xs italic">Use <a href="https://commonmark.org/help/" target="_blank">Markdown</a> to style</p>
        <div
          className="border-dashed border-2 border-gray-300 rounded p-8 text-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Drop photos or videos here<br />
          <span className="text-xs text-gray-400">or click to select</span>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const inputFiles = Array.from(e.target.files || []);
              addFilesToItems(inputFiles);
            }}
          />
        </div>
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {isSubmitting ? 'Uploading media…' : 'Ready to upload'}
            </div>
            <ul
              className="mb-4 space-y-2"
              onDragOver={(e) => {
                // Allow dropping anywhere in the list while dragging
                if (draggingId) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragOver) {
                  handleItemDrop(dragOver.id, dragOver.position);
                }
              }}
            >
              {items.map((it) => {
                const pct = uploadProgress[it.id] ?? 0;
                const sizeMB = it.file.size / (1024 * 1024);
                const isDragging = draggingId === it.id;
                const showTopIndicator = dragOver && dragOver.id === it.id && dragOver.position === 'before';
                const showBottomIndicator = dragOver && dragOver.id === it.id && dragOver.position === 'after';
                return (
                  <Fragment key={it.id}>
                    {showTopIndicator && (
                      <li
                        className="h-px bg-blue-500/70 rounded"
                        role="separator"
                        aria-hidden
                        onDragOver={(e) => {
                          e.preventDefault();
                          // Keep indicator active as before position
                          setDragOver({ id: it.id, position: 'before' });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleItemDrop(it.id, 'before');
                        }}
                      />
                    )}
                    <li
                      ref={(el) => {
                        itemRefs.current[it.id] = el;
                      }}
                    className={`relative text-sm text-gray-700 rounded ${isDragging ? 'opacity-50 bg-blue-50 ring-1 ring-blue-200' : ''}`}
                    draggable={!isSubmitting}
                    onDragStart={(e) => handleDragStart(e, it.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverItem(e, it.id)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragOver?.id === it.id) {
                        handleItemDrop(it.id, dragOver.position);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 py-1">
                      <span
                        className="text-gray-400 cursor-grab active:cursor-grabbing select-none"
                        title="Drag to reorder"
                        draggable={false}
                      >
                        <Bars2Icon className="h-4 w-4" />
                      </span>
                      {it.kind === 'photo' ? (
                        <PhotoIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <FilmIcon className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="truncate flex-1" draggable={false}>
                        {it.file.name} <span className="text-xs text-gray-400">({sizeMB.toFixed(2)} MB)</span>
                      </span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => removeItem(it.id)}
                        disabled={isSubmitting}
                        aria-label={`Remove ${it.file.name}`}
                        draggable={false}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="w-full h-1 mt-1">
                      <div className="bg-blue-600 h-1" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                  {showBottomIndicator && (
                    <li
                      className="h-px bg-blue-500/70 rounded"
                      role="separator"
                      aria-hidden
                      onDragOver={(e) => {
                        e.preventDefault();
                        // Keep indicator active as after position
                        setDragOver({ id: it.id, position: 'after' });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleItemDrop(it.id, 'after');
                      }}
                    />
                  )}
                  </Fragment>
                );
              })}
            </ul>
          </div>
        )}
        {/* Advanced section */}
        <details className="mt-4" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer select-none py-2 text-sm font-medium text-gray-600">
            Advanced
          </summary>
          <div className="pb-4 pt-2 space-y-3">
            {/* Date/Time field */}
            <div className="relative">
              <button
                type="button"
                className="w-full text-left rounded-md border border-gray-300 px-3 py-2 text-gray-800 bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-haspopup="dialog"
                aria-expanded={showDatePopover}
                onClick={() => setShowDatePopover((v) => !v)}
              >
                {postDate ? new Date(postDate).toLocaleString() : 'Use current date/time'}
              </button>
              {showDatePopover && (
                <div className="absolute left-0 top-full mt-2">
                  <DateTimePopover
                    initialDate={postDate ?? undefined}
                    onApply={(d) => setPostDate(d)}
                    onClose={() => setShowDatePopover(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </details>
        <button type="submit" className={`bg-blue-600 text-white px-4 py-2 rounded ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  );
}
