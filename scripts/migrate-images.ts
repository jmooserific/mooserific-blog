#!/usr/bin/env tsx
/*
  Migrate existing R2 images to Sharp-generated WebP variants.

  For each photo in D1 that still points to a raw uploaded file (i.e. has an
  image file extension), this script will:
    1. Fetch the original image from R2
    2. Generate 5 WebP variants (320w, 480w, 768w, 1024w, 2048w) with Sharp
    3. Upload the variants to R2
    4. Update the post record in D1 with the new base URL

  Already-migrated photos (URLs with no image extension) are skipped.

  Usage:
    npx tsx scripts/migrate-images.ts
    npx tsx scripts/migrate-images.ts --dry-run   (prints what would change, no writes)
*/

import fsSync from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
{
  const cwd = process.cwd();
  const envLocal = path.join(cwd, '.env.local');
  if (fsSync.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
}

import sharp from 'sharp';
import { getR2Client, getPublicUrl } from '../src/lib/core/r2-core';
import { listPosts, updatePost } from '../src/lib/core/db-core';
import type { PhotoAsset } from '../src/lib/types';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const VARIANT_WIDTHS = [320, 480, 768, 1024, 2048] as const;
const DRY_RUN = process.argv.includes('--dry-run');

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp)$/i;

function isOldFormat(url: string): boolean {
  return IMAGE_EXTENSION_RE.test(url.split('?')[0]);
}

function keyFromUrl(url: string): string {
  // Strip the public base URL prefix to get the R2 object key
  const base = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base && url.startsWith(base + '/')) {
    return url.slice(base.length + 1);
  }
  // Fallback: everything after the hostname
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return url;
  }
}

async function fetchFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function uploadVariants(
  buffer: Buffer,
  baseKey: string,
): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  await Promise.all(
    VARIANT_WIDTHS.map(async (width) => {
      const resized = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${baseKey}-${width}w.webp`,
        Body: resized,
        ContentType: 'image/webp',
      }));
    }),
  );
}

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN (no changes will be written) ---\n' : '');

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let before: string | undefined;

  // Paginate through all posts (D1 max 100 per query)
  while (true) {
    const posts = await listPosts({ limit: 100, before });
    if (posts.length === 0) break;

    for (const post of posts) {
      const updatedPhotos: PhotoAsset[] = [];
      let postNeedsUpdate = false;

      for (const photo of post.photos) {
        if (!isOldFormat(photo.url)) {
          skipped++;
          updatedPhotos.push(photo);
          continue;
        }

        const key = keyFromUrl(photo.url);
        const prefix = process.env.ENVIRONMENT === 'development' ? 'dev/' : '';
        const baseKey = `${prefix}photos/${post.id}/${randomUUID()}`;

        console.log(`  [post ${post.id}] ${photo.url}`);
        console.log(`    → ${getPublicUrl(baseKey)}-{width}w.webp`);

        if (!DRY_RUN) {
          try {
            const buffer = await fetchFromR2(key);
            const metadata = await sharp(buffer).metadata();
            await uploadVariants(buffer, baseKey);
            updatedPhotos.push({
              url: getPublicUrl(baseKey),
              width: metadata.width ?? photo.width,
              height: metadata.height ?? photo.height,
            });
            postNeedsUpdate = true;
            processed++;
          } catch (err: any) {
            console.error(`    ERROR: ${err?.message ?? err}`);
            errors++;
            updatedPhotos.push(photo); // keep original on error
          }
        } else {
          skipped++;
          updatedPhotos.push(photo);
        }
      }

      if (postNeedsUpdate && !DRY_RUN) {
        await updatePost(post.id, { photos: updatedPhotos });
        console.log(`    ✓ Post ${post.id} updated in D1`);
      }
    }

    // Advance cursor to the oldest post date in this page
    before = posts[posts.length - 1].date;

    // If we got fewer than 100, we're on the last page
    if (posts.length < 100) break;
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
