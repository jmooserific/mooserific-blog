import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { Post as DbPost } from '@/lib/types';

vi.mock('@/lib/db', () => ({
  getPostsByIds: vi.fn(),
}));

import { getPostsByIds } from '@/lib/db';
import { GET } from './route';

const dbPost = (id: string): DbPost => ({
  id,
  slug: `slug-${id}`,
  date: '2026-05-01T00:00:00.000Z',
  author: 'moose',
  description: 'hi',
  photos: [{ url: `https://cdn/${id}.jpg`, width: 100, height: 200 }],
  videos: undefined,
});

const req = (qs: string) => new NextRequest(`http://localhost/api/posts/batch${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/posts/batch', () => {
  it('returns client-shaped posts for valid ids', async () => {
    vi.mocked(getPostsByIds).mockResolvedValue([dbPost('a'), dbPost('b')]);
    const res = await GET(req('?ids=a,b'));
    expect(res.status).toBe(200);
    expect(getPostsByIds).toHaveBeenCalledWith(['a', 'b']);
    const body = await res.json();
    // toClientPost runs for real: url is renamed to filename.
    expect(body.posts).toEqual([
      { id: 'a', date: '2026-05-01T00:00:00.000Z', author: 'moose', caption: 'hi', photos: [{ filename: 'https://cdn/a.jpg', width: 100, height: 200 }], slug: 'slug-a', videos: undefined },
      { id: 'b', date: '2026-05-01T00:00:00.000Z', author: 'moose', caption: 'hi', photos: [{ filename: 'https://cdn/b.jpg', width: 100, height: 200 }], slug: 'slug-b', videos: undefined },
    ]);
  });

  it('omits ids that returned no row instead of erroring or padding', async () => {
    // A post can be deleted between the index SSR and this fetch, so the lookup
    // returns fewer rows than requested. The route drops the gap silently and the
    // feed renders a skeleton for it — assert we don't throw or pad with nulls.
    vi.mocked(getPostsByIds).mockResolvedValue([dbPost('b')]);
    const res = await GET(req('?ids=a,b,c'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts.map((p: { id: string }) => p.id)).toEqual(['b']);
  });

  it('trims whitespace and drops empty segments before querying', async () => {
    vi.mocked(getPostsByIds).mockResolvedValue([]);
    const res = await GET(req('?ids=%20a%20,,%20b%20,'));
    expect(res.status).toBe(200);
    expect(getPostsByIds).toHaveBeenCalledWith(['a', 'b']);
  });

  it('400s when the ids param is missing', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid ids');
    expect(getPostsByIds).not.toHaveBeenCalled();
  });

  it('400s when ids is empty or only separators', async () => {
    expect((await GET(req('?ids='))).status).toBe(400);
    expect((await GET(req('?ids=,,,'))).status).toBe(400);
    expect(getPostsByIds).not.toHaveBeenCalled();
  });

  it('accepts exactly MAX_BATCH (60) ids', async () => {
    vi.mocked(getPostsByIds).mockResolvedValue([]);
    const ids = Array.from({ length: 60 }, (_, i) => `id${i}`);
    const res = await GET(req(`?ids=${ids.join(',')}`));
    expect(res.status).toBe(200);
    expect(vi.mocked(getPostsByIds).mock.calls[0][0]).toHaveLength(60);
  });

  it('400s when more than MAX_BATCH ids are supplied', async () => {
    const ids = Array.from({ length: 61 }, (_, i) => `id${i}`);
    const res = await GET(req(`?ids=${ids.join(',')}`));
    expect(res.status).toBe(400);
    expect(getPostsByIds).not.toHaveBeenCalled();
  });

  it('500s and hides the error when the lookup throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getPostsByIds).mockRejectedValue(new Error('d1 down'));
    const res = await GET(req('?ids=a'));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal server error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
