import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { Post } from '@/lib/types';

vi.mock('@/lib/db', () => {
  class SlugConflictError extends Error {}
  return {
    listPosts: vi.fn(),
    createPost: vi.fn(),
    SlugConflictError,
  };
});

import { listPosts, createPost, SlugConflictError } from '@/lib/db';
import { GET, POST } from './route';

function jsonReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const samplePost: Post = {
  id: 'p1',
  slug: '2026-05-01-0000',
  date: '2026-05-01T00:00:00.000Z',
  photos: [{ url: 'https://cdn/a', width: 100, height: 100 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/posts', () => {
  it('returns posts with next/prev cursors', async () => {
    const posts: Post[] = [
      { ...samplePost, id: 'a', date: '2026-05-02T00:00:00.000Z' },
      { ...samplePost, id: 'b', date: '2026-05-01T00:00:00.000Z' },
    ];
    vi.mocked(listPosts).mockResolvedValue(posts);
    const res = await GET(new NextRequest('http://localhost/api/posts?limit=2&date_filter=2026'));
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
    expect(body.prevCursor).toBe('2026-05-02T00:00:00.000Z');
    expect(body.nextCursor).toBe('2026-05-01T00:00:00.000Z');
    expect(vi.mocked(listPosts)).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2, dateFilter: '2026' }),
    );
  });

  it('500s when the query fails', async () => {
    vi.mocked(listPosts).mockRejectedValue(new Error('db down'));
    const res = await GET(new NextRequest('http://localhost/api/posts'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/posts', () => {
  it('400s for a non-object body', async () => {
    const res = await POST(jsonReq(null));
    expect(res.status).toBe(400);
  });

  it('400s for a malformed JSON body', async () => {
    const req = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400s when no photos or videos are provided', async () => {
    const res = await POST(jsonReq({ description: 'empty' }));
    expect(res.status).toBe(400);
  });

  it('400s for an invalid date', async () => {
    const res = await POST(jsonReq({ photos: ['https://cdn/a'], date: 'not-a-date' }));
    expect(res.status).toBe(400);
  });

  it('creates a post, normalizing string photos and preferring the auth header author', async () => {
    vi.mocked(createPost).mockImplementation(async (input) => ({
      id: 'new',
      slug: input.slug ?? '2026-05-01-0000',
      date: '2026-05-01T00:00:00.000Z',
      photos: input.photos,
      author: input.author,
    }));
    const res = await POST(jsonReq({ photos: ['https://cdn/a'], description: 'hi' }, { 'x-auth-user': 'moose' }));
    expect(res.status).toBe(201);
    const arg = vi.mocked(createPost).mock.calls[0][0];
    expect(arg.author).toBe('moose');
    expect(arg.photos[0]).toEqual({ url: 'https://cdn/a', width: 800, height: 600 });
  });

  it('normalizes object-shaped photos and accepts the author from the body and a valid date', async () => {
    vi.mocked(createPost).mockImplementation(async (input) => ({
      id: input.id ?? 'new',
      slug: input.slug ?? '2026-05-01-0000',
      date: input.date ?? '2026-05-01T00:00:00.000Z',
      photos: input.photos,
      author: input.author,
    }));
    const res = await POST(
      jsonReq({
        photos: [{ url: 'https://cdn/a', width: 640, height: 480, originalUrl: 'https://cdn/o', originalContentType: 'image/jpeg' }],
        videos: ['https://cdn/v.mp4', 123],
        author: 'bodyauthor',
        date: '2026-01-02',
      }),
    );
    expect(res.status).toBe(201);
    const arg = vi.mocked(createPost).mock.calls[0][0];
    expect(arg.author).toBe('bodyauthor'); // no x-auth-user header → falls back to body
    expect(arg.photos[0]).toEqual({
      url: 'https://cdn/a',
      width: 640,
      height: 480,
      originalUrl: 'https://cdn/o',
      originalContentType: 'image/jpeg',
    });
    expect(arg.videos).toEqual(['https://cdn/v.mp4']); // non-string filtered out
    expect(arg.date).toBe('2026-01-02T00:00:00.000Z');
  });

  it('coerces a non-string, non-object photo into a placeholder asset', async () => {
    vi.mocked(createPost).mockResolvedValue(samplePost);
    const res = await POST(jsonReq({ photos: [42] }));
    expect(res.status).toBe(201);
    expect(vi.mocked(createPost).mock.calls[0][0].photos[0]).toEqual({ url: '42', width: 800, height: 600 });
  });

  it('passes a valid custom slug through to createPost', async () => {
    vi.mocked(createPost).mockResolvedValue(samplePost);
    const res = await POST(jsonReq({ photos: ['https://cdn/a'], slug: 'summer-at-the-lake' }));
    expect(res.status).toBe(201);
    expect(vi.mocked(createPost).mock.calls[0][0].slug).toBe('summer-at-the-lake');
  });

  it('400s for a malformed custom slug', async () => {
    const res = await POST(jsonReq({ photos: ['https://cdn/a'], slug: 'Not A Slug' }));
    expect(res.status).toBe(400);
    expect(vi.mocked(createPost)).not.toHaveBeenCalled();
  });

  it('409s when the slug collides with an existing post', async () => {
    vi.mocked(createPost).mockRejectedValue(new SlugConflictError('summer-at-the-lake'));
    const res = await POST(jsonReq({ photos: ['https://cdn/a'], slug: 'summer-at-the-lake' }));
    expect(res.status).toBe(409);
  });

  it('500s when creation throws', async () => {
    vi.mocked(createPost).mockRejectedValue(new Error('insert failed'));
    const res = await POST(jsonReq({ photos: ['https://cdn/a'] }));
    expect(res.status).toBe(500);
  });
});
