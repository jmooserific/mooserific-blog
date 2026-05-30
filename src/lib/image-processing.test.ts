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
  getPublicUrl: vi.fn((key: string) => `https://cdn.example.test/${key}`),
}));

import { putObject, getPublicUrl } from './r2';
import { processAndUploadImage, variantUrl, VARIANT_WIDTHS, LIGHTBOX_WIDTH } from './image-processing';

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

describe('processAndUploadImage', () => {
  it('uploads the original plus one webp per variant width and returns dimensions', async () => {
    const result = await processAndUploadImage(Buffer.from('img'), 'post1', 'pic.jpg', 'image/jpeg');

    // 1 original + one per variant width
    expect(vi.mocked(putObject)).toHaveBeenCalledTimes(1 + VARIANT_WIDTHS.length);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
    expect(result.originalContentType).toBe('image/jpeg');
    expect(getPublicUrl).toHaveBeenCalled();
    expect(result.baseUrl).toContain('photos/post1/');
  });

  it('swaps width/height for EXIF orientations that rotate 90/270 degrees', async () => {
    h.metadata.mockResolvedValue({ width: 100, height: 200, orientation: 6 });
    const result = await processAndUploadImage(Buffer.from('img'), 'post1', 'pic.jpg', 'image/jpeg');
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('falls back to zero dimensions when sharp reports no metadata', async () => {
    h.metadata.mockResolvedValue({} as { width: number; height: number; orientation: number });
    const result = await processAndUploadImage(Buffer.from('img'), 'post1', 'pic.jpg', 'image/jpeg');
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('uploads the original with its real content type', async () => {
    await processAndUploadImage(Buffer.from('img'), 'post1', 'pic.jpg', 'image/png');
    const originalCall = vi
      .mocked(putObject)
      .mock.calls.find((c) => c[0].contentType === 'image/png');
    expect(originalCall).toBeTruthy();
  });
});
