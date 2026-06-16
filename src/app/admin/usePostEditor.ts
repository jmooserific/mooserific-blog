"use client"

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { UploadItem } from "./types";
import { slugFromDate } from "@/utils/slug";
import { withRetry } from "@/lib/retry";
import { errorMessageFromResponse, fetchJson, uploadPendingItems } from "@/lib/media-upload";
import { reorderWithinKind } from "./reorder";

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

// --- Types ---

interface PostPhoto {
  url: string;
  width?: number;
  height?: number;
  originalUrl?: string;
  originalContentType?: string;
}

interface PostApiResponse {
  id: string;
  slug?: string;
  date?: string;
  description?: string;
  photos: Array<PostPhoto | string>;
  videos?: string[];
}

interface PostPayload {
  description: string;
  photos: Array<{ url: string; width: number; height: number; originalUrl?: string; originalContentType?: string }>;
  videos: string[];
  id?: string;
  slug?: string;
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
  slug: string;
  setSlug: (v: string) => void;
  slugChanged: boolean; // true while editing once the slug differs from the published one
  showDatePopover: boolean;
  setShowDatePopover: React.Dispatch<React.SetStateAction<boolean>>;
  dropDisabled: boolean;
  addFilesToItems: (files: File[]) => void;
  moveItem: (fromId: string, toId: string) => void;
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [postDate, setPostDate] = useState<Date | null>(new Date());
  // Permalink slug. While creating a new post the slug tracks the date automatically
  // until the author types their own; once published it's frozen (only changes if
  // explicitly edited). `originalSlug` is the published value we compare against on edit.
  const [slug, setSlugValue] = useState<string>(() => slugFromDate(new Date().toISOString()));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const editParam = searchParams.get("edit");

  // Author typed their own slug — stop auto-deriving it from the date.
  const setSlug = useCallback((v: string) => {
    setSlugValue(v);
    setSlugManuallyEdited(true);
  }, []);

