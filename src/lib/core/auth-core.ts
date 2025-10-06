const SESSION_COOKIE_NAME = 'mooserific_session';
const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const DEFAULT_REFRESH_THRESHOLD_SECONDS = 60 * 60; // 1 hour

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function generateUUID(): Promise<string> {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const { randomUUID } = await import('crypto');
  return randomUUID();
}

export interface SessionPayload {
  user: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getSessionSecret(): string {
  return getEnvVar('SESSION_SECRET');
}

export function getConfiguredCredentials(): { username: string; password: string } {
  const username = getEnvVar('ADMIN_USERNAME');
  const password = getEnvVar('ADMIN_PASSWORD');
  return { username, password };
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function authorFromUsername(raw: string): string {
  const trimmed = raw.trim();
  const at = trimmed.indexOf('@');
  if (at === -1) return trimmed;
  return trimmed.slice(0, at);
}

function timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array): boolean {
  const bytesA = a instanceof Uint8Array ? a : textEncoder.encode(String(a));
  const bytesB = b instanceof Uint8Array ? b : textEncoder.encode(String(b));
  const len = Math.max(bytesA.length, bytesB.length);
  let mismatch = bytesA.length ^ bytesB.length;
  for (let i = 0; i < len; i += 1) {
    const ca = bytesA[i] ?? 0;
    const cb = bytesB[i] ?? 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

function toBase64Url(input: Uint8Array): string {
  let base64: string;
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(input).toString('base64');
  } else {
    let binary = '';
    input.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSign(message: string): Promise<Uint8Array> {
  const secret = textEncoder.encode(getSessionSecret());
  const data = textEncoder.encode(message);
  if (globalThis.crypto?.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
  }
  const { createHmac } = await import('crypto');
  const nodeSig = createHmac('sha256', Buffer.from(secret)).update(Buffer.from(data)).digest();
  return new Uint8Array(nodeSig);
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(message);
  const provided = fromBase64Url(signature);
  const max = Math.max(expected.length, provided.length);
  const paddedExpected = new Uint8Array(max);
  const paddedProvided = new Uint8Array(max);
  paddedExpected.set(expected);
  paddedProvided.set(provided);
  return timingSafeEqual(paddedExpected, paddedProvided);
}

export async function createSessionToken(username: string, ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlSeconds;
  const payload: SessionPayload = {
    user: username,
    issuedAt,
    expiresAt,
    nonce: await generateUUID(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = toBase64Url(textEncoder.encode(payloadJson));
  const signature = await hmacSign(payloadBase64);
  const signatureBase64 = toBase64Url(signature);
  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadPart, signature] = parts;
  const validSignature = await hmacVerify(payloadPart, signature);
  if (!validSignature) return null;
  try {
    const payloadJson = textDecoder.decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload || typeof payload.user !== 'string') return null;
    if (typeof payload.expiresAt !== 'number' || payload.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function buildSessionCookie(token: string, options?: { ttlSeconds?: number; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; path?: string }): string {
  const ttl = options?.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const secure = options?.secure ?? process.env.NODE_ENV !== 'development';
  const sameSite = options?.sameSite ?? 'Lax';
  const path = options?.path ?? '/';
  const segments = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Max-Age=${ttl}`,
    `Path=${path}`,
    `HttpOnly`
  ];
  if (secure) segments.push('Secure');
  segments.push(`SameSite=${sameSite}`);
  return segments.join('; ');
}

export function buildSessionClearCookie(): string {
  const segments = [
    `${SESSION_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    process.env.NODE_ENV !== 'development' ? 'Secure' : '',
    'SameSite=Lax'
  ].filter(Boolean);
  return segments.join('; ');
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  const parts = header.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (!name) continue;
    cookies[name] = rest.join('=').trim();
  }
  return cookies;
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

export async function authenticateCredentials(username: string, password: string): Promise<boolean> {
  const { username: expectedUser, password: expectedPass } = getConfiguredCredentials();
  const normalizedProvided = normalizeUsername(username);
  const normalizedExpected = normalizeUsername(expectedUser);
  const lengthsMatch = normalizedProvided.length === normalizedExpected.length && password.length === expectedPass.length;
  if (!lengthsMatch) {
    // Force timing-safe comparison even when lengths differ
    timingSafeEqual(normalizedProvided, normalizedExpected);
    timingSafeEqual(password, expectedPass);
    return false;
  }
  const usernameOk = timingSafeEqual(normalizedProvided, normalizedExpected);
  const passwordOk = timingSafeEqual(password, expectedPass);
  return usernameOk && passwordOk;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function shouldRefreshSession(session: SessionPayload, thresholdSeconds: number = DEFAULT_REFRESH_THRESHOLD_SECONDS): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.expiresAt - now < thresholdSeconds;
}

export const SESSION_DEFAULT_TTL_SECONDS = DEFAULT_SESSION_TTL_SECONDS;
