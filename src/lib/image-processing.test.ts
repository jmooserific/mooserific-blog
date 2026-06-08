import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const metadata = vi.fn(async () => ({ width: 100, height: 200, orientation: 1 }));
  const instance = {
    metadata,
    rotate: vi.fn(() => instance),
    resize: vi.fn(() => instance),
    webp: vi.fn(() => instance),
    toBuffer: vi.fn(async () => Buffer.from('resized')),
  };
  return { metadata, sharp: vi.fn(() => instance) };
});

vi.mock('sharp', () => ({ default: h.sharp }));
vi.mock('./r2', () => ({
  putObject: vi.fn(async () => 'ok'),
  getObject: vi.fn(async () => Buffer.from('original')),
  getPublicUrl: vi.fn((key: string) => `https://cdn.example.test/${key}`),
  baseKeyFromOriginalKey: vi.fn((key: string) => key.slice(0, key.lastIndexOf('/'))),
  ObjectTooLargeError: class extends Error {},
}));

import { putObject, getObject } from './r2';
import {
  processImageFromR2,
  generateAndUploadVariants,
  variantUrl,
  VARIANT_WIDTHS,
  LIGHTBOX_WIDTH,
} from './image-processing';

beforeEach(() => {
  vi.clearAllMocks();
  h.metadata.mockResolvedValue({ width: 100, height: 200, orientation: 1 });
});

describe('variantUrl', () => {
  it('appends the width-suffixed webp name', () => {
    expect(variantUrl('https://cdn/base', 768)).toBe('https://cdn/base-768w.webp');
  });
});

describe('constants', () => {
  it('exposes the lightbox width as the largest variant', () => {
    expect(LIGHTBOX_WIDTH).toBe(Math.max(...VARIANT_WIDTHS));
  });
});

describe('generateAndUploadVariants', () => {
  it('uploads one webp per variant width and does NOT re-upload the original', async () => {
    const { width, height } = await generateAndUploadVariants(Buffer.from('img'), 'photos/post1/uuid');

    expect(vi.mocked(putObject)).toHaveBeenCalledTimes(VARIANT_WIDTHS.length);
    // Every upload is a webp variant — the original is uploaded directly to R2 by the client.
    for (const call of vi.mocked(putObject).mock.calls) {
      expect(call[0].contentType).toBe('image/webp');
      expect(call[0].key).toMatch(/^photos\/post1\/uuid-\d+w\.webp$/);
    }
    expect(width).toBe(100);
    expect(height).toBe(200);
  });

  it('swaps width/height for EXIF orientations that rotate 90/270 degrees', async () => {
    h.metadata.mockResolvedValue({ width: 100, height: 200, orientation: 6 });
    const { width, height } = await generateAndUploadVariants(Buffer.from('img'), 'photos/post1/uuid');
    expect(width).toBe(200);
    expect(height).toBe(100);
  });

  it('falls back to zero dimensions when sharp reports no metadata', async () => {
    h.metadata.mockResolvedValue({} as { width: number; height: number; orientation: number });
    const { width, height } = await generateAndUploadVariants(Buffer.from('img'), 'photos/post1/uuid');
    expect(width).toBe(0);
    expect(height).toBe(0);
  });
});

describe('processImageFromR2', () => {
  it('reads the original from R2, derives the base key, and returns URLs + dimensions', async () => {
    const originalKey = 'photos/post1/abc-uuid/pic.jpg';
    const result = await processImageFromR2(originalKey, 'image/jpeg');

    expect(vi.mocked(getObject)).toHaveBeenCalledWith(originalKey, expect.objectContaining({ maxBytes: expect.any(Number) }));
    expect(vi.mocked(putObject)).toHaveBeenCalledTimes(VARIANT_WIDTHS.length);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
    expect(result.originalContentType).toBe('image/jpeg');
    expect(result.baseUrl).toContain('photos/post1/abc-uuid');
    expect(result.originalUrl).toContain(originalKey);
  });
});
