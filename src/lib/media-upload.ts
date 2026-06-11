import type { UploadItem } from '../app/admin/types';
import { withRetry, RetryableError, NonRetryableError, isRetryableStatus } from './retry';

// Client-side media upload orchestration. Extracted from the post-editor hook so the
// reliability behaviour — direct-to-R2 uploads, per-step retry, and persisting each
// completed upload so a mid-batch failure doesn't discard earlier work — is unit-testable
// without rendering React. Browser-only (uses fetch + XMLHttpRequest); never import in a
// server module.

export interface PresignResult {
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string;
  key: string;
}

export interface ProcessResult {
  baseUrl: string;
  width: number;
  height: number;
  originalUrl: string;
  originalContentType: string;
}

/** PUT a file to a presigned URL with progress, classifying failures for {@link withRetry}. */
export function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
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
      } else if (isRetryableStatus(xhr.status)) {
        reject(new RetryableError(`Upload failed (${xhr.status})`));
      } else {
        reject(new NonRetryableError(`Upload failed (${xhr.status})`));
      }
    };
    // A network drop mid-transfer is transient — let withRetry start a fresh PUT.
    xhr.onerror = () => reject(new RetryableError('Network error during upload'));
    xhr.send(file);
  });
}

/**
 * Derive a human-readable message from a failed API response. Our routes return
 * `{ error: string }` JSON; anything else (e.g. the HTML error page Next serves when
 * the server crashes before the handler runs) is summarized by status code rather
 * than dumped raw into the UI.
 */
export async function errorMessageFromResponse(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await res.json().catch(() => undefined)) as { error?: unknown } | undefined;
    if (body && typeof body.error === 'string' && body.error) return body.error;
  }
  return `Request failed (${res.status})`;
}

/** POST/GET JSON to one of our API routes, classifying failures for {@link withRetry}. */
export async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const message = await errorMessageFromResponse(res);
    throw isRetryableStatus(res.status) ? new RetryableError(message) : new NonRetryableError(message);
  }
  return res.json() as Promise<T>;
}

/**
 * Upload a photo reliably: presign → direct PUT of the original to R2 → ask the server
 * to generate variants. Each step is retried independently with backoff, so a single
 * blip on a slow connection doesn't lose the whole image. The slow ~20 MB transfer goes
 * straight to R2 and never counts against a serverless function timeout.
 */
export async function uploadPhoto(
  file: File,
  folderId: string,
  onProgress: (pct: number) => void,
): Promise<ProcessResult> {
  const presign = await withRetry(() => fetchJson<PresignResult>('/api/media/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, folderId, kind: 'photo' }),
  }));
  // Direct R2 PUT is ~85% of the work; the remaining 15% is server-side processing.
  await withRetry(() => putWithProgress(presign.uploadUrl, file, presign.headers, (pct) => onProgress(Math.round(pct * 0.85))));
  const processed = await withRetry(() => fetchJson<ProcessResult>('/api/media/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: presign.key, contentType: file.type }),
  }));
  onProgress(100);
  return processed;
}

/** Upload a video reliably: presign → direct PUT to R2, each step retried. */
export async function uploadVideo(
  file: File,
  filename: string,
  folderId: string,
  onProgress: (pct: number) => void,
): Promise<{ publicUrl: string }> {
  const presign = await withRetry(() => fetchJson<PresignResult>('/api/media/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: file.type, size: file.size, folderId, kind: 'video' }),
  }));
  await withRetry(() => putWithProgress(presign.uploadUrl, file, presign.headers, onProgress));
  onProgress(100);
  return { publicUrl: presign.publicUrl };
}

export interface UploadCallbacks {
  /** Report upload progress (0–100) for one item. */
  onProgress: (itemId: string, pct: number) => void;
  /**
   * Called the moment an item finishes uploading, before the next item starts. The
   * caller persists the patch so a later failure doesn't discard already-uploaded work.
   */
  onItemComplete: (itemId: string, patch: Partial<UploadItem>) => void;
}

/**
 * Upload every not-yet-uploaded item sequentially, marking each `existing` as it lands.
 * Returns the items with completed uploads patched in. Throws on the first item that
 * fails (after its retries) — by then every earlier item has already been reported via
 * `onItemComplete`, so the caller keeps that work and only the remaining items need a
 * retry. Sequential is deliberate: on one slow cellular pipe, parallel uploads share the
 * same bandwidth and raise the failure rate.
 */
export async function uploadPendingItems(
  items: UploadItem[],
  folderId: string,
  { onProgress, onItemComplete }: UploadCallbacks,
): Promise<UploadItem[]> {
  let working = items.slice();
  for (const it of items.filter((i) => i.source === 'new' && i.file)) {
    const file = it.file!;
    const reportProgress = (pct: number) => onProgress(it.id, pct);
    const uploaded: Partial<UploadItem> = it.kind === 'photo'
      ? await (async () => {
          const r = await uploadPhoto(file, folderId, reportProgress);
          return { url: r.baseUrl, width: r.width, height: r.height, originalUrl: r.originalUrl, originalContentType: r.originalContentType };
        })()
      : await (async () => {
          const r = await uploadVideo(file, it.filename, folderId, reportProgress);
          return { url: r.publicUrl };
        })();
    const patch: Partial<UploadItem> = { ...uploaded, source: 'existing', file: undefined };
    working = working.map((e) => (e.id === it.id ? { ...e, ...patch } : e));
    onItemComplete(it.id, patch);
  }
  return working;
}
