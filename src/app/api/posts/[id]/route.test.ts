import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Post } from '@/lib/types';

vi.mock('@/lib/db', () => ({
  getPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}));

import { getPost, updatePost, deletePost } from '@/lib/db';
import { GET, PUT, DELETE } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const samplePost: Post = {
  id: 'p1',
  date: '2026-05-01T00:00:00.000Z',
  photos: [{ url: 'https://cdn/a', width: 100, height: 100 }],
};

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/posts/p1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/posts/[id]', () => {
  it('returns the post when found', async () => {
    vi.mocked(getPost).mockResolvedValue(samplePost);
    const res = await GET(new Request('http://localhost/api/posts/p1'), params('p1'));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('p1');
  });

  it('404s when missing', async () => {
    vi.mocked(getPost).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/posts/x'), params('x'));
    expect(res.status).toBe(404);
  });

  it('500s on error', async () => {
    vi.mocked(getPost).mockRejectedValue(new Error('boom'));
    const res = await GET(new Request('http://localhost/api/posts/p1'), params('p1'));
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/posts/[id]', () => {
  it('400s for a non-object body', async () => {
    const res = await PUT(jsonReq(null), params('p1'));
    expect(res.status).toBe(400);
  });

  it('400s for an invalid date', async () => {
    const res = await PUT(jsonReq({ date: 'nope' }), params('p1'));
    expect(res.status).toBe(400);
  });

  it('404s when the post does not exist', async () => {
    vi.mocked(updatePost).mockResolvedValue(null);
    const res = await PUT(jsonReq({ description: 'x' }), params('missing'));
    expect(res.status).toBe(404);
  });

  it('updates and returns the post, normalizing photos', async () => {
    vi.mocked(updatePost).mockImplementation(async (_id, input) => ({ ...samplePost, ...input }));
    const res = await PUT(jsonReq({ photos: ['https://cdn/b'], description: 'updated' }), params('p1'));
    expect(res.status).toBe(200);
    const arg = vi.mocked(updatePost).mock.calls[0][1];
    expect(arg.photos?.[0]).toEqual({ url: 'https://cdn/b', width: 800, height: 600 });
  });

  it('normalizes object-shaped photos, filters videos, and parses a valid date', async () => {
    vi.mocked(updatePost).mockImplementation(async (_id, input) => ({ ...samplePost, ...input }));
    const res = await PUT(
      jsonReq({
        photos: [{ url: 'https://cdn/b', width: 320, height: 240, originalUrl: 'https://cdn/o', originalContentType: 'image/png' }],
        videos: ['https://cdn/v.mp4', 5],
        date: '2026-02-03',
      }),
      params('p1'),
    );
    expect(res.status).toBe(200);
    const arg = vi.mocked(updatePost).mock.calls[0][1];
    expect(arg.photos?.[0]).toEqual({
      url: 'https://cdn/b',
      width: 320,
      height: 240,
      originalUrl: 'https://cdn/o',
      originalContentType: 'image/png',
    });
    expect(arg.videos).toEqual(['https://cdn/v.mp4']);
    expect(arg.date).toBe('2026-02-03T00:00:00.000Z');
  });

  it('500s on error', async () => {
    vi.mocked(updatePost).mockRejectedValue(new Error('boom'));
    const res = await PUT(jsonReq({ description: 'x' }), params('p1'));
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/posts/[id]', () => {
  it('deletes and returns 200', async () => {
    vi.mocked(deletePost).mockResolvedValue(true);
    const res = await DELETE(new Request('http://localhost/api/posts/p1', { method: 'DELETE' }), params('p1'));
    expect(res.status).toBe(200);
  });

  it('500s on error', async () => {
    vi.mocked(deletePost).mockRejectedValue(new Error('boom'));
    const res = await DELETE(new Request('http://localhost/api/posts/p1', { method: 'DELETE' }), params('p1'));
    expect(res.status).toBe(500);
  });
});
