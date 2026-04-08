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
    npx tsx scripts/migrate-images.ts --dry-run      (prints what would change, no writes)
    npx tsx scripts/migrate-images.ts --concurrency=10
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
const CONCURRENCY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--concurrency='));
  return arg ? Math.max(1, parseInt(arg.split('=')[1], 10)) : 5;
})();

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp)$/i;

function isOldFormat(url: string): boolean {
  return IMAGE_EXTENSION_RE.test(url.split('?')[0]);
}

function keyFromUrl(url: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base && url.startsWith(base + '/')) {
    return url.slice(base.length + 1);
  }
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

async function uploadVariants(buffer: Buffer, baseKey: string): Promise<void> {
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

/** Run `fn` over all items with at most `concurrency` in-flight at once. */
async function withConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function fetchAllPosts() {
  const all = [];
  let before: string | undefined;
  while (true) {
    const page = await listPosts({ limit: 100, before });
    if (page.length === 0) break;
    all.push(...page);
    before = page[page.length - 1].date;
    if (page.length < 100) break;
  }
  return all;
}

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN (no changes will be written) ---\n');

  console.log('Fetching all posts from D1…');
  const posts = await fetchAllPosts();
  const total = posts.length;
  console.log(`Found ${total} posts. Processing with concurrency=${CONCURRENCY}.\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let postsDone = 0;

  await withConcurrency(posts, CONCURRENCY, async (post) => {
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
          console.error(`  ERROR [post ${post.id}] ${photo.url}: ${err?.message ?? err}`);
          errors++;
          updatedPhotos.push(photo);
        }
      } else {
        skipped++;
        updatedPhotos.push(photo);
      }
    }

    if (postNeedsUpdate && !DRY_RUN) {
      await updatePost(post.id, { photos: updatedPhotos });
    }

    postsDone++;
    const pct = Math.round((postsDone / total) * 100);
    process.stdout.write(`\r  ${postsDone}/${total} posts (${pct}%) — ${processed} images done, ${errors} errors`);
  });

  console.log(`\n\nDone. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
