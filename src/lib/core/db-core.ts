import type { Post, ListPostsOptions, PhotoAsset } from '../types';
import { getCloudflareClient } from './cloudflare-core';
import { env } from '../env';
import { slugFromDate, nextAvailableSlug } from '../../utils/slug';

/** Thrown when a caller-supplied custom slug is already taken by another post. */
export class SlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`Slug already in use: ${slug}`);
    this.name = 'SlugConflictError';
  }
}

type SqlParam = string | number | boolean | null;

interface D1QueryResponse {
  result: Array<{ results: unknown[] }> | { results: unknown[] };
}

interface D1Api {
  d1: {
    database: {
      query(
        dbId: string,
        body: { account_id: string; sql: string; params: SqlParam[] },
        opts: object
      ): Promise<D1QueryResponse>;
    };
  };
}

interface PostRow {
  id: string;
  slug: string | null;
  date: string;
  author: string | null;
  description: string | null;
  photos: string;
  videos: string | null;
}

async function d1Query<T>(sql: string, params: SqlParam[] = []): Promise<{ results: T[] }> {
  const { D1_DATABASE_ID: dbId, D1_ACCOUNT_ID: accountId } = env();

  const normalizedSql = sql.replace(/\$\d+/g, '?');
  const cf = getCloudflareClient() as unknown as D1Api;
  const resp = await cf.d1.database.query(dbId, { account_id: accountId!, sql: normalizedSql, params }, {});
  const first = Array.isArray(resp.result) ? resp.result[0] : resp.result;
  const rows = first?.results;
  return { results: Array.isArray(rows) ? (rows as T[]) : [] };
}

// --- Admin accounts ------------------------------------------------------------
// Backs multi-admin login (migration 0003). Usernames are stored normalized; the
// caller (auth-core / the CLI) is responsible for normalization before querying.
export interface AdminRow {
  username: string;
  password_hash: string;
  created_at: string;
}

export async function getAdminByUsername(username: string): Promise<AdminRow | null> {
  const { results } = await d1Query<AdminRow>(
    `SELECT username, password_hash, created_at FROM admins WHERE username = $1`,
    [username]
  );
  return results[0] ?? null;
}

export async function upsertAdmin(username: string, passwordHash: string): Promise<void> {
  await d1Query(
    `INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, $3)
     ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`,
    [username, passwordHash, new Date().toISOString()]
  );
}

export async function deleteAdmin(username: string): Promise<boolean> {
  await d1Query(`DELETE FROM admins WHERE username = $1`, [username]);
  return true;
}

export async function listAdmins(): Promise<AdminRow[]> {
  const { results } = await d1Query<AdminRow>(
    `SELECT username, password_hash, created_at FROM admins ORDER BY created_at ASC`
  );
  return results;
}

export async function listPosts(opts: ListPostsOptions = {}): Promise<Post[]> {
  const limit = Math.min(opts.limit ?? 20, 100);

  // Build dynamic WHERE clauses for date filter and cursors
  const where: string[] = [];
  const params: SqlParam[] = [];

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

  const { results } = await d1Query<PostRow>(
    `SELECT * FROM posts ${whereSql} ${orderSql} LIMIT $${params.length + 1}`,
    [...params, limit]
  );
  const rows = Array.isArray(results) ? results : [];
  if (!orderDesc) rows.reverse();
  return rows.map(deserializePost);
}

export interface PostIndexEntry {
  id: string;
  date: string;
  /** Lead photo dimensions + count, so the feed skeleton can reserve a matching
   *  box. Null dims for legacy rows without sizes and for video-only posts. */
  leadWidth: number | null;
  leadHeight: number | null;
  photoCount: number;
}

interface PostIndexRow {
  id: string;
  date: string;
  leadWidth: number | null;
  leadHeight: number | null;
  photoCount: number | null;
}

/**
 * Lightweight index of every post (newest first) for the continuous feed: it
 * drives both the timeline and the virtual list without loading photo bodies.
 * One small row each, so the whole archive is cheap to ship to the client.
 * Pulls just the lead photo's dimensions (not the whole photos blob) via JSON
 * functions so the virtual list can reserve per-row height without a body fetch.
 */
export async function listPostIndex(): Promise<PostIndexEntry[]> {
  const { results } = await d1Query<PostIndexRow>(
    `SELECT id, date,
            json_extract(photos, '$[0].width') AS leadWidth,
            json_extract(photos, '$[0].height') AS leadHeight,
            json_array_length(photos) AS photoCount
     FROM posts ORDER BY date DESC`
  );
  return results.map((row) => ({
    id: row.id,
    date: row.date,
    leadWidth: typeof row.leadWidth === 'number' ? row.leadWidth : null,
    leadHeight: typeof row.leadHeight === 'number' ? row.leadHeight : null,
    photoCount: row.photoCount ?? 0,
  }));
}

/**
 * Fetch a batch of full posts by explicit id. Placeholders are generated from
 * the id count (never interpolated) so this stays a parameterized query. Rows
 * come back in arbitrary order; callers re-sort by their index. Unlike cursor
 * windows, this is robust to duplicate/same-minute dates.
 */
