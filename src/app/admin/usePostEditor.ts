"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { UploadItem } from "./types";

// --- Pure utilities ---

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return decodeURIComponent(last);
  } catch {
    const segments = url.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return decodeURIComponent(last);
  }
  return fallback;
}

function normalizeGroupedOrder(arr: UploadItem[]): UploadItem[] {
  const photos = arr.filter((i) => i.kind === 'photo');
  const videos = arr.filter((i) => i.kind === 'video');
  return [...photos, ...videos];
}

function measurePositions(
  itemRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [id, el] of Object.entries(itemRefs.current)) {
    if (el) map[id] = el.getBoundingClientRect().top;
  }
  return map;
}

function animateReorder(
  prevPositions: Record<string, number>,
  itemRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>
): void {
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

// --- XHR upload helpers ---

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
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

function postImageWithProgress(
  file: File,
  folderId: string,
  onProgress: (pct: number) => void,
): Promise<{ baseUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload-image', true);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        // Cap at 90% — the remaining 10% represents server-side Sharp processing
        onProgress(Math.min(90, Math.round((evt.loaded / evt.total) * 90)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        const msg = (() => {
          try { return (JSON.parse(xhr.responseText) as { error?: string }).error || `Upload failed (${xhr.status})`; }
          catch { return `Upload failed (${xhr.status})`; }
        })();
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    const form = new FormData();
    form.append('file', file);
    form.append('folderId', folderId);
    xhr.send(form);
  });
}

// --- Types ---

interface PostPhoto {
  url: string;
  width?: number;
  height?: number;
}

interface PostApiResponse {
  id: string;
  date?: string;
  description?: string;
  photos: Array<PostPhoto | string>;
  videos?: string[];
}

interface PresignResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string;
}

interface PostPayload {
  description: string;
  photos: Array<{ url: string; width: number; height: number }>;
  videos: string[];
  id?: string;
  date?: string;
}

export interface PostEditorState {
  caption: string;
  setCaption: (v: string) => void;
  items: UploadItem[];
  editingId: string | null;
  isEditing: boolean;
  isSubmitting: boolean;
  loadingExisting: boolean;
  uploadProgress: Record<string, number>;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  postDate: Date | null;
  setPostDate: (d: Date | null) => void;
  showDatePopover: boolean;
  setShowDatePopover: React.Dispatch<React.SetStateAction<boolean>>;
  dropDisabled: boolean;
  handleDrop: (e: React.DragEvent) => void;
  addFilesToItems: (files: File[]) => void;
  draggingId: string | null;
  dragOver: { id: string; position: 'before' | 'after' } | null;
  itemRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragEnd: () => void;
  handleDragOverItem: (e: React.DragEvent, id: string) => void;
  handleItemDrop: (id: string, position: 'before' | 'after') => void;
  removeItem: (id: string) => void;
  handleSubmit: () => Promise<void>;
}

// --- Hook ---

