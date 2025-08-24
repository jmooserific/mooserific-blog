#!/usr/bin/env tsx
/*
  Import legacy filesystem posts into D1 and upload media to R2.
  Usage: pnpm run import:legacy [rootDir]
  Example: pnpm run import:legacy posts
*/

// Load env from .env.local (preferred) or .env
import fsSync from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
{
  const cwd = process.cwd();
  const envLocal = path.join(cwd, '.env.local');
  if (fsSync.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
}

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mime from 'mime-types';

// Reuse app libs
import { putObject, buildObjectKey, getPublicUrl } from '../src/lib/core/r2-core';
import { createPost, getPost } from '../src/lib/core/db-core';
import type { PhotoAsset } from '../src/lib/types';

interface LegacyPhoto { filename: string; width: number; height: number }
interface LegacyJson {
  date: string;
  author?: string;
  caption?: string;
  photos?: LegacyPhoto[];
  videos?: string[];
}

function isIsoDate(s: string) {
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
}

async function readDirSafe(dir: string) {
  try { return await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
}

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

function toIdFromFolder(folderName: string) {
  // Turn YYYY-MM-DDTHH-MM into a stable id: yyyymmdd-hhmm-<hash>
  const base = folderName.replace(/[^0-9A-Za-z]+/g, '');
  const short = base.slice(0, 12);
  const hash = crypto.createHash('sha1').update(folderName).digest('hex').slice(0, 8);
  return `${short}-${hash}`;
}

async function importOnePost(root: string, folder: string, opts: { dryRun?: boolean } = {}) {
  const postDir = path.join(root, folder);
  const jsonPath = path.join(postDir, 'post.json');
  if (!(await fileExists(jsonPath))) {
    console.warn(`Skip ${folder}: no post.json`);
    return null;
  }
  const raw = await fs.readFile(jsonPath, 'utf8');
  const data = JSON.parse(raw) as LegacyJson;
  if (!isIsoDate(data.date)) {
    console.warn(`Skip ${folder}: invalid date ${data.date}`);
    return null;
  }

  const id = toIdFromFolder(folder);
  const description = (data.caption || '').trim() || undefined; // already Markdown

  // If a post with this id already exists, skip media upload/insert (unless dry-run)
  const existing = await getPost(id).catch(() => null);
  if (existing && !opts.dryRun) {
    console.log(`Post ${id} already exists, skipping import`);
    return existing as any;
  }

  // Upload photos
  const photos: PhotoAsset[] = [];
  for (const p of data.photos || []) {
    const fileName = p.filename || '';
    const filePath = path.join(postDir, fileName);
    if (!(await fileExists(filePath))) {
      console.warn(`Photo missing ${filePath} — skipping`);
      continue;
    }
    const contentType = mime.contentType(path.extname(fileName)) || 'application/octet-stream';
    const key = buildObjectKey(fileName, id, 'photo');
    const url = opts.dryRun ? getPublicUrl(key) : await (async () => {
      const buf = await fs.readFile(filePath);
      return putObject({ key, contentType, body: buf });
    })();
    photos.push({ url, width: p.width || 0, height: p.height || 0 });
  }

  // Upload videos
  const videoUrls: string[] = [];
  for (const v of data.videos || []) {
    const fileName = v;
    const filePath = path.join(postDir, fileName);
    if (!(await fileExists(filePath))) {
      console.warn(`Video missing ${filePath} — skipping`);
      continue;
    }
    const contentType = mime.contentType(path.extname(fileName)) || 'application/octet-stream';
    const key = buildObjectKey(fileName, id, 'video');
    const url = opts.dryRun ? getPublicUrl(key) : await (async () => {
      const buf = await fs.readFile(filePath);
      return putObject({ key, contentType, body: buf });
    })();
    videoUrls.push(url);
  }

  // Insert post into D1
  if (opts.dryRun) {
    return {
      id,
      date: new Date(data.date).toISOString(),
      author: data.author,
      description,
      photos,
      videos: videoUrls.length ? videoUrls : undefined
    } as any;
  }
  // existing is only possible here during dry-run; non-dry-run was returned earlier
  const post = await createPost({
    id,
    date: new Date(data.date).toISOString(),
    author: data.author,
    description,
    photos,
    videos: videoUrls.length ? videoUrls : undefined
  });

  return post;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dirArg = args.find(a => !a.startsWith('-'));
  const root = dirArg ? path.resolve(dirArg) : path.resolve('posts');
  const entries = await readDirSafe(root);
  const folders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  if (!folders.length) {
    console.error(`No post folders found in ${root}`);
    process.exit(1);
  }

  console.log(`Found ${folders.length} folders. Starting import...`);
  let ok = 0, fail = 0;
  for (const f of folders) {
    try {
      const res = await importOnePost(root, f, { dryRun });
      if (res) {
        ok++;
        console.log(`${dryRun ? 'Planned' : 'Imported'} ${f} -> ${res.id}`);
      }
    } catch (err) {
      fail++;
      console.error(`Failed ${f}:`, err);
    }
  }
  console.log(`Done. Imported=${ok}, Failed=${fail}`);
}

// Only run when executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
