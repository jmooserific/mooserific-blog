import type { Post, ListPostsOptions, PhotoAsset } from './types';
import { randomUUID } from 'crypto';

// D1 over Cloudflare API only. Local SQLite fallback has been removed.

async function d1Query<T = any>(sql: string, params: any[] = []): Promise<{ results: T[] }> {
  const dbId = process.env.D1_DATABASE_ID;
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.D1_ACCOUNT_ID || process.env.R2_ACCOUNT_ID; // reuse R2 account when possible

  const missing: string[] = [];
  if (!dbId) missing.push('D1_DATABASE_ID');
  if (!token) missing.push('CF_API_TOKEN');
  if (!accountId) missing.push('D1_ACCOUNT_ID (or R2_ACCOUNT_ID)');
  if (missing.length) {
    throw new Error(`Missing required env vars for D1: ${missing.join(', ')}`);
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/raw`;
  // Normalize positional placeholders ($1,$2,...) to '?' for D1 HTTP API consistency.
  const normalizedSql = sql.replace(/\$\d+/g, '?');
  const body = { sql: normalizedSql, params };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  // Normalize known response variants from D1 raw endpoint.
  let rowObjs: any[] = [];
  const r = data.result;
  const mapCols = (container: any) => {
    if (container?.columns && Array.isArray(container.rows)) {
      return mapColumnsRows(container.columns, container.rows);
    }
    return [];
  };
  if (Array.isArray(r)) {
    const first = r[0];
    if (first?.results && Array.isArray(first.results)) {
      rowObjs = first.results;
    } else if (first?.results?.columns && Array.isArray(first?.results?.rows)) {
      rowObjs = mapColumnsRows(first.results.columns, first.results.rows);
    } else if (first?.columns) {
      rowObjs = mapCols(first);
    }
  } else if (r) {
    if (Array.isArray(r.results)) {
      rowObjs = r.results;
    } else if (r?.results?.columns && Array.isArray(r?.results?.rows)) {
      rowObjs = mapColumnsRows(r.results.columns, r.results.rows);
    } else if (r.columns) {
      rowObjs = mapCols(r);
    }
  }
  if (!Array.isArray(rowObjs)) {
    rowObjs = [];
  }
  // Additional normalization if rows come back as arrays
  if (rowObjs.length && Array.isArray(rowObjs[0]) && !('id' in rowObjs[0])) {
    let cols: string[] | undefined;
    if (Array.isArray(r) && r[0]?.columns) cols = r[0].columns;
    else if (!Array.isArray(r) && r?.columns) cols = r.columns;
    cols = cols || ['id', 'date', 'author', 'description', 'photos', 'videos'];
    rowObjs = (rowObjs as any[]).map((vals: any[]) => {
      const obj: any = {};
      cols!.forEach((c, i) => {
        obj[c] = vals[i];
      });
      return obj;
    });
  }
  return { results: rowObjs as T[] };
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

export interface CreatePostInput { description?: string; photos: PhotoAsset[]; videos?: string[]; author?: string; date?: string; }

export async function createPost(input: CreatePostInput): Promise<Post> {
  const id = randomUUID();
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
    // If it's a single object or primitive, wrap it
    return [parsed];
  } catch {
    return undefined;
  }
}

function mapColumnsRows(columns: string[], rows: any[][]): any[] {
  return rows.map(r => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = r[idx]; });
    return obj;
  });
}
