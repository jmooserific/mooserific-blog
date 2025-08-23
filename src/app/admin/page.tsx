"use client"

// Admin UI: drag & drop images, caption, create post
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PhotoIcon, FilmIcon, Bars2Icon, XMarkIcon } from "@heroicons/react/24/outline";

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
  }

  function handleItemDrop(overId: string) {
    if (!draggingId || draggingId === overId) return;
    setItems((cur) => {
      const fromIndex = cur.findIndex((i) => i.id === draggingId);
      const overIndex = cur.findIndex((i) => i.id === overId);
      if (fromIndex === -1 || overIndex === -1) return cur;
      if (cur[fromIndex].kind !== cur[overIndex].kind) return cur; // keep photos before videos
  const re = reorder(cur, fromIndex, overIndex);
  return normalizeGroupedOrder(re);
    });
    setDraggingId(null);
  }

  function removeItem(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    setUploadProgress((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });
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
        body: JSON.stringify({ id: folderId, description: caption, photos: photoAssets, videos: videoUrls })
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
            <ul className="mb-4 space-y-2">
              {items.map((it) => {
                const pct = uploadProgress[it.id] ?? 0;
                const sizeMB = it.file.size / (1024 * 1024);
                return (
                  <li
                    key={it.id}
                    className="text-sm text-gray-700"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleItemDrop(it.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-gray-400 cursor-grab active:cursor-grabbing"
                        draggable={!isSubmitting}
                        onDragStart={(e) => handleDragStart(e, it.id)}
                        onDragEnd={handleDragEnd}
                        title="Drag to reorder"
                      >
                        <Bars2Icon className="h-4 w-4" />
                      </span>
                      {it.kind === 'photo' ? (
                        <PhotoIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <FilmIcon className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="truncate flex-1">
                        {it.file.name} <span className="text-xs text-gray-400">({sizeMB.toFixed(2)} MB)</span>
                      </span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => removeItem(it.id)}
                        disabled={isSubmitting}
                        aria-label={`Remove ${it.file.name}`}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="w-full h-1 mt-1">
                      <div className="bg-blue-600 h-1" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <button type="submit" className={`bg-blue-600 text-white px-4 py-2 rounded ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  );
}
