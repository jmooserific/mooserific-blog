#!/usr/bin/env tsx
/*
  Backfill originalUrl and originalContentType for existing photos.

  For each photo in D1 that lacks an originalUrl, this script will:
    1. Derive the R2 folder from the photo's base URL
    2. List original image files in that folder (non-variant files with image extensions)
    3. Match originals to photos by position order
    4. Update the post record in D1 with originalUrl and originalContentType

  Usage:
    npx tsx scripts/backfill-original-urls.ts
    npx tsx scripts/backfill-original-urls.ts --dry-run         (no writes)
    npx tsx scripts/backfill-original-urls.ts --verbose
    npx tsx scripts/backfill-original-urls.ts --concurrency=10
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

import { getR2Client, getPublicUrl } from '../src/lib/core/r2-core';
import { listPosts, updatePost } from '../src/lib/core/db-core';
import type { PhotoAsset } from '../src/lib/types';
import { ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const CONCURRENCY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--concurrency='));
  return arg ? Math.max(1, parseInt(arg.split('=')[1], 10)) : 5;
})();

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp)$/i;
const VARIANT_SUFFIX_RE = /-\d+w\.webp$/;

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.bmp': 'image/bmp',
};

function contentTypeFromKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';
}

function keyFromUrl(url: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base && url.startsWith(base + '/')) return url.slice(base.length + 1);
  try { return new URL(url).pathname.replace(/^\//, ''); } catch { return url; }
}

/**
 * List original image files in an R2 folder (excludes variant files like -320w.webp).
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

  console.log('Fetching all posts from D1...');
  const posts = await fetchAllPosts();
  const total = posts.length;
  console.log(`Found ${total} posts. Processing with concurrency=${CONCURRENCY}.\n`);

  let updated = 0;
  let alreadyDone = 0;
  let matched = 0;
  let unmatched = 0;
  let errors = 0;
  let postsDone = 0;

  await withConcurrency(posts, CONCURRENCY, async (post) => {
    // Check if all photos already have originalUrl
    const needsBackfill = post.photos.some((p: PhotoAsset) => !p.originalUrl);
    if (!needsBackfill) {
      alreadyDone++;
      postsDone++;
      return;
    }

    try {
      // Derive folder from first photo's base URL
      const firstKey = keyFromUrl(post.photos[0].url);
      const folder = firstKey.substring(0, firstKey.lastIndexOf('/'));

      let r2Originals = await listOriginalsInFolder(folder);

      // If no originals found and folder starts with dev/, try without prefix
      if (r2Originals.length === 0 && folder.startsWith('dev/')) {
        r2Originals = await listOriginalsInFolder(folder.slice(4));
      }

      if (r2Originals.length === 0) {
        console.error(`  WARN [post ${post.id}] no originals found in R2 folder ${folder}`);
        unmatched += post.photos.length;
        postsDone++;
        return;
      }

      if (r2Originals.length !== post.photos.length) {
        console.error(`  WARN [post ${post.id}] photo count mismatch: ${post.photos.length} in DB, ${r2Originals.length} originals in R2`);
      }

      const updatedPhotos: PhotoAsset[] = post.photos.map((photo: PhotoAsset, i: number) => {
        if (photo.originalUrl) {
          alreadyDone++;
          return photo;
        }

        const originalKey = r2Originals[i];
        if (!originalKey) {
          console.error(`  WARN [post ${post.id}] no R2 original at index ${i}, skipping`);
          unmatched++;
          return photo;
        }

        matched++;
        return {
          ...photo,
          originalUrl: getPublicUrl(originalKey),
          originalContentType: contentTypeFromKey(originalKey),
        };
      });

      if (!DRY_RUN) {
        await updatePost(post.id, { photos: updatedPhotos });
      }
      updated++;

      if (VERBOSE) {
        console.log(`  [verbose] post ${post.id}: updated ${updatedPhotos.filter((p) => p.originalUrl).length}/${post.photos.length} photos`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR [post ${post.id}]: ${message}`);
      errors++;
    }

    postsDone++;
    const pct = Math.round((postsDone / total) * 100);
    process.stdout.write(`\r  ${postsDone}/${total} posts (${pct}%) — ${matched} photos matched, ${errors} errors`);
  });

  console.log(`\n\nDone.`);
  console.log(`  Posts updated: ${updated}`);
  console.log(`  Posts already complete: ${alreadyDone}`);
  console.log(`  Photos matched: ${matched}`);
  console.log(`  Photos unmatched: ${unmatched}`);
  console.log(`  Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
