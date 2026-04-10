#!/usr/bin/env tsx
/*
  Backfill Cache-Control headers on existing R2 objects.

  Uses CopyObject with MetadataDirective=REPLACE to update each object's
  metadata in-place — no re-upload of the actual bytes required.

  Objects that already have the correct Cache-Control value are skipped.

  Usage:
    pnpm run backfill:cache-control
    pnpm run backfill:cache-control --dry-run
    pnpm run backfill:cache-control --concurrency=10
    pnpm run backfill:cache-control --prefix=photos/   (limit to a key prefix)
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

import {
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client } from '../src/lib/core/r2-core';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--concurrency='));
  return arg ? Math.max(1, parseInt(arg.split('=')[1], 10)) : 5;
})();
const PREFIX = (() => {
  const arg = process.argv.find((a) => a.startsWith('--prefix='));
  return arg ? arg.split('=')[1] : undefined;
})();
const REPORT_SKIPPED = process.argv.includes('--report-skipped');

async function listAllKeys(bucket: string, prefix?: string): Promise<string[]> {
  const client = getR2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return keys;
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

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN (no changes will be written) ---\n');

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME env var');

  const client = getR2Client();

  console.log(`Listing objects in bucket "${bucket}"${PREFIX ? ` (prefix: ${PREFIX})` : ''}…`);
  const keys = await listAllKeys(bucket, PREFIX);
  console.log(`Found ${keys.length} objects. Processing with concurrency=${CONCURRENCY}.\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let done = 0;

  await withConcurrency(keys, CONCURRENCY, async (key) => {
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

      if (head.CacheControl === CACHE_CONTROL) {
        skipped++;
        if (REPORT_SKIPPED) console.log(`\n  SKIP ${key} (Cache-Control: ${head.CacheControl})`);
      } else if (!DRY_RUN) {
        await client.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: key,
          MetadataDirective: 'REPLACE',
          CacheControl: CACHE_CONTROL,
          ContentType: head.ContentType,
        }));
        updated++;
      } else {
        updated++; // count as "would update" in dry-run
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ERROR ${key}: ${message}`);
      errors++;
    }

    done++;
    const pct = Math.round((done / keys.length) * 100);
    process.stdout.write(`\r  ${done}/${keys.length} (${pct}%) — ${updated} updated, ${skipped} skipped, ${errors} errors`);
  });

  console.log(`\n\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
