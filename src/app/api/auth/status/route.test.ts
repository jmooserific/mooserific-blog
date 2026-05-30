import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
  authorFromUsername: vi.fn((u: string) => u.split('@')[0]),
}));

import { getSessionFromRequest } from '@/lib/auth';
import { GET } from './route';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/auth/status', () => {
  it('reports unauthenticated when there is no session', async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/auth/status'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: false });
  });

  it('reports the author name when authenticated', async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      user: 'admin@example.test',
      issuedAt: 0,
      expiresAt: 0,
      nonce: 'n',
    });
    const res = await GET(new NextRequest('http://localhost/api/auth/status'));
    expect(await res.json()).toEqual({ authenticated: true, user: 'admin' });
  });
});
