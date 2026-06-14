import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  authorFromUsername,
  authenticateCredentials,
  buildSessionClearCookie,
  buildSessionCookie,
  createSessionToken,
  getSessionCookieName,
  getSessionFromRequest,
  getSessionFromToken,
  hashPassword,
  parseCookies,
  SESSION_DEFAULT_TTL_SECONDS,
  shouldRefreshSession,
  verifyPassword,
  verifySessionToken,
  type SessionPayload,
} from './auth-core';
import { getAdminByUsername, type AdminRow } from './db-core';

// authenticateCredentials reads the admins table via db-core; mock that boundary.
vi.mock('./db-core', () => ({ getAdminByUsername: vi.fn() }));

// Credentials come from test/setup.ts:
// ADMIN_USERNAME=admin@example.test, ADMIN_PASSWORD=correct-horse-battery-staple

describe('authorFromUsername', () => {
  it('strips the domain from an email-style username', () => {
    expect(authorFromUsername('admin@example.test')).toBe('admin');
  });

  it('returns a plain username unchanged', () => {
    expect(authorFromUsername('moose')).toBe('moose');
  });

  it('trims surrounding whitespace', () => {
    expect(authorFromUsername('  moose  ')).toBe('moose');
  });
});

describe('parseCookies', () => {
  it('returns an empty object for missing headers', () => {
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
  });

  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('preserves "=" characters inside a value', () => {
    expect(parseCookies('token=ab.cd=ef')).toEqual({ token: 'ab.cd=ef' });
  });
});

describe('session token round-trip', () => {
  it('mints a token that verifies back to its payload', async () => {
    const token = await createSessionToken('admin@example.test');
    const payload = await verifySessionToken(token);
    expect(payload?.user).toBe('admin@example.test');
    expect(payload?.expiresAt).toBeGreaterThan(payload!.issuedAt);
  });

  it('rejects a token with the wrong shape', async () => {
    expect(await verifySessionToken('not-a-token')).toBeNull();
  });

  it('rejects a token whose signature does not match the payload', async () => {
    const token = await createSessionToken('admin@example.test');
    const [payload] = token.split('.');
    const forged = await createSessionToken('someone-else');
    const [, otherSig] = forged.split('.');
    expect(await verifySessionToken(`${payload}.${otherSig}`)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken('admin@example.test');
    const [, sig] = token.split('.');
    expect(await verifySessionToken(`bogusPayload.${sig}`)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await createSessionToken('admin@example.test', -10);
    expect(await verifySessionToken(token)).toBeNull();
  });
});

describe('getSessionFromToken / getSessionFromRequest', () => {
  it('returns null when no token is provided', async () => {
    expect(await getSessionFromToken(undefined)).toBeNull();
  });

  it('reads the session from a request cookie header', async () => {
    const token = await createSessionToken('admin@example.test');
    const req = new Request('https://x.test', {
      headers: { cookie: `${getSessionCookieName()}=${token}` },
    });
    const session = await getSessionFromRequest(req);
    expect(session?.user).toBe('admin@example.test');
  });

  it('returns null when the request has no cookie header', async () => {
    expect(await getSessionFromRequest(new Request('https://x.test'))).toBeNull();
  });
});

describe('buildSessionCookie', () => {
  it('includes the core attributes and defaults to Secure outside development', () => {
    const cookie = buildSessionCookie('abc');
    expect(cookie).toContain(`${getSessionCookieName()}=abc`);
    expect(cookie).toContain(`Max-Age=${SESSION_DEFAULT_TTL_SECONDS}`);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
  });

  it('honors explicit options', () => {
    const cookie = buildSessionCookie('abc', { ttlSeconds: 60, secure: false, sameSite: 'Strict', path: '/admin' });
    expect(cookie).toContain('Max-Age=60');
    expect(cookie).toContain('Path=/admin');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('Secure');
  });
});

describe('buildSessionClearCookie', () => {
  it('expires the cookie immediately', () => {
    const cookie = buildSessionClearCookie();
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain(`${getSessionCookieName()}=`);
  });
});

describe('shouldRefreshSession', () => {
  const base: SessionPayload = { user: 'u', issuedAt: 0, expiresAt: 0, nonce: 'n' };

  it('is true when the session is close to expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(shouldRefreshSession({ ...base, expiresAt: now + 60 })).toBe(true);
  });

  it('is false when the session has plenty of time left', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(shouldRefreshSession({ ...base, expiresAt: now + 10 * 60 * 60 })).toBe(false);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('round-trips a password', async () => {
    const stored = await hashPassword('correct-horse-battery-staple');
    expect(stored.startsWith('pbkdf2$')).toBe(true);
    expect(await verifyPassword('correct-horse-battery-staple', stored)).toBe(true);
  });

  it('uses a fresh salt each time (distinct hashes for the same password)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('right-password');
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('rejects a malformed stored string', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$notanumber$salt$hash')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$1$2$3')).toBe(false);
  });
});

describe('authenticateCredentials', () => {
  const mockedGet = vi.mocked(getAdminByUsername);

  async function adminRow(username: string, password: string): Promise<AdminRow> {
    return { username, password_hash: await hashPassword(password), created_at: '2026-01-01T00:00:00.000Z' };
  }

  beforeEach(() => mockedGet.mockReset());

  it('returns the canonical username on a match (lookup is case-insensitive)', async () => {
    mockedGet.mockResolvedValue(await adminRow('admin@example.test', 'correct-horse-battery-staple'));
    expect(await authenticateCredentials('ADMIN@example.test', 'correct-horse-battery-staple')).toBe('admin@example.test');
    // The username is normalized (trimmed + lowercased) before the lookup.
    expect(mockedGet).toHaveBeenCalledWith('admin@example.test');
  });

  it('returns null for a wrong password', async () => {
    mockedGet.mockResolvedValue(await adminRow('admin@example.test', 'correct-horse-battery-staple'));
    expect(await authenticateCredentials('admin@example.test', 'wrong-password')).toBeNull();
  });

  it('returns null for an unknown user (and still runs the KDF)', async () => {
    mockedGet.mockResolvedValue(null);
    expect(await authenticateCredentials('nobody@example.test', 'whatever')).toBeNull();
  });
});

describe('Edge/Workers runtime fallbacks (no Buffer, no crypto.randomUUID)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a token using btoa/atob when Buffer is unavailable', async () => {
    vi.stubGlobal('Buffer', undefined);
    const token = await createSessionToken('admin@example.test');
    const payload = await verifySessionToken(token);
    expect(payload?.user).toBe('admin@example.test');
  });

  it('generates a UUID nonce via getRandomValues when crypto.randomUUID is absent', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: real.getRandomValues.bind(real),
      subtle: real.subtle,
    });
    const token = await createSessionToken('admin@example.test');
    const payload = await verifySessionToken(token);
    expect(payload?.user).toBe('admin@example.test');
    // RFC 4122 v4 shape: 8-4-4-4-12 hex with version/variant nibbles set.
    expect(payload?.nonce).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('getSessionCookieName', () => {
  it('exposes a stable cookie name', () => {
    expect(getSessionCookieName()).toBe('mooserific_session');
  });
});