export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const { results } = await d1Query<PostRow>(
    `SELECT * FROM posts WHERE id IN (${placeholders})`,
    ids
  );
  return results.map(deserializePost);
}

export async function getPost(id: string): Promise<Post | null> {
  const { results } = await d1Query<PostRow>(`SELECT * FROM posts WHERE id = $1`, [id]);
  const row = results[0];
  return row ? deserializePost(row) : null;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { results } = await d1Query<PostRow>(`SELECT * FROM posts WHERE slug = $1`, [slug]);
  const row = results[0];
  return row ? deserializePost(row) : null;
}

// Note: d1Query rewrites every `$N` to a positional `?`, so each placeholder must
// appear once and params must match left-to-right. We branch on `excludeId` rather
// than reuse a placeholder for an `IS NULL` guard.

/** Whether `slug` is already used by a post other than `excludeId`. */
async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const { results } = excludeId
    ? await d1Query<{ id: string }>(
        `SELECT id FROM posts WHERE slug = $1 AND id != $2 LIMIT 1`,
        [slug, excludeId]
      )
    : await d1Query<{ id: string }>(
        `SELECT id FROM posts WHERE slug = $1 LIMIT 1`,
        [slug]
      );
  return results.length > 0;
}

/**
 * Return a free slug derived from `base`, auto-suffixing (`base-2`, `base-3`, …)
 * when same-minute collisions exist. Used for the date-derived default on create.
 */
async function ensureUniqueSlug(base: string): Promise<string> {
  const { results } = await d1Query<{ slug: string }>(
    `SELECT slug FROM posts WHERE slug = $1 OR slug LIKE $2`,
    [base, `${base}-%`]
  );
  const taken = results.map(r => r.slug).filter((s): s is string => Boolean(s));
  return nextAvailableSlug(base, taken);
}

export interface CreatePostInput { id?: string; slug?: string; description?: string; photos: PhotoAsset[]; videos?: string[]; author?: string; date?: string; }

export async function createPost(input: CreatePostInput): Promise<Post> {
  const id = input.id || crypto.randomUUID();
  const date = input.date || new Date().toISOString();
  // A caller-supplied slug is treated as a deliberate choice and must be unique;
  // otherwise derive the default from the date and auto-suffix any collision.
  let slug: string;
  if (input.slug) {
    if (await slugTaken(input.slug)) throw new SlugConflictError(input.slug);
    slug = input.slug;
  } else {
    slug = await ensureUniqueSlug(slugFromDate(date));
  }
  await d1Query(`INSERT INTO posts (id, slug, date, author, description, photos, videos) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
    id,
    slug,
    date,
    input.author || null,
    input.description || null,
    JSON.stringify(input.photos || []),
    input.videos ? JSON.stringify(input.videos) : null
  ]);
  return { id, slug, date, author: input.author, description: input.description, photos: input.photos, videos: input.videos };
}

export interface UpdatePostInput { slug?: string; description?: string; photos?: PhotoAsset[]; videos?: string[]; date?: string; }

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post | null> {
  const existing = await getPost(id);
  if (!existing) return null;
  // Slugs are frozen on publish: only change it when a new one is explicitly passed.
  // A changed slug is a deliberate choice and must be unique.
  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    if (await slugTaken(input.slug, id)) throw new SlugConflictError(input.slug);
    slug = input.slug;
  }
  const next: Post = {
    ...existing,
    slug,
    description: input.description ?? existing.description,
    photos: input.photos ?? existing.photos,
    videos: input.videos ?? existing.videos,
    date: input.date ?? existing.date,
  };
  await d1Query(`UPDATE posts SET slug = $1, description = $2, photos = $3, videos = $4, date = $5 WHERE id = $6`, [
    next.slug,
    next.description || null,
    JSON.stringify(next.photos),
    next.videos ? JSON.stringify(next.videos) : null,
    next.date,
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

function deserializePost(row: PostRow): Post {
  return {
    id: row.id,
    // Fall back to the id for any row not yet backfilled, so it still has a usable key.
    slug: row.slug || row.id,
    date: row.date,
    author: row.author || undefined,
    description: row.description || undefined,
    photos: ((): PhotoAsset[] => {
      const parsed = safeParseArray(row.photos);
      if (!parsed) return [];
      if (parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && 'url' in first) {
          return parsed as PhotoAsset[];
        }
      }
      return (parsed as unknown as string[]).map(url => ({ url, width: 800, height: 600 }));
    })(),
    videos: safeParseArray(row.videos) as string[] | undefined
  };
}

function safeParseArray(val: string | null | undefined): unknown[] | undefined {
  if (val == null) return undefined;
  try {
    const parsed: unknown = typeof val === 'string' ? JSON.parse(val) : val;
    if (Array.isArray(parsed)) return parsed as unknown[];
    return [parsed];
  } catch {
    return undefined;
  }
}
