import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  buildSessionClearCookie: vi.fn(() => 'mooserific_session=; Max-Age=0; Path=/'),
}));

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('clears the session cookie and redirects to /login by default', async () => {
    const res = await POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/login');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('honors a safe relative redirect target', async () => {
    const res = await POST(new NextRequest('http://localhost/api/auth/logout?redirect=/admin', { method: 'POST' }));
    expect(res.headers.get('location')).toBe('http://localhost/admin');
  });

  it('ignores an absolute (off-site) redirect target', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/auth/logout?redirect=//evil.test', { method: 'POST' }),
    );
    expect(res.headers.get('location')).toBe('http://localhost/login');
  });
});