  // For a new post, keep the slug in sync with the chosen date until the author
  // overrides it. On edit the slug is frozen, so this is a no-op there.
  useEffect(() => {
    if (editParam) return;
    if (slugManuallyEdited) return;
    if (postDate) setSlugValue(slugFromDate(postDate.toISOString()));
  }, [postDate, editParam, slugManuallyEdited]);

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
        throw new Error(await errorMessageFromResponse(res));
      }
      const post = await res.json() as PostApiResponse;
      const fetched: UploadItem[] = [];
      if (Array.isArray(post.photos)) {
        post.photos.forEach((photo, index) => {
          const url = typeof photo === 'string' ? photo : photo.url;
          const width = typeof photo === 'object' ? (photo.width ?? 800) : 800;
          const height = typeof photo === 'object' ? (photo.height ?? 600) : 600;
          const originalUrl = typeof photo === 'object' ? photo.originalUrl : undefined;
          const originalContentType = typeof photo === 'object' ? photo.originalContentType : undefined;
          fetched.push({ id: crypto.randomUUID(), kind: "photo", source: "existing", filename: filenameFromUrl(url, `photo-${index + 1}`), url, width, height, originalUrl, originalContentType });
        });
      }
      if (Array.isArray(post.videos)) {
        post.videos.forEach((video, index) => {
          fetched.push({ id: crypto.randomUUID(), kind: "video", source: "existing", filename: filenameFromUrl(video, `video-${index + 1}`), url: video });
        });
      }
      setItems(normalizeGroupedOrder(fetched));
      setCaption(post.description || "");
      setFolderId(post.id);
      const parsedDate = typeof post.date === "string" ? new Date(post.date) : null;
      setPostDate(parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date());
      // Load the published slug; frozen unless the author changes it.
      const loadedSlug = post.slug || post.id;
      setSlugValue(loadedSlug);
      setOriginalSlug(loadedSlug);
      setSlugManuallyEdited(false);
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
      // Back to a fresh draft: slug auto-tracks the date again.
      setSlugManuallyEdited(false);
      setOriginalSlug(null);
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

  // Reorder via the pointer-drag grid: move `fromId` to where `toId` sits, keeping
  // photos and videos grouped (the rule lives in reorderWithinKind). Disabled while
  // loading/submitting so the list can't shift mid-upload.
  function moveItem(fromId: string, toId: string) {
    if (loadingExisting || isSubmitting) return;
    setItems((cur) => reorderWithinKind(cur, fromId, toId));
  }

  function removeItem(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    setUploadProgress((cur) => { const next = { ...cur }; delete next[id]; return next; });
  }

  async function handleSubmit() {
    if (loadingExisting) { toast.info('Please wait until the selected post finishes loading'); return; }
    if (items.length === 0) { alert('Select at least one file'); return; }
    setIsSubmitting(true);
    setUploadProgress({});
    const effectiveId = editingId ?? folderId;
    let workingItems = items.slice();

    // Phase 1: upload media. uploadPendingItems retries each step with backoff and reports
    // every completed upload via onItemComplete — we persist those to state immediately, so
    // if a later item fails on a flaky connection the work already done isn't lost and
    // re-submitting only re-uploads what's left (completed items are now `source: 'existing'`).
    try {
      workingItems = await uploadPendingItems(workingItems, effectiveId, {
        onProgress: (id, pct) => setUploadProgress((prev) => ({ ...prev, [id]: pct })),
        onItemComplete: (id, patch) => setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error('Failed to upload media', { description: message });
      setIsSubmitting(false);
      return;
    }

    // Phase 2: create or update the post.
    try {
      const photoAssets = workingItems.filter((i) => i.kind === 'photo').map((p) => {
        if (!p.url) throw new Error(`Missing URL for photo ${p.filename}`);
        return {
          url: p.url,
          width: p.width ?? 800,
          height: p.height ?? 600,
          ...(p.originalUrl ? { originalUrl: p.originalUrl } : {}),
          ...(p.originalContentType ? { originalContentType: p.originalContentType } : {}),
        };
      });
      const videoUrls = workingItems.filter((i) => i.kind === 'video').map((v) => {
        if (!v.url) throw new Error(`Missing URL for video ${v.filename}`);
        return v.url;
      });
      if (photoAssets.length === 0 && videoUrls.length === 0) throw new Error('At least one photo or video is required');

      const payload: PostPayload = { description: caption, photos: photoAssets, videos: videoUrls };
      if (!editingId) payload.id = effectiveId;
      if (postDate) payload.date = postDate.toISOString();
      // Send the slug only when it's a deliberate choice: a custom slug on a new
      // post, or a changed slug on an edit. Otherwise let the server derive it.
      const trimmedSlug = slug.trim();
      if (!editingId) {
        if (slugManuallyEdited && trimmedSlug) payload.slug = trimmedSlug;
      } else if (trimmedSlug && trimmedSlug !== originalSlug) {
        payload.slug = trimmedSlug;
      }

      const endpoint = editingId ? `/api/posts/${encodeURIComponent(editingId)}` : '/api/posts';
      // The post `id` is client-supplied and deterministic, so a retried request after a
      // network drop can't create a duplicate — at worst it conflicts and surfaces a 4xx,
      // which fetchJson treats as non-retryable.
      const saved = await withRetry(() => fetchJson<{ id: string; slug: string }>(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));

      toast.success(editingId ? 'Post updated' : 'Post created', { description: `ID: ${saved.id}` });
      // Land the author on the post's permalink so they can see the result.
      router.push(`/p/${encodeURIComponent(saved.slug)}`);
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
    slug, setSlug,
    slugChanged: Boolean(editingId) && slug.trim() !== originalSlug,
    showDatePopover, setShowDatePopover,
    dropDisabled: loadingExisting || isSubmitting,
    addFilesToItems, moveItem,
    removeItem, handleSubmit,
  };
}
