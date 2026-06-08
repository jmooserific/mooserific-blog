import 'server-only';
import sharp from 'sharp';
import { putObject, getObject, getPublicUrl, baseKeyFromOriginalKey } from './r2';

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
 * Generate the 5 WebP variants from an image buffer and upload them under `baseKey`.
 * Returns the correctly-oriented original dimensions. Does NOT upload the original —
 * the client uploads that directly to R2 via a presigned PUT.
 */
export async function generateAndUploadVariants(
  buffer: Buffer,
  baseKey: string,
): Promise<{ width: number; height: number }> {
  // .metadata() returns the raw pre-rotation pixel dimensions. For images that need
  // a 90°/270° rotation (EXIF orientations 5–8), we swap width and height so the
  // stored dimensions match the correctly-oriented display size.
  const metadata = await sharp(buffer).metadata();
  const transposed = (metadata.orientation ?? 1) >= 5;
  const width = (transposed ? metadata.height : metadata.width) ?? 0;
  const height = (transposed ? metadata.width : metadata.height) ?? 0;

  await Promise.all(
    VARIANT_WIDTHS.map(async (w) => {
      const resized = await sharp(buffer)
        .rotate()                               // apply EXIF orientation before resizing
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await putObject({ key: `${baseKey}-${w}w.webp`, contentType: 'image/webp', body: resized });
    }),
  );

  return { width, height };
}

/**
 * Read an already-uploaded original from R2, generate + upload its WebP variants, and
 * return the URLs plus dimensions. Triggered by a small JSON request after the client
 * has streamed the original straight to R2 — so the slow upload never runs through (or
 * counts against) this function's execution time.
 */
export async function processImageFromR2(
  originalKey: string,
  contentType: string,
): Promise<ProcessImageResult> {
  const baseKey = baseKeyFromOriginalKey(originalKey);
  const buffer = await getObject(originalKey);
  const { width, height } = await generateAndUploadVariants(buffer, baseKey);

  return {
    baseUrl: getPublicUrl(baseKey),
    width,
    height,
    originalUrl: getPublicUrl(originalKey),
    originalContentType: contentType,
  };
}
