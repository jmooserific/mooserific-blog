import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
const s3Construct = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  // S3Client / PutObjectCommand are invoked with `new`, so the mocks must be constructable.
  S3Client: class {
    send = send;
    constructor(cfg: unknown) {
      s3Construct(cfg);
    }
  },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  GetObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example.test/upload'),
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, buildObjectKey, buildPhotoKeys, baseKeyFromOriginalKey, getPublicUrl, putObject, getObject, getPresignedPutUrl } from './r2-core';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getR2Client', () => {
  it('points the S3 client at the R2 endpoint with credentials', () => {
    getR2Client();
    const cfg = s3Construct.mock.calls[0][0] as { endpoint: string; credentials: { accessKeyId: string } };
    expect(cfg.endpoint).toBe('https://test-r2-account.r2.cloudflarestorage.com');
    expect(cfg.credentials.accessKeyId).toBe('test-access-key');
  });
});

describe('buildObjectKey', () => {
  it('builds a photo key (no dev prefix outside development)', () => {
    expect(buildObjectKey('a.jpg', 'post1')).toBe('photos/post1/a.jpg');
  });

  it('builds a video key', () => {
    expect(buildObjectKey('clip.mp4', 'post1', 'video')).toBe('videos/post1/clip.mp4');
  });
});

describe('buildPhotoKeys', () => {
  it('namespaces the original under a uuid and shares that base for variants', () => {
    const { baseKey, originalKey } = buildPhotoKeys('post1', 'pic.jpg');
    expect(originalKey).toMatch(/^photos\/post1\/[0-9a-f-]{36}\/pic\.jpg$/i);
    expect(originalKey).toBe(`${baseKey}/pic.jpg`);
    expect(baseKey).toMatch(/^photos\/post1\/[0-9a-f-]{36}$/i);
  });

  it('produces a distinct uuid per call', () => {
    expect(buildPhotoKeys('post1', 'pic.jpg').baseKey).not.toBe(buildPhotoKeys('post1', 'pic.jpg').baseKey);
  });
});

describe('baseKeyFromOriginalKey', () => {
  it('recovers the variant base key from an original key (inverse of buildPhotoKeys)', () => {
    const { baseKey, originalKey } = buildPhotoKeys('post1', 'pic.jpg');
    expect(baseKeyFromOriginalKey(originalKey)).toBe(baseKey);
  });
});

describe('getObject', () => {
  it('fetches the key and returns the body as a Buffer', async () => {
    send.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } });
    const buf = await getObject('photos/post1/uuid/pic.jpg');
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as { input: { Key: string } };
    expect(command.input.Key).toBe('photos/post1/uuid/pic.jpg');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect([...buf]).toEqual([1, 2, 3]);
  });

  it('throws when the object has no body', async () => {
    send.mockResolvedValueOnce({});
    await expect(getObject('missing/key')).rejects.toThrow(/not found/);
  });
});

describe('getPublicUrl', () => {
  it('prefixes the configured public base URL', () => {
    expect(getPublicUrl('photos/post1/a.jpg')).toBe('https://cdn.example.test/photos/post1/a.jpg');
  });

  it('falls back to a relative path when no public base URL is configured', async () => {
    const original = process.env.R2_PUBLIC_BASE_URL;
    delete process.env.R2_PUBLIC_BASE_URL;
    vi.resetModules();
    try {
      const fresh = await import('./r2-core');
      expect(fresh.getPublicUrl('photos/post1/a.jpg')).toBe('/photos/post1/a.jpg');
    } finally {
      process.env.R2_PUBLIC_BASE_URL = original;
      vi.resetModules();
    }
  });
});

describe('putObject', () => {
  it('uploads with immutable cache headers and returns the public URL', async () => {
    const url = await putObject({ key: 'photos/x.webp', contentType: 'image/webp', body: Buffer.from('x') });
    expect(s3Construct).toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as { input: { CacheControl: string; Key: string } };
    expect(command.input.Key).toBe('photos/x.webp');
    expect(command.input.CacheControl).toContain('immutable');
    expect(url).toBe('https://cdn.example.test/photos/x.webp');
  });
});

describe('getPresignedPutUrl', () => {
  it('returns a signed URL with the default 900s expiry', async () => {
    const url = await getPresignedPutUrl({ key: 'photos/x.webp', contentType: 'image/webp' });
    expect(url).toBe('https://signed.example.test/upload');
    const opts = vi.mocked(getSignedUrl).mock.calls[0][2] as { expiresIn: number };
    expect(opts.expiresIn).toBe(900);
  });

  it('honors a custom expiry', async () => {
    await getPresignedPutUrl({ key: 'photos/x.webp', contentType: 'image/webp', expiresIn: 60 });
    const opts = vi.mocked(getSignedUrl).mock.calls[0][2] as { expiresIn: number };
    expect(opts.expiresIn).toBe(60);
  });
});
