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

  // Build dynamic WHERE clauses for date filter and cursors
  const where: string[] = [];
  const params: any[] = [];

  if (opts.dateFilter) {
    // Accept YYYY or YYYY-MM or YYYY-MM-DD; build range [start, end)
    const df = opts.dateFilter;
    let start: string | undefined;
    let end: string | undefined;
    if (/^\d{4}$/.test(df)) {
      start = `${df}-01-01T00:00:00.000Z`;
      const year = Number(df);
      end = `${year + 1}-01-01T00:00:00.000Z`;
    } else if (/^\d{4}-\d{2}$/.test(df)) {
      const [y, m] = df.split('-').map(Number);
      start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)).toISOString();
      end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0)).toISOString();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(df)) {
      const [y, m, d] = df.split('-').map(Number);
      start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
      end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0)).toISOString();
    }
    if (start && end) {
      where.push(`date >= $${params.length + 1} AND date < $${params.length + 2}`);
      params.push(start, end);
    }
  }

  if (opts.before) {
    where.push(`date < $${params.length + 1}`);
    params.push(opts.before);
  }
  if (opts.after) {
    // For prev-page, fetch newer than cursor, but still order by date ASC then reverse to DESC stable?
    where.push(`date > $${params.length + 1}`);
    params.push(opts.after);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Order: if using after (prev), we'll query ASC then reverse to keep descending presentation consistent
  const orderDesc = !opts.after;
  const orderSql = `ORDER BY date ${orderDesc ? 'DESC' : 'ASC'}`;

  const { results } = await d1Query<any>(
    `SELECT * FROM posts ${whereSql} ${orderSql} LIMIT $${params.length + 1}`,
    [...params, limit]
  );
  let rows = Array.isArray(results) ? results : [];
  if (!orderDesc) {
    rows = rows.reverse();
  }
  return rows.map(deserializePost);
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

// Aggregations for metadata
export async function getDateMetadata(): Promise<{
  availableYears: number[];
  monthsWithPosts: { [year: number]: number[] };
  postCounts: { [key: string]: number };
}> {
  // Count by year
  const yearCounts = await d1Query<{ year: number; count: number }>(
    `SELECT CAST(substr(date, 1, 4) AS INTEGER) AS year, COUNT(*) as count FROM posts GROUP BY year ORDER BY year DESC`
  );
  // Count by year-month
  const ymCounts = await d1Query<{ ym: string; count: number }>(
    `SELECT substr(date, 1, 7) AS ym, COUNT(*) as count FROM posts GROUP BY ym`
  );

  const availableYears = yearCounts.results.map(r => r.year).filter((y) => !Number.isNaN(y));
  const monthsWithPosts: { [year: number]: number[] } = {};
  const postCounts: { [key: string]: number } = {};

  for (const yc of yearCounts.results) {
    if (yc.year) postCounts[String(yc.year)] = yc.count;
  }

  for (const ymc of ymCounts.results) {
    postCounts[ymc.ym] = ymc.count;
    const [yStr, mStr] = ymc.ym.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!monthsWithPosts[y]) monthsWithPosts[y] = [];
    if (!monthsWithPosts[y].includes(m)) monthsWithPosts[y].push(m);
  }

  // Sort months ascending for each year
  for (const y of Object.keys(monthsWithPosts)) {
    monthsWithPosts[Number(y)].sort((a, b) => a - b);
  }

  return { availableYears, monthsWithPosts, postCounts };
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
