import type { Post, ListPostsOptions, PhotoAsset } from '../types';
import { getCloudflareClient } from './cloudflare-core';

async function d1Query<T = any>(sql: string, params: any[] = []): Promise<{ results: T[] }> {
  const dbId = process.env.D1_DATABASE_ID;
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.D1_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const missing: string[] = [];
  if (!dbId) missing.push('D1_DATABASE_ID');
  if (!token) missing.push('CF_API_TOKEN');
  if (!accountId) missing.push('D1_ACCOUNT_ID (or R2_ACCOUNT_ID)');
  if (missing.length) throw new Error(`Missing required env vars for D1: ${missing.join(', ')}`);

  const normalizedSql = sql.replace(/\$\d+/g, '?');
  const cf = getCloudflareClient();
  const resp = await (cf as any).d1.database.query(dbId, { account_id: accountId!, sql: normalizedSql, params }, {});
  const first = Array.isArray((resp as any).result) ? (resp as any).result[0] : (resp as any).result;
  const rows = first?.results;
  return { results: Array.isArray(rows) ? (rows as T[]) : [] };
}

export async function listPosts(opts: ListPostsOptions = {}): Promise<Post[]> {
  const limit = Math.min(opts.limit ?? 20, 100);
  if (opts.before) {
    const { results } = await d1Query<Post>(`SELECT * FROM posts WHERE date < $1 ORDER BY date DESC LIMIT $2`, [opts.before, limit]);
    return results.map(deserializePost);
  }
  const { results } = await d1Query<any>(`SELECT * FROM posts ORDER BY date DESC LIMIT $1`, [limit]);
  const arr = Array.isArray(results) ? results : [];
  return arr.map(deserializePost);
}

export async function getPost(id: string): Promise<Post | null> {
  const { results } = await d1Query<Post>(`SELECT * FROM posts WHERE id = $1`, [id]);
  const row = results[0];
  return row ? deserializePost(row) : null;
}

export interface CreatePostInput { id?: string; description?: string; photos: PhotoAsset[]; videos?: string[]; author?: string; date?: string; }

export async function createPost(input: CreatePostInput): Promise<Post> {
  const id = input.id || crypto.randomUUID();
  const date = input.date || new Date().toISOString();
  await d1Query(`INSERT INTO posts (id, date, author, description, photos, videos) VALUES ($1,$2,$3,$4,$5,$6)`, [
    id,
    date,
    input.author || null,
    input.description || null,
    JSON.stringify(input.photos || []),
    input.videos ? JSON.stringify(input.videos) : null
  ]);
  return { id, date, author: input.author, description: input.description, photos: input.photos, videos: input.videos };
}

export interface UpdatePostInput { description?: string; photos?: PhotoAsset[]; videos?: string[]; }

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post | null> {
  const existing = await getPost(id);
  if (!existing) return null;
  const next: Post = {
    ...existing,
    description: input.description ?? existing.description,
    photos: input.photos ?? existing.photos,
    videos: input.videos ?? existing.videos,
  };
  await d1Query(`UPDATE posts SET description = $1, photos = $2, videos = $3 WHERE id = $4`, [
    next.description || null,
    JSON.stringify(next.photos),
    next.videos ? JSON.stringify(next.videos) : null,
    id
  ]);
  return next;
}

export async function deletePost(id: string): Promise<boolean> {
  await d1Query(`DELETE FROM posts WHERE id = $1`, [id]);
  return true;
}

function deserializePost(row: any): Post {
  return {
    id: row.id,
    date: row.date,
    author: row.author || undefined,
    description: row.description || undefined,
    photos: ((): PhotoAsset[] => {
      const parsed = safeParseArray(row.photos) as any[] | undefined;
      if (!parsed) return [];
      if (parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && 'url' in first) {
          return parsed as PhotoAsset[];
        }
      }
      return (parsed as string[]).map(url => ({ url, width: 800, height: 600 }));
    })(),
    videos: safeParseArray(row.videos)
  };
}

function safeParseArray(val: any): any[] | undefined {
  if (val == null) return undefined;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return undefined;
  }
}
