import { describe, it, expect } from 'vitest';
import r2ImageLoader from './image-loader';

describe('r2ImageLoader', () => {
  it('picks the smallest variant that covers the requested width', () => {
    expect(r2ImageLoader({ src: 'https://cdn/x', width: 400, quality: 75 })).toBe('https://cdn/x-480w.webp');
  });

  it('picks an exact variant match', () => {
    expect(r2ImageLoader({ src: 'https://cdn/x', width: 768, quality: 75 })).toBe('https://cdn/x-768w.webp');
  });

  it('uses the smallest variant for tiny widths', () => {
    expect(r2ImageLoader({ src: 'https://cdn/x', width: 10, quality: 75 })).toBe('https://cdn/x-320w.webp');
  });

  it('falls back to the largest variant when the request exceeds all variants', () => {
    expect(r2ImageLoader({ src: 'https://cdn/x', width: 5000, quality: 75 })).toBe('https://cdn/x-2048w.webp');
  });
});
