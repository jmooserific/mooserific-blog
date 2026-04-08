import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { putObject, getPublicUrl } from './r2';

export const VARIANT_WIDTHS = [320, 480, 768, 1024, 2048] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** The largest variant — used for lightbox display */
export const LIGHTBOX_WIDTH: VariantWidth = 2048;

/** Append the width suffix to a base URL to get the full variant URL */
export function variantUrl(baseUrl: string, width: VariantWidth): string {
  return `${baseUrl}-${width}w.webp`;
}

/**
 * Process an image buffer with Sharp, upload 5 WebP variants to R2,
 * and return the base URL (without width suffix) plus original dimensions.
 */
export async function processAndUploadImage(
  buffer: Buffer,
  postId: string,
): Promise<{ baseUrl: string; width: number; height: number }> {
  const uuid = randomUUID();
  const prefix = process.env.ENVIRONMENT === 'development' ? 'dev/' : '';
  const baseKey = `${prefix}photos/${postId}/${uuid}`;

  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  await Promise.all(
    VARIANT_WIDTHS.map(async (width) => {
      const resized = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await putObject({ key: `${baseKey}-${width}w.webp`, contentType: 'image/webp', body: resized });
    }),
  );

  return { baseUrl: getPublicUrl(baseKey), width: originalWidth, height: originalHeight };
}