export function usePostEditor(): PostEditorState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [caption, setCaption] = useState<string>("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [folderId, setFolderId] = useState<string>(() => crypto.randomUUID());
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [postDate, setPostDate] = useState<Date | null>(new Date());
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const editParam = searchParams.get("edit");

  const loadPost = useCallback(async (id: string) => {
    setEditingId(id);
    setLoadingExisting(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.status === 404) {
        toast.error("Post not found", { description: id });
        setEditingId(null);
        setFolderId(crypto.randomUUID());
        setItems([]);
        setCaption("");
        setPostDate(new Date());
        setShowAdvanced(false);
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load post");
      }
      const post = await res.json() as PostApiResponse;
      const fetched: UploadItem[] = [];
      if (Array.isArray(post.photos)) {
        post.photos.forEach((photo, index) => {
          const url = typeof photo === 'string' ? photo : photo.url;
          const width = typeof photo === 'object' ? (photo.width ?? 800) : 800;
          const height = typeof photo === 'object' ? (photo.height ?? 600) : 600;
          fetched.push({ id: crypto.randomUUID(), kind: "photo", source: "existing", filename: filenameFromUrl(url, `photo-${index + 1}`), url, width, height });
        });
      }
      if (Array.isArray(post.videos)) {
        post.videos.forEach((video, index) => {
          fetched.push({ id: crypto.randomUUID(), kind: "video", source: "existing", filename: filenameFromUrl(video, `video-${index + 1}`), url: video });
        });
      }
      setItems(normalizeGroupedOrder(fetched));
      setDragOver(null);
      setDraggingId(null);
      setCaption(post.description || "");
      setFolderId(post.id);
      const parsedDate = typeof post.date === "string" ? new Date(post.date) : null;
      setPostDate(parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date());
      setUploadProgress({});
      setShowAdvanced(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error("Failed to load post", { description: message });
    } finally {
      setLoadingExisting(false);
    }
  }, [router]);

  useEffect(() => {
    if (editParam) {
      if (editingId !== editParam) {
        setEditingId(editParam);
        loadPost(editParam);
      }
    } else {
      if (editingId !== null) setEditingId(null);
      setCaption("");
      setItems([]);
      setFolderId(crypto.randomUUID());
      setPostDate(new Date());
      setUploadProgress({});
      setShowAdvanced(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, loadPost, editingId]);

  function addFilesToItems(newFiles: File[]) {
    if (newFiles.length === 0) return;
    setItems((prev) => {
      const toAdd = newFiles.slice(0, Math.max(0, 20 - prev.length));
      const created: UploadItem[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        filename: file.name,
        kind: file.type.startsWith("image/") ? "photo" : "video",
        source: "new",
      }));
      // After state commit, asynchronously populate image dimensions
      queueMicrotask(() => {
        created.forEach((it) => {
          if (it.kind === "photo" && it.file) {
            const img = new window.Image();
            const url = URL.createObjectURL(it.file);
            img.onload = () => {
              setItems((cur) => cur.map((c) => c.id === it.id ? { ...c, width: img.width, height: img.height } : c));
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }
        });
      });
      return normalizeGroupedOrder([...prev, ...created]);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (loadingExisting || isSubmitting) return;
    addFilesToItems(Array.from(e.dataTransfer.files));
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    if (isSubmitting || loadingExisting) { e.preventDefault(); return; }
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
    if (isSubmitting || loadingExisting) { setDragOver(null); return; }
    if (!draggingId || draggingId === overId) { setDragOver(null); return; }
    const from = items.find((i) => i.id === draggingId);
    const over = items.find((i) => i.id === overId);
    if (!from || !over) return;
    // Enforce photos-before-videos group rule
    if (from.kind !== over.kind) { e.dataTransfer.dropEffect = 'none'; setDragOver(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ id: overId, position });
  }

  function handleItemDrop(overId: string, position: 'before' | 'after') {
    if (!draggingId || draggingId === overId) return;
    const prevPositions = measurePositions(itemRefs);
    const fromIndex = items.findIndex((i) => i.id === draggingId);
    const overIndex = items.findIndex((i) => i.id === overId);
    if (fromIndex === -1 || overIndex === -1) return;
    if (items[fromIndex].kind !== items[overIndex].kind) return;
    let toIndex = position === 'before' ? overIndex : overIndex + 1;
    if (fromIndex < toIndex) toIndex -= 1;
    const next = items.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDraggingId(null);
    setDragOver(null);
    animateReorder(prevPositions, itemRefs);
  }

  function removeItem(id: string) {
    const prevPositions = measurePositions(itemRefs);
    setItems((cur) => cur.filter((i) => i.id !== id));
    setUploadProgress((cur) => { const next = { ...cur }; delete next[id]; return next; });
    animateReorder(prevPositions, itemRefs);
  }

  async function handleSubmit() {
    try {
      if (loadingExisting) { toast.info('Please wait until the selected post finishes loading'); return; }
      if (items.length === 0) { alert('Select at least one file'); return; }
      setIsSubmitting(true);
      setUploadProgress({});
      const effectiveId = editingId ?? folderId;
      let workingItems = items.slice();

      for (const it of workingItems.filter((i) => i.source === 'new' && i.file)) {
        const file = it.file!;
        if (it.kind === 'photo') {
          const result = await postImageWithProgress(file, effectiveId, (pct) => {
            setUploadProgress((prev) => ({ ...prev, [it.id]: pct }));
          });
          setUploadProgress((prev) => ({ ...prev, [it.id]: 100 }));
          workingItems = workingItems.map((entry) => entry.id === it.id
            ? { ...entry, url: result.baseUrl, width: result.width, height: result.height, source: 'existing' as const, file: undefined }
            : entry);
        } else {
          const presignRes = await fetch('/api/media/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: it.filename, contentType: file.type, size: file.size, folderId: effectiveId, kind: it.kind }),
          });
          if (!presignRes.ok) throw new Error(await presignRes.text());
          const presign = await presignRes.json() as PresignResponse;
          await putWithProgress(presign.uploadUrl, file, presign.headers, (pct) => {
            setUploadProgress((prev) => ({ ...prev, [it.id]: pct }));
          });
          setUploadProgress((prev) => ({ ...prev, [it.id]: 100 }));
          workingItems = workingItems.map((entry) => entry.id === it.id
            ? { ...entry, url: presign.publicUrl, source: 'existing' as const, file: undefined }
            : entry);
        }
      }
      setItems(workingItems);

      const photoAssets = workingItems.filter((i) => i.kind === 'photo').map((p) => {
        if (!p.url) throw new Error(`Missing URL for photo ${p.filename}`);
        return { url: p.url, width: p.width ?? 800, height: p.height ?? 600 };
      });
      const videoUrls = workingItems.filter((i) => i.kind === 'video').map((v) => {
        if (!v.url) throw new Error(`Missing URL for video ${v.filename}`);
        return v.url;
      });
      if (photoAssets.length === 0 && videoUrls.length === 0) throw new Error('At least one photo or video is required');

      const payload: PostPayload = { description: caption, photos: photoAssets, videos: videoUrls };
      if (!editingId) payload.id = effectiveId;
      if (postDate) payload.date = postDate.toISOString();

      const endpoint = editingId ? `/api/posts/${encodeURIComponent(editingId)}` : '/api/posts';
      const res = await fetch(endpoint, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json() as { id: string };

      if (editingId) {
        toast.success('Post updated', { description: `ID: ${saved.id}` });
        await loadPost(saved.id);
        router.refresh();
      } else {
        toast.success('Post created', { description: `ID: ${saved.id}` });
        setCaption('');
        setItems([]);
        setFolderId(crypto.randomUUID());
        setUploadProgress({});
        setPostDate(new Date());
        router.refresh();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error(editingId ? 'Failed to update post' : 'Failed to create post', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    caption, setCaption,
    items,
    editingId, isEditing,
    isSubmitting, loadingExisting,
    uploadProgress,
    showAdvanced, setShowAdvanced,
    postDate, setPostDate,
    showDatePopover, setShowDatePopover,
    dropDisabled: loadingExisting || isSubmitting,
    handleDrop, addFilesToItems,
    draggingId, dragOver, itemRefs,
    handleDragStart, handleDragEnd, handleDragOverItem, handleItemDrop,
    removeItem, handleSubmit,
  };
}
