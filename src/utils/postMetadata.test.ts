import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDateMetadata: vi.fn(),
}));

import { getDateMetadata } from '@/lib/db';
import { getPostMetadata } from './postMetadata';

describe('getPostMetadata', () => {
  it('passes through the DB-backed metadata', async () => {
    const meta = {
      availableYears: [2026],
      monthsWithPosts: { 2026: [5] },
      postCounts: { '2026': 1, '2026-05': 1 },
    };
    vi.mocked(getDateMetadata).mockResolvedValue(meta);
    expect(await getPostMetadata()).toEqual(meta);
  });
});
