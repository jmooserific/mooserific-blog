#!/usr/bin/env tsx
/*
  Migrate existing R2 images to Sharp-generated WebP variants.

  For each photo in D1 that still points to a raw uploaded file (i.e. has an
  image file extension), this script will:
    1. Fetch the original image from R2
    2. Generate 5 WebP variants (320w, 480w, 768w, 1024w, 2048w) with Sharp
    3. Upload the variants to R2
    4. Update the post record in D1 with the new base URL

  Already-migrated photos (URLs with no image extension) are skipped unless
  --reprocess is passed, in which case the script locates the original files
  still in R2 and re-generates the variants (useful to fix e.g. rotation bugs).

  Usage:
    npx tsx scripts/migrate-images.ts
    npx tsx scripts/migrate-images.ts --dry-run         (no writes)
    npx tsx scripts/migrate-images.ts --reprocess       (re-process already-migrated photos)
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
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const VARIANT_WIDTHS = [320, 480, 768, 1024, 2048] as const;
const DRY_RUN = process.argv.includes('--dry-run');
const REPROCESS = process.argv.includes('--reprocess');
const VERBOSE = process.argv.includes('--verbose');
const CONCURRENCY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--concurrency='));
  return arg ? Math.max(1, parseInt(arg.split('=')[1], 10)) : 5;
})();

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp)$/i;
const VARIANT_SUFFIX_RE = /-\d+w\.webp$/;

function isOldFormat(url: string): boolean {
  return IMAGE_EXTENSION_RE.test(url.split('?')[0]);
}

function keyFromUrl(url: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base && url.startsWith(base + '/')) return url.slice(base.length + 1);
  try { return new URL(url).pathname.replace(/^\//, ''); } catch { return url; }
}

async function fetchFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadVariants(buffer: Buffer, baseKey: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  await Promise.all(
    VARIANT_WIDTHS.map(async (width) => {
      const resized = await sharp(buffer)
        .rotate()                               // apply EXIF orientation before resizing
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${baseKey}-${width}w.webp`,
        Body: resized,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
    }),
  );
}

/**
 * List original image files in an R2 folder (excludes variant files like -320w.webp).
 * Returns keys sorted alphabetically, matching the order R2 stores them.
 */
async function listOriginalsInFolder(folderKey: string): Promise<string[]> {
  const client = getR2Client();
  const allKeys: string[] = [];
  const originalKeys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: folderKey.endsWith('/') ? folderKey : `${folderKey}/`,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) {
      const key = obj.Key ?? '';
      allKeys.push(key);
      if (IMAGE_EXTENSION_RE.test(key) && !VARIANT_SUFFIX_RE.test(key)) {
        originalKeys.push(key);
      }
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  if (VERBOSE) {
    console.log(`\n  [verbose] folder: ${folderKey}/`);
    console.log(`  [verbose] all keys (${allKeys.length}): ${allKeys.join(', ') || '(none)'}`);
    console.log(`  [verbose] originals found (${originalKeys.length}): ${originalKeys.join(', ') || '(none)'}`);
  }
  return originalKeys.sort();
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
  if (REPROCESS) console.log('--- REPROCESS mode: will re-generate variants for already-migrated photos ---\n');

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

    // In reprocess mode, look up original files from R2 to match against already-migrated photos.
    // Originals may live in a different prefix than the variants — e.g. variants were written to
    // dev/photos/{postId}/ (migration ran locally with ENVIRONMENT=development) while originals
    // were uploaded to photos/{postId}/ (legacy import ran without the dev prefix).
    // Strategy: derive the folder from the D1 URL, and if no originals are found there, retry
    // without the leading dev/ prefix.
    let r2Originals: string[] | null = null;
    if (REPROCESS) {
      const alreadyMigrated = post.photos.filter((p: PhotoAsset) => !isOldFormat(p.url));
      if (alreadyMigrated.length > 0) {
        const firstKey = keyFromUrl(alreadyMigrated[0].url);
        const variantsFolder = firstKey.substring(0, firstKey.lastIndexOf('/'));
        r2Originals = await listOriginalsInFolder(variantsFolder);
        if (r2Originals.length === 0 && variantsFolder.startsWith('dev/')) {
          // Originals were uploaded without the dev/ prefix — look there instead
          r2Originals = await listOriginalsInFolder(variantsFolder.slice(4));
        }
      }
    }

    let migratedIndex = 0; // tracks position within already-migrated photos for r2Originals matching

    if (VERBOSE && REPROCESS) {
      process.stderr.write(`  [verbose] r2Originals for post ${post.id}: ${r2Originals === null ? 'null' : `${r2Originals.length} items`}\n`);
    }

    for (const photo of post.photos) {
      const alreadyMigrated = !isOldFormat(photo.url);

      if (alreadyMigrated && !REPROCESS) {
        skipped++;
        updatedPhotos.push(photo);
        continue;
      }

      if (alreadyMigrated && REPROCESS) {
        // Re-process using the original file from R2, overwriting variants at the same base key
        const originalKey = r2Originals?.[migratedIndex];
        migratedIndex++;

        if (!originalKey) {
          console.error(`  WARN [post ${post.id}] no R2 original found for migrated photo at index ${migratedIndex - 1}, skipping`);
          skipped++;
          updatedPhotos.push(photo);
          continue;
        }

        if (!DRY_RUN) {
          try {
            const baseKey = keyFromUrl(photo.url);
            const buffer = await fetchFromR2(originalKey);
            const metadata = await sharp(buffer).metadata();
            const transposed = (metadata.orientation ?? 1) >= 5;
            await uploadVariants(buffer, baseKey);
            updatedPhotos.push({
              url: photo.url, // same base URL — variants overwritten in place
              width: (transposed ? metadata.height : metadata.width) ?? photo.width,
              height: (transposed ? metadata.width : metadata.height) ?? photo.height,
            });
            postNeedsUpdate = true;
            processed++;
          } catch (err: any) {
            console.error(`  ERROR [post ${post.id}] reprocess ${photo.url}: ${err?.message ?? err}`);
            errors++;
            updatedPhotos.push(photo);
          }
        } else {
          skipped++;
          updatedPhotos.push(photo);
        }
        continue;
      }

      // Standard migration path: old-format photo with a file extension
      const key = keyFromUrl(photo.url);
      const prefix = process.env.ENVIRONMENT === 'development' ? 'dev/' : '';
      const baseKey = `${prefix}photos/${post.id}/${randomUUID()}`;

      if (!DRY_RUN) {
        try {
          const buffer = await fetchFromR2(key);
          const metadata = await sharp(buffer).metadata();
          const transposed = (metadata.orientation ?? 1) >= 5;
          await uploadVariants(buffer, baseKey);
          updatedPhotos.push({
            url: getPublicUrl(baseKey),
            width: (transposed ? metadata.height : metadata.width) ?? photo.width,
            height: (transposed ? metadata.width : metadata.height) ?? photo.height,
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
