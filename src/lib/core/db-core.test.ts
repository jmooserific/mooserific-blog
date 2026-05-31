import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudflare-core', () => ({
  getCloudflareClient: vi.fn(),
}));

import { getCloudflareClient } from './cloudflare-core';
import {
  listPosts,
  listPostIndex,
  getPostsByIds,
  getPost,
  getPostBySlug,
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

describe('listPostIndex', () => {
  it('selects only id+date, newest first', async () => {
    const { calls } = installDb(() => [
      { id: 'a', date: '2026-05-01T00:00:00.000Z' },
      { id: 'b', date: '2026-04-01T00:00:00.000Z' },
    ]);
    const index = await listPostIndex();
    expect(calls[0].sql).toContain('SELECT id, date FROM posts');
    expect(calls[0].sql).toContain('ORDER BY date DESC');
    expect(index).toEqual([
      { id: 'a', date: '2026-05-01T00:00:00.000Z' },
      { id: 'b', date: '2026-04-01T00:00:00.000Z' },
    ]);
  });
});

describe('getPostsByIds', () => {
  it('returns an empty array without querying when given no ids', async () => {
    const { calls } = installDb(() => [sampleRow]);
    const posts = await getPostsByIds([]);
    expect(posts).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('builds one placeholder per id and passes them as params', async () => {
    const { calls } = installDb(() => [sampleRow]);
    await getPostsByIds(['p1', 'p2', 'p3']);
    // d1Query normalizes `$N` placeholders to positional `?`.
    expect(calls[0].sql).toContain('WHERE id IN (?, ?, ?)');
    expect(calls[0].params).toEqual(['p1', 'p2', 'p3']);
  });

  it('deserializes returned rows', async () => {
    installDb(() => [sampleRow]);
    const posts = await getPostsByIds(['p1']);
    expect(posts[0].id).toBe('p1');
    expect(posts[0].photos[0].url).toBe('https://cdn/a');
  });
});

describe('createPost', () => {
  it('inserts with generated id/date and a date-derived slug, and returns the post', async () => {
    const { calls } = installDb(() => []);
    const post = await createPost({ date: '2026-01-01T00:00:00.000Z', photos: [{ url: 'u', width: 1, height: 1 }] });
    const insert = calls.find((c) => c.sql.includes('INSERT INTO posts'));
    expect(insert).toBeDefined();
    expect(post.id).toBeTruthy();
    expect(post.slug).toBe('2026-01-01-0000');
    expect(post.photos).toEqual([{ url: 'u', width: 1, height: 1 }]);
  });

  it('auto-suffixes the slug when the date-derived default is taken', async () => {
    // ensureUniqueSlug's lookup reports the base slug as already used.
    installDb((call) => (call.sql.includes('SELECT slug') ? [{ slug: '2026-01-01-0000' }] : []));
    const post = await createPost({ date: '2026-01-01T00:00:00.000Z', photos: [] });
    expect(post.slug).toBe('2026-01-01-0000-2');
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
    const insert = calls.find((c) => c.sql.includes('INSERT INTO posts'));
    expect(insert?.params).toContain(JSON.stringify(['v1']));
  });

  it('accepts a unique custom slug', async () => {
    // slugTaken lookup returns no rows → slug is free.
    const post = await createPost({ slug: 'summer-at-the-lake', date: '2026-01-01T00:00:00.000Z', photos: [] });
    expect(post.slug).toBe('summer-at-the-lake');
  });

  it('throws SlugConflictError when a custom slug is taken', async () => {
    installDb((call) => (call.sql.includes('SELECT id FROM posts WHERE slug') ? [{ id: 'other' }] : []));
    await expect(
      createPost({ slug: 'summer-at-the-lake', date: '2026-01-01T00:00:00.000Z', photos: [] }),
    ).rejects.toThrow('Slug already in use');
  });

  // d1Query rewrites every `$N` to a positional `?`; a query that binds the wrong
  // number of params would shift bindings and defeat the uniqueness check.
  it('binds exactly one param per placeholder on the auto-slug path', async () => {
    const { calls } = installDb(() => []);
    await createPost({ date: '2026-01-01T00:00:00.000Z', photos: [] });
    for (const { sql, params } of calls) {
      expect(params.length).toBe((sql.match(/\?/g) ?? []).length);
    }
  });
});

describe('getPostBySlug', () => {
  it('looks up by slug and deserializes', async () => {
    const { calls } = installDb(() => [{ ...sampleRow, slug: '2026-05-01-0000' }]);
    const post = await getPostBySlug('2026-05-01-0000');
    expect(calls[0].sql).toContain('WHERE slug = ?');
    expect(post?.slug).toBe('2026-05-01-0000');
  });

  it('returns null when no row matches', async () => {
    installDb(() => []);
    expect(await getPostBySlug('missing')).toBeNull();
  });

  it('falls back to the id as slug for a not-yet-backfilled row', async () => {
    // sampleRow has no slug column → deserializePost should use the id.
    installDb(() => [sampleRow]);
    const post = await getPost('p1');
    expect(post?.slug).toBe('p1');
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

  it('sets a new slug when a free one is provided', async () => {
    installDb((call) =>
      call.sql.includes('SELECT * FROM posts WHERE id') ? [{ ...sampleRow, slug: 'old-slug' }] : []
    );
    const post = await updatePost('p1', { slug: 'new-slug' });
    expect(post?.slug).toBe('new-slug');
  });

  it('throws SlugConflictError when the new slug is taken', async () => {
    installDb((call) => {
      if (call.sql.includes('SELECT * FROM posts WHERE id')) return [{ ...sampleRow, slug: 'old-slug' }];
      if (call.sql.includes('SELECT id FROM posts WHERE slug')) return [{ id: 'other' }];
      return [];
    });
    await expect(updatePost('p1', { slug: 'taken' })).rejects.toThrow('Slug already in use');
  });

  it('skips the uniqueness check when the slug is unchanged', async () => {
    const { calls } = installDb((call) =>
      call.sql.includes('SELECT * FROM posts WHERE id') ? [{ ...sampleRow, slug: 'same' }] : []
    );
    await updatePost('p1', { slug: 'same', description: 'x' });
    expect(calls.some((c) => c.sql.includes('SELECT id FROM posts WHERE slug'))).toBe(false);
  });

  // Regression: the slugTaken check (excludeId branch) must bind one param per `?`.
  it('binds exactly one param per placeholder when changing the slug', async () => {
    const { calls } = installDb((call) =>
      call.sql.includes('SELECT * FROM posts WHERE id') ? [{ ...sampleRow, slug: '2026-05-01-0000' }] : []
    );
    await updatePost('p1', { slug: 'a-new-slug' });
    for (const { sql, params } of calls) {
      expect(params.length).toBe((sql.match(/\?/g) ?? []).length);
    }
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
