import type { ImageLoaderProps } from 'next/image';

const VARIANT_WIDTHS = [320, 480, 768, 1024, 2048];

export default function r2ImageLoader({ src, width }: ImageLoaderProps): string {
  // Pick the smallest pre-generated variant that covers the requested width,
  // falling back to the largest if the request exceeds all variants.
  const chosen = VARIANT_WIDTHS.find((w) => w >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
  return `${src}-${chosen}w.webp`;
}
