import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UploadItem } from '../app/admin/types';
import { putWithProgress, fetchJson, uploadPhoto, uploadVideo, uploadPendingItems } from './media-upload';
import { RetryableError, NonRetryableError } from './retry';

// --- Test doubles for the browser APIs these helpers use ---

interface XhrControl {
  status: number;
  networkError: boolean;
  progress: Array<{ loaded: number; total: number; lengthComputable: boolean }>;
}
let xhrControl: XhrControl;

class FakeXHR {
  upload: { onprogress?: (e: { loaded: number; total: number; lengthComputable: boolean }) => void } = {};
  status = 200;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  send() {
    if (xhrControl.networkError) {
      this.onerror?.();
      return;
    }
    for (const e of xhrControl.progress) this.upload.onprogress?.(e);
    this.status = xhrControl.status;
    this.onload?.();
  }
}

function fakeFile(name: string, type: string): File {
  return { name, type, size: 1234 } as unknown as File;
}

function jsonResponse(data: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function htmlResponse(html: string, init: { status?: number } = {}) {
  const { status = 500 } = init;
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    json: async () => { throw new SyntaxError('not JSON'); },
    text: async () => html,
  } as unknown as Response;
}

const PRESIGN = '/api/media/presign';
const PROCESS = '/api/media/process';

const presignBody = (filename: string) => ({
  uploadUrl: 'https://r2.example/put',
  headers: { 'Content-Type': 'image/jpeg' },
  publicUrl: `https://cdn.example/${filename}`,
  key: `photos/p/uuid/${filename}`,
});
const processBody = {
  baseUrl: 'https://cdn.example/base',
  width: 100,
  height: 200,
  originalUrl: 'https://cdn.example/orig.jpg',
  originalContentType: 'image/jpeg',
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  xhrControl = { status: 200, networkError: false, progress: [{ loaded: 100, total: 100, lengthComputable: true }] };
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('putWithProgress', () => {
  it('resolves and reports progress on a 2xx', async () => {
    xhrControl.progress = [
      { loaded: 50, total: 100, lengthComputable: true },
      { loaded: 100, total: 100, lengthComputable: true },
    ];
    const seen: number[] = [];
    await expect(putWithProgress('https://r2/put', fakeFile('a.jpg', 'image/jpeg'), {}, (p) => seen.push(p))).resolves.toBeInstanceOf(Response);
    expect(seen).toEqual([50, 100]);
  });

  it('rejects with a RetryableError on a 5xx', async () => {
    xhrControl.status = 503;
    await expect(putWithProgress('u', fakeFile('a.jpg', 'image/jpeg'), {}, () => {})).rejects.toBeInstanceOf(RetryableError);
  });

  it('rejects with a NonRetryableError on a 4xx', async () => {
    xhrControl.status = 403;
    await expect(putWithProgress('u', fakeFile('a.jpg', 'image/jpeg'), {}, () => {})).rejects.toBeInstanceOf(NonRetryableError);
  });

  it('rejects with a RetryableError on a network error', async () => {
    xhrControl.networkError = true;
    await expect(putWithProgress('u', fakeFile('a.jpg', 'image/jpeg'), {}, () => {})).rejects.toBeInstanceOf(RetryableError);
  });

  it('ignores progress events that are not length-computable', async () => {
    xhrControl.progress = [{ loaded: 10, total: 0, lengthComputable: false }];
    const seen: number[] = [];
    await putWithProgress('u', fakeFile('a.jpg', 'image/jpeg'), {}, (p) => seen.push(p));
    expect(seen).toEqual([]);
  });
});

describe('fetchJson', () => {
  it('returns the parsed body on ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ hello: 'world' }));
    await expect(fetchJson('/x', { method: 'GET' })).resolves.toEqual({ hello: 'world' });
  });

  it('throws a RetryableError on a 5xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
    await expect(fetchJson('/x', { method: 'GET' })).rejects.toBeInstanceOf(RetryableError);
  });

  it('throws a NonRetryableError on a 4xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }));
    await expect(fetchJson('/x', { method: 'GET' })).rejects.toBeInstanceOf(NonRetryableError);
  });

  it('uses the error field from a JSON error body as the message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Image too large' }, { ok: false, status: 413 }));
    await expect(fetchJson('/x', { method: 'POST' })).rejects.toThrow('Image too large');
  });

  it('summarizes a non-JSON error body by status instead of surfacing it raw', async () => {
    fetchMock.mockResolvedValueOnce(htmlResponse('<!DOCTYPE html><html><title>500</title></html>'));
    await expect(fetchJson('/x', { method: 'POST' })).rejects.toThrow('Request failed (500)');
  });

  it('falls back to the status summary when a JSON error body has no error field', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { ok: false, status: 502 }));
    await expect(fetchJson('/x', { method: 'GET' })).rejects.toThrow('Request failed (502)');
  });
});

