import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/image-processing', () => ({
  processImageFromR2: vi.fn(async () => ({
    baseUrl: 'https://cdn.example.test/photos/post1/uuid',
    width: 100,
    height: 200,
    originalUrl: 'https://cdn.example.test/photos/post1/uuid/pic.jpg',
    originalContentType: 'image/jpeg',
  })),
}));

import { processImageFromR2 } from '@/lib/image-processing';
import { POST } from './route';

const VALID_KEY = `photos/post1/${'a'.repeat(8)}-${'b'.repeat(4)}-${'c'.repeat(4)}-${'d'.repeat(4)}-${'e'.repeat(12)}/pic.jpg`;

function req(body: unknown) {
  return new NextRequest('http://localhost/api/media/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/media/process', () => {
  it('400s for a key that is not a presigned photo key', async () => {
    const res = await POST(req({ key: 'photos/post1/pic.jpg', contentType: 'image/jpeg' }));
    expect(res.status).toBe(400);
    expect(vi.mocked(processImageFromR2)).not.toHaveBeenCalled();
  });

  it('400s for a non-string key', async () => {
    const res = await POST(req({ key: 42, contentType: 'image/jpeg' }));
    expect(res.status).toBe(400);
  });

  it('415s when the content type is not an image', async () => {
    const res = await POST(req({ key: VALID_KEY, contentType: 'video/mp4' }));
    expect(res.status).toBe(415);
  });

  it('processes a valid key and returns the asset', async () => {
    const res = await POST(req({ key: VALID_KEY, contentType: 'image/jpeg' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.width).toBe(100);
    expect(body.baseUrl).toContain('photos/post1/uuid');
    expect(vi.mocked(processImageFromR2)).toHaveBeenCalledWith(VALID_KEY, 'image/jpeg');
  });

  it('accepts the dev/ prefix', async () => {
    const res = await POST(req({ key: `dev/${VALID_KEY}`, contentType: 'image/png' }));
    expect(res.status).toBe(200);
  });

  it('500s when processing throws', async () => {
    vi.mocked(processImageFromR2).mockRejectedValueOnce(new Error('boom'));
    const res = await POST(req({ key: VALID_KEY, contentType: 'image/jpeg' }));
    expect(res.status).toBe(500);
  });
});
