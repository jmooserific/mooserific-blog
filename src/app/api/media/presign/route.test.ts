import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/r2', () => ({
  buildObjectKey: vi.fn((name: string, id: string, kind: string) => `${kind}s/${id}/${name}`),
  buildPhotoKeys: vi.fn((id: string, name: string) => ({ baseKey: `photos/${id}/uuid`, originalKey: `photos/${id}/uuid/${name}` })),
  getPresignedPutUrl: vi.fn(async () => 'https://signed.example.test/put'),
  getPublicUrl: vi.fn((key: string) => `https://cdn.example.test/${key}`),
}));

import { getPresignedPutUrl } from '@/lib/r2';
import { POST } from './route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/media/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/media/presign', () => {
  it('400s when required fields are missing', async () => {
    const res = await POST(req({ filename: 'a.jpg' }));
    expect(res.status).toBe(400);
  });

  it('415s for an unsupported content type', async () => {
    const res = await POST(req({ filename: 'a.txt', contentType: 'text/plain', size: 10 }));
    expect(res.status).toBe(415);
  });

  it('413s when the file exceeds the size limit', async () => {
    const res = await POST(req({ filename: 'a.jpg', contentType: 'image/jpeg', size: 600 * 1024 * 1024 }));
    expect(res.status).toBe(413);
  });

  it('413s a photo over the tighter image cap (smaller than the overall file cap)', async () => {
    // 100 MB: under the 500 MB file cap, but over the 50 MB image cap.
    const res = await POST(req({ filename: 'a.jpg', contentType: 'image/jpeg', size: 100 * 1024 * 1024 }));
    expect(res.status).toBe(413);
  });

  it('allows a video of the same size, which only faces the overall file cap', async () => {
    const res = await POST(req({ filename: 'clip.mp4', contentType: 'video/mp4', size: 100 * 1024 * 1024 }));
    expect(res.status).toBe(200);
  });

  it('returns a presigned URL for a valid image upload', async () => {
    const res = await POST(req({ filename: 'a.jpg', contentType: 'image/jpeg', size: 1000, folderId: 'grp1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uploadUrl).toBe('https://signed.example.test/put');
    expect(body.kind).toBe('photo');
    expect(body.folderId).toBe('grp1');
    expect(body.key).toContain('grp1');
  });

  it('classifies videos by content type and generates a folder id when absent', async () => {
    const res = await POST(req({ filename: 'clip.mp4', contentType: 'video/mp4', size: 1000 }));
    const body = await res.json();
    expect(body.kind).toBe('video');
    expect(body.folderId).toBeTruthy();
  });

  it('500s when presigning throws', async () => {
    vi.mocked(getPresignedPutUrl).mockRejectedValueOnce(new Error('boom'));
    const res = await POST(req({ filename: 'a.jpg', contentType: 'image/jpeg', size: 1000 }));
    expect(res.status).toBe(500);
  });
});
