#!/usr/bin/env tsx
/*
  Backfill permalink slugs on existing posts.

  After migration 0002 adds the nullable `slug` column, every existing post still
  has a NULL slug. This script assigns each one its default date-derived slug
  (YYYY-MM-DD-HHMM, UTC), auto-suffixing same-minute collisions (`…-2`, `…-3`).

  A post that already has a real slug (i.e. one that isn't just the id fallback)
  is left untouched, so the script is safe to re-run.

  Usage:
    npx tsx scripts/backfill-slugs.ts
    npx tsx scripts/backfill-slugs.ts --dry-run
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

import { listPosts, updatePost } from '../src/lib/core/db-core';
import { slugFromDate, nextAvailableSlug } from '../src/utils/slug';
import type { Post } from '../src/lib/types';

const DRY_RUN = process.argv.includes('--dry-run');
const PAGE_SIZE = 100;

/** Fetch every post via descending-date cursor pagination. */
async function fetchAllPosts(): Promise<Post[]> {
  const all: Post[] = [];
  const seen = new Set<string>();
  let before: string | undefined;
  for (;;) {
    const page = await listPosts({ limit: PAGE_SIZE, before });
    const fresh = page.filter((p) => !seen.has(p.id));
    if (fresh.length === 0) break;
    for (const p of fresh) {
      seen.add(p.id);
      all.push(p);
    }
    before = page[page.length - 1].date;
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN (no changes will be written) ---\n');

  const posts = await fetchAllPosts();
  console.log(`Found ${posts.length} posts.\n`);

  // A post needs a slug when deserializePost fell back to the id (NULL in the DB).
  // Everything else is already backfilled; seed the taken-set with those real slugs.
  const taken = new Set<string>();
  const needsBackfill: Post[] = [];
  for (const post of posts) {
    if (post.slug && post.slug !== post.id) {
      taken.add(post.slug);
    } else {
      needsBackfill.push(post);
    }
  }

  console.log(`${needsBackfill.length} need a slug; ${taken.size} already have one.\n`);

  let updated = 0;
  let errors = 0;
  // Oldest first, so earlier posts claim the unsuffixed slug on a collision.
  needsBackfill.reverse();
  for (const post of needsBackfill) {
    try {
      const slug = nextAvailableSlug(slugFromDate(post.date), taken);
      taken.add(slug);
      console.log(`  ${post.id}  →  ${slug}`);
      if (!DRY_RUN) await updatePost(post.id, { slug });
      updated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${post.id}: ${message}`);
      errors++;
    }
  }

  console.log(`\nDone. ${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
