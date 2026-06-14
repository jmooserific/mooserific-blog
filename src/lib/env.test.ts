import { describe, it, expect, afterEach, vi } from 'vitest';

// env() caches at module scope, so tests that need a different process.env must
// reset the module registry and re-import a fresh copy.
async function freshEnv() {
  vi.resetModules();
  return (await import('./env')).env;
}

describe('env', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('returns the configured values', async () => {
    const env = await freshEnv();
    const e = env();
    expect(e.SESSION_SECRET).toBe('test-session-secret-please-do-not-use-in-prod');
    expect(e.R2_BUCKET_NAME).toBe('test-bucket');
  });

  it('caches the result across calls', async () => {
    const env = await freshEnv();
    expect(env()).toBe(env());
  });

  it('falls back to R2_ACCOUNT_ID when D1_ACCOUNT_ID is absent', async () => {
    delete process.env.D1_ACCOUNT_ID;
    const env = await freshEnv();
    expect(env().D1_ACCOUNT_ID).toBe(process.env.R2_ACCOUNT_ID);
  });

  it('defaults MAX_FILE_BYTES to 500MB and ENVIRONMENT to empty when unset', async () => {
    delete process.env.MAX_FILE_BYTES;
    delete process.env.ENVIRONMENT;
    const env = await freshEnv();
    expect(env().MAX_FILE_BYTES).toBe(500 * 1024 * 1024);
    expect(env().ENVIRONMENT).toBe('');
  });

  it('honors an explicit MAX_FILE_BYTES', async () => {
    process.env.MAX_FILE_BYTES = '1024';
    const env = await freshEnv();
    expect(env().MAX_FILE_BYTES).toBe(1024);
  });

  it('throws listing every missing required variable', async () => {
    delete process.env.SESSION_SECRET;
    delete process.env.R2_BUCKET_NAME;
    const env = await freshEnv();
    expect(() => env()).toThrow(/SESSION_SECRET/);
    expect(() => env()).toThrow(/R2_BUCKET_NAME/);
  });

  it('treats the admin seed credentials as optional', async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    const env = await freshEnv();
    expect(() => env()).not.toThrow();
    expect(env().ADMIN_USERNAME).toBeUndefined();
  });
});
