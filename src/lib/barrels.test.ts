import { describe, it, expect, vi } from 'vitest';

// The thin barrel modules re-export from their `core` implementations behind the
// `server-only` guard. Importing them here exercises the wiring and confirms the
// public surface stays intact.

vi.mock('cloudflare', () => ({ default: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(), PutObjectCommand: vi.fn() }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }));
vi.mock('./core/cloudflare-core', () => ({ getCloudflareClient: vi.fn() }));

describe('barrel exports', () => {
  it('re-exports the auth surface', async () => {
    const auth = await import('./auth');
    expect(typeof auth.createSessionToken).toBe('function');
    expect(typeof auth.authenticateCredentials).toBe('function');
    expect(auth.SESSION_DEFAULT_TTL_SECONDS).toBeGreaterThan(0);
  });

  it('re-exports the db surface', async () => {
    const db = await import('./db');
    expect(typeof db.listPosts).toBe('function');
    expect(typeof db.createPost).toBe('function');
    expect(typeof db.getDateMetadata).toBe('function');
  });

  it('re-exports the r2 surface', async () => {
    const r2 = await import('./r2');
    expect(typeof r2.putObject).toBe('function');
    expect(typeof r2.getPresignedPutUrl).toBe('function');
  });

  it('re-exports the cloudflare client factory', async () => {
    const cf = await import('./cloudflare');
    expect(typeof cf.getCloudflareClient).toBe('function');
  });
});
