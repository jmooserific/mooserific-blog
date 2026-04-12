import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { putObject, getPublicUrl } from './r2';
import { env } from './env';

export const VARIANT_WIDTHS = [320, 480, 768, 1024, 2048] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** The largest variant — used for lightbox display */
export const LIGHTBOX_WIDTH: VariantWidth = 2048;

/** Append the width suffix to a base URL to get the full variant URL */
export function variantUrl(baseUrl: string, width: VariantWidth): string {
  return `${baseUrl}-${width}w.webp`;
}

interface ProcessImageResult {
  baseUrl: string;
  width: number;
  height: number;
  originalUrl: string;
  originalContentType: string;
}

/**
 * Process an image buffer with Sharp, upload 5 WebP variants to R2,
 * store the original file alongside them, and return URLs plus dimensions.
 */
export async function processAndUploadImage(
  buffer: Buffer,
  postId: string,
  originalFilename: string,
  contentType: string,
): Promise<ProcessImageResult> {
  const uuid = randomUUID();
  const prefix = env().ENVIRONMENT === 'development' ? 'dev/' : '';
  const baseKey = `${prefix}photos/${postId}/${uuid}`;
  const originalKey = `${prefix}photos/${postId}/${uuid}/${originalFilename}`;

  // .metadata() returns the raw pre-rotation pixel dimensions. For images that need
  // a 90°/270° rotation (EXIF orientations 5–8), we swap width and height so the
  // stored dimensions match the correctly-oriented display size.
  const metadata = await sharp(buffer).metadata();
  const transposed = (metadata.orientation ?? 1) >= 5;
  const originalWidth = (transposed ? metadata.height : metadata.width) ?? 0;
  const originalHeight = (transposed ? metadata.width : metadata.height) ?? 0;

  await Promise.all([
    // Upload the original file
    putObject({ key: originalKey, contentType, body: buffer }),
    // Upload WebP variants
    ...VARIANT_WIDTHS.map(async (width) => {
      const resized = await sharp(buffer)
        .rotate()                               // apply EXIF orientation before resizing
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await putObject({ key: `${baseKey}-${width}w.webp`, contentType: 'image/webp', body: resized });
    }),
  ]);

  return {
    baseUrl: getPublicUrl(baseKey),
    width: originalWidth,
    height: originalHeight,
    originalUrl: getPublicUrl(originalKey),
    originalContentType: contentType,
  };
}