describe('uploadPhoto', () => {
  it('presigns, PUTs to R2, processes, and returns the variant result', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === PRESIGN) return Promise.resolve(jsonResponse(presignBody('orig.jpg')));
      if (url === PROCESS) return Promise.resolve(jsonResponse(processBody));
      throw new Error(`unexpected ${url}`);
    });
    const seen: number[] = [];
    const result = await uploadPhoto(fakeFile('orig.jpg', 'image/jpeg'), 'p', (p) => seen.push(p));

    expect(result).toEqual(processBody);
    // presign + process; the PUT goes through XHR, not fetch.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([PRESIGN, PROCESS]);
    // PUT progress is scaled to 85%, then a final 100% after processing.
    expect(seen.at(-1)).toBe(100);
    expect(seen).toContain(85);
  });
});

describe('uploadVideo', () => {
  it('presigns and PUTs directly to R2, returning the public URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(presignBody('clip.mp4')));
    const seen: number[] = [];
    const result = await uploadVideo(fakeFile('clip.mp4', 'video/mp4'), 'clip.mp4', 'p', (p) => seen.push(p));

    expect(result).toEqual({ publicUrl: 'https://cdn.example/clip.mp4' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(seen.at(-1)).toBe(100);
  });
});

describe('uploadPendingItems', () => {
  const newPhoto = (id: string, filename: string): UploadItem => ({
    id, kind: 'photo', source: 'new', filename, file: fakeFile(filename, 'image/jpeg'),
  });

  it('uploads each new item, reporting completion in order and patching the result', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === PRESIGN) return Promise.resolve(jsonResponse(presignBody('x.jpg')));
      if (url === PROCESS) return Promise.resolve(jsonResponse(processBody));
      throw new Error(`unexpected ${url}`);
    });
    const items = [newPhoto('1', 'a.jpg'), newPhoto('2', 'b.jpg')];
    const completed: string[] = [];
    const result = await uploadPendingItems(items, 'p', {
      onProgress: () => {},
      onItemComplete: (id) => completed.push(id),
    });

    expect(completed).toEqual(['1', '2']);
    expect(result.every((i) => i.source === 'existing' && i.file === undefined)).toBe(true);
    expect(result[0].url).toBe(processBody.baseUrl);
    expect(result[0].width).toBe(100);
  });

  it('handles a video item, patching in its public URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(presignBody('clip.mp4')));
    const video: UploadItem = { id: 'v', kind: 'video', source: 'new', filename: 'clip.mp4', file: fakeFile('clip.mp4', 'video/mp4') };
    const completed: string[] = [];
    const result = await uploadPendingItems([video], 'p', {
      onProgress: () => {},
      onItemComplete: (id) => completed.push(id),
    });

    expect(completed).toEqual(['v']);
    expect(result[0]).toMatchObject({ source: 'existing', url: 'https://cdn.example/clip.mp4', file: undefined });
  });

  it('skips items that are already uploaded', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === PRESIGN) return Promise.resolve(jsonResponse(presignBody('x.jpg')));
      if (url === PROCESS) return Promise.resolve(jsonResponse(processBody));
      throw new Error(`unexpected ${url}`);
    });
    const existing: UploadItem = { id: 'e', kind: 'photo', source: 'existing', filename: 'old.jpg', url: 'https://cdn/old' };
    const completed: string[] = [];
    await uploadPendingItems([existing, newPhoto('1', 'a.jpg')], 'p', {
      onProgress: () => {},
      onItemComplete: (id) => completed.push(id),
    });

    expect(completed).toEqual(['1']); // 'e' was not re-uploaded
  });

  it('persists earlier completions then throws when a later item fails', async () => {
    // First item's presign+process succeed; the second item's presign returns a 4xx
    // (non-retryable, so it fails fast without exhausting retries).
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (url === PRESIGN) {
        if (body.filename === 'b.jpg') return Promise.resolve(jsonResponse({ error: 'bad' }, { ok: false, status: 400 }));
        return Promise.resolve(jsonResponse(presignBody(body.filename)));
      }
      if (url === PROCESS) return Promise.resolve(jsonResponse(processBody));
      throw new Error(`unexpected ${url}`);
    });
    const items = [newPhoto('1', 'a.jpg'), newPhoto('2', 'b.jpg')];
    const completed: string[] = [];

    await expect(
      uploadPendingItems(items, 'p', { onProgress: () => {}, onItemComplete: (id) => completed.push(id) }),
    ).rejects.toBeInstanceOf(NonRetryableError);

    // Item 1's upload was reported before item 2 failed — that work is preserved.
    expect(completed).toEqual(['1']);
  });
});
