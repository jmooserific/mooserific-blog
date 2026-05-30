import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudflare-core', () => ({
  getCloudflareClient: vi.fn(),
}));

import { getCloudflareClient } from './cloudflare-core';
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getDateMetadata,
} from './db-core';

interface QueryCall {
  sql: string;
  params: unknown[];
}

/**
 * Install a fake Cloudflare D1 client. `responder` receives the normalized SQL
 * and params for each query and returns the rows to hand back.
 */
function installDb(responder: (call: QueryCall) => unknown[]) {
  const calls: QueryCall[] = [];
  const query = vi.fn(async (_dbId: string, body: { sql: string; params: unknown[] }) => {
    const call = { sql: body.sql, params: body.params };
    calls.push(call);
    return { result: [{ results: responder(call) }] };
  });
  vi.mocked(getCloudflareClient).mockReturnValue({
    d1: { database: { query } },
  } as never);
  return { calls };
}

const sampleRow = {
  id: 'p1',
  date: '2026-05-01T00:00:00.000Z',
  author: 'moose',
  description: 'hello',
  photos: JSON.stringify([{ url: 'https://cdn/a', width: 100, height: 200 }]),
  videos: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPosts', () => {
  it('caps the limit at 100 and orders DESC by default', async () => {
    const { calls } = installDb(() => []);
    await listPosts({ limit: 9999 });
    const { sql, params } = calls[0];
    expect(sql).toContain('ORDER BY date DESC');
    expect(params[params.length - 1]).toBe(100);
  });

  it('defaults the limit to 20', async () => {
    const { calls } = installDb(() => []);
    await listPosts();
    expect(calls[0].params[calls[0].params.length - 1]).toBe(20);
  });

  it('builds a year range from a YYYY date filter', async () => {
    const { calls } = installDb(() => []);
    await listPosts({ dateFilter: '2026' });
    expect(calls[0].params).toContain('2026-01-01T00:00:00.000Z');
    expect(calls[0].params).toContain('2027-01-01T00:00:00.000Z');
  });

  it('builds a month range from a YYYY-MM date filter, wrapping December', async () => {
    const { calls } = installDb(() => []);
    await listPosts({ dateFilter: '2026-12' });
    expect(calls[0].params).toContain(new Date(Date.UTC(2026, 11, 1)).toISOString());
    expect(calls[0].params).toContain(new Date(Date.UTC(2027, 0, 1)).toISOString());
  });

  it('builds a day range from a YYYY-MM-DD date filter', async () => {
    const { calls } = installDb(() => []);
    await listPosts({ dateFilter: '2026-05-15' });
    expect(calls[0].params).toContain(new Date(Date.UTC(2026, 4, 15)).toISOString());
    expect(calls[0].params).toContain(new Date(Date.UTC(2026, 4, 16)).toISOString());
  });

  it('applies a before cursor', async () => {
    const { calls } = installDb(() => []);
    await listPosts({ before: '2026-05-01T00:00:00.000Z' });
    expect(calls[0].sql).toContain('date <');
    expect(calls[0].params).toContain('2026-05-01T00:00:00.000Z');
  });

  it('queries ASC and reverses results when an after cursor is used', async () => {
    const older = { ...sampleRow, id: 'older', date: '2026-04-01T00:00:00.000Z' };
    const newer = { ...sampleRow, id: 'newer', date: '2026-04-02T00:00:00.000Z' };
    const { calls } = installDb(() => [older, newer]);
    const posts = await listPosts({ after: '2026-03-01T00:00:00.000Z' });
    expect(calls[0].sql).toContain('ORDER BY date ASC');
    // Reversed back to descending presentation order.
    expect(posts.map((p) => p.id)).toEqual(['newer', 'older']);
  });

  it('deserializes object-shaped photos', async () => {
    installDb(() => [sampleRow]);
    const [post] = await listPosts();
    expect(post.photos).toEqual([{ url: 'https://cdn/a', width: 100, height: 200 }]);
    expect(post.author).toBe('moose');
  });

  it('upgrades legacy string-array photos to objects with placeholder dimensions', async () => {
    const legacy = { ...sampleRow, photos: JSON.stringify(['https://cdn/legacy']) };
    installDb(() => [legacy]);
    const [post] = await listPosts();
    expect(post.photos).toEqual([{ url: 'https://cdn/legacy', width: 800, height: 600 }]);
  });

  it('falls back to an empty photo array when JSON is malformed', async () => {
    const broken = { ...sampleRow, photos: '{not json' };
    installDb(() => [broken]);
    const [post] = await listPosts();
    expect(post.photos).toEqual([]);
  });
});

describe('getPost', () => {
  it('returns a deserialized post by id', async () => {
    installDb(() => [sampleRow]);
    const post = await getPost('p1');
    expect(post?.id).toBe('p1');
  });

  it('returns null when no row matches', async () => {
    installDb(() => []);
    expect(await getPost('missing')).toBeNull();
  });
});

describe('createPost', () => {
  it('inserts with generated id/date and returns the post', async () => {
    const { calls } = installDb(() => []);
    const post = await createPost({ photos: [{ url: 'u', width: 1, height: 1 }] });
    expect(calls[0].sql).toContain('INSERT INTO posts');
    expect(post.id).toBeTruthy();
    expect(post.date).toBeTruthy();
    expect(post.photos).toEqual([{ url: 'u', width: 1, height: 1 }]);
  });

  it('uses provided id, date, author and serializes videos', async () => {
    const { calls } = installDb(() => []);
    const post = await createPost({
      id: 'fixed',
      date: '2026-01-01T00:00:00.000Z',
      author: 'moose',
      description: 'd',
      photos: [],
      videos: ['v1'],
    });
    expect(post.id).toBe('fixed');
    expect(calls[0].params).toContain(JSON.stringify(['v1']));
  });
});

describe('updatePost', () => {
  it('returns null when the post does not exist', async () => {
    installDb(() => []);
    expect(await updatePost('missing', { description: 'x' })).toBeNull();
  });

  it('merges changes over the existing post', async () => {
    let first = true;
    installDb(() => {
      if (first) {
        first = false;
        return [sampleRow]; // getPost lookup
      }
      return []; // UPDATE
    });
    const post = await updatePost('p1', { description: 'updated' });
    expect(post?.description).toBe('updated');
    expect(post?.author).toBe('moose'); // unchanged field preserved
  });
});

describe('deletePost', () => {
  it('issues a delete and returns true', async () => {
    const { calls } = installDb(() => []);
    expect(await deletePost('p1')).toBe(true);
    expect(calls[0].sql).toContain('DELETE FROM posts');
  });
});

describe('getDateMetadata', () => {
  it('aggregates years, months and counts', async () => {
    installDb(({ sql }) => {
      if (sql.includes('AS year')) {
        return [
          { year: 2026, count: 3 },
          { year: 2025, count: 1 },
        ];
      }
      return [
        { ym: '2026-05', count: 2 },
        { ym: '2026-01', count: 1 },
        { ym: '2025-12', count: 1 },
      ];
    });
    const meta = await getDateMetadata();
    expect(meta.availableYears).toEqual([2026, 2025]);
    expect(meta.monthsWithPosts[2026]).toEqual([1, 5]); // sorted ascending
    expect(meta.postCounts['2026']).toBe(3);
    expect(meta.postCounts['2026-05']).toBe(2);
  });
});
