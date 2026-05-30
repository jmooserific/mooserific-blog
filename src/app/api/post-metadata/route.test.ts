import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDateMetadata: vi.fn(async () => ({
    availableYears: [2026],
    monthsWithPosts: { 2026: [5] },
    postCounts: { '2026': 1, '2026-05': 1 },
  })),
}));

import { GET } from './route';

describe('GET /api/post-metadata', () => {
  it('returns the aggregated date metadata', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableYears).toEqual([2026]);
    expect(body.postCounts['2026-05']).toBe(1);
  });
});
