import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  authenticateCredentials: vi.fn(),
  createSessionToken: vi.fn(async () => 'session-token'),
  authorFromUsername: vi.fn((u: string) => u.split('@')[0]),
  getSessionCookieName: vi.fn(() => 'mooserific_session'),
  SESSION_DEFAULT_TTL_SECONDS: 43200,
}));

import { authenticateCredentials } from '@/lib/auth';
import { POST } from './route';

function jsonReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function formReq(fields: Record<string, string>, headers: Record<string, string> = {}) {
  const form = new URLSearchParams(fields);
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: form.toString(),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/auth/login', () => {
  it('400s on missing credentials for a JSON client', async () => {
    const res = await POST(jsonReq({ username: '', password: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing credentials' });
  });

  it('401s on invalid credentials for a JSON client', async () => {
    vi.mocked(authenticateCredentials).mockResolvedValue(null);
    const res = await POST(jsonReq({ username: 'admin@example.test', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid credentials' });
  });

  it('sets a session cookie and redirects on success', async () => {
    vi.mocked(authenticateCredentials).mockResolvedValue('admin@example.test');
    const res = await POST(jsonReq({ username: 'admin@example.test', password: 'pw', redirect: '/admin/new' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/admin/new');
    expect(res.cookies.get('mooserific_session')?.value).toBe('session-token');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-auth-user')).toBe('admin');
  });

  it('redirects HTML clients to the login page on missing credentials', async () => {
    const res = await POST(formReq({ username: '', password: '' }, { accept: 'text/html' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/login?error=missing');
  });

  it('redirects HTML clients to the login page with an error on bad credentials', async () => {
    vi.mocked(authenticateCredentials).mockResolvedValue(null);
    const res = await POST(formReq({ username: 'admin@example.test', password: 'wrong' }, { accept: 'text/html' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/login?error=invalid');
  });

  it('reads credentials from a form submission', async () => {
    vi.mocked(authenticateCredentials).mockResolvedValue('admin@example.test');
    const res = await POST(formReq({ username: 'admin@example.test', password: 'pw' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/admin');
  });
});
