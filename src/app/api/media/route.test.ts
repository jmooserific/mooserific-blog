import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/r2', () => ({
  buildObjectKey: vi.fn((name: string, id: string, kind: string) => `${kind}s/${id}/${name}`),
  putObject: vi.fn(async (opts: { key: string }) => `https://cdn.example.test/${opts.key}`),
}));

import { buildObjectKey, putObject } from '@/lib/r2';
import { POST } from './route';

function formReq(form: FormData) {
  return new NextRequest('http://localhost/api/media', { method: 'POST', body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/media', () => {
  it('400s when no files are present', async () => {
    const form = new FormData();
    form.set('postId', 'p1');
    const res = await POST(formReq(form));
    expect(res.status).toBe(400);
  });

  it('uploads each file and classifies by content type', async () => {
    const form = new FormData();
    form.set('postId', 'p1');
    form.append('a', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    form.append('b', new File(['y'], 'b.mp4', { type: 'video/mp4' }));
    const res = await POST(formReq(form));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.postId).toBe('p1');
    expect(body.urls).toHaveLength(2);
    expect(vi.mocked(putObject)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(buildObjectKey)).toHaveBeenCalledWith('b.mp4', 'p1', 'video');
  });

  it('generates a postId when none is supplied', async () => {
    const form = new FormData();
    form.append('a', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    const res = await POST(formReq(form));
    const body = await res.json();
    expect(body.postId).toBeTruthy();
  });

  it('500s when an upload throws', async () => {
    vi.mocked(putObject).mockRejectedValueOnce(new Error('r2 down'));
    const form = new FormData();
    form.append('a', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    const res = await POST(formReq(form));
    expect(res.status).toBe(500);
  });
});
