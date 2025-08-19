# Copilot Instructions for Mooserific Blog (Vercel + Cloudflare R2/D1)

Mooserific-blog is a simple photo/video blogging platform. It prioritizes easy posting and a clean, simple appearance.

These instructions describe the NEW architecture. Remove any reliance on local filesystem post folders or Docker runtime assumptions.

## Big Picture Architecture
- Deployment target: **Vercel** (Next.js App Router + Edge-friendly where useful).
- **Post metadata** persists in **Cloudflare D1** (SQLite-compatible) instead of JSON files.
- **Media (photos/videos)** stored in **Cloudflare R2** using the S3-compatible API. Stored URLs (public or signed) are referenced in D1.
- **Homepage (`/`)** lists posts in descending date order (query D1). Filtering by date continues via query params (future enhancement: add indexed date range queries).
- **Admin UI (`/admin`)**: Authenticated via Basic HTTP Auth (Vercel middleware). Provides drag‑and‑drop upload (images + optional videos), markdown description, then creates a D1 record and uploads media to R2.

## Data Model (D1 `posts` table)
Schema (migration 0001):
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,            -- UUID (string)
  date TEXT NOT NULL,             -- ISO timestamp (UTC)
  author TEXT,                    -- derived from auth username/email (portion before @)
  description TEXT,               -- markdown
  photos TEXT,                    -- JSON array of photo objects or URLs
  videos TEXT                     -- JSON array of video URLs (nullable)
);
CREATE INDEX idx_posts_date ON posts(date DESC);
```

TypeScript shape (internal):
```ts
export interface Post {
  id: string;
  date: string; // ISO string
  author?: string;
  description?: string;
  photos: string[]; // R2 object URLs
  videos?: string[]; // R2 object URLs
}
```

## R2 Object Key Strategy
- Production key prefix: none (e.g. `photos/<uuid>/<originalName>`).
- Local/dev prefix: `dev/` (e.g. `dev/photos/<uuid>/<originalName>`).
- Keep original filename for readability; prepend UUID folder to avoid collisions.

## Environment & Configuration
Add a `.env.example` including:
```
R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
D1_DATABASE_ID=            # optional if using binding via wrangler
ENVIRONMENT=development    # or production
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
```
Vercel: define the above (no secrets in repo). Local dev: `.env.local` + `wrangler.toml` for D1 binding & R2 credentials if needed.

## Libraries / Helpers
- `lib/db.ts`: D1 access (minimal wrapper: getPost, listPosts, createPost, updatePost, deletePost). Use `better-sqlite3` style parameterization via D1 `prepare` API or a lightweight helper.
- `lib/r2.ts`: R2 client creation + `putObject`, `getSignedUrl` (optional), and helper to build object keys with dev prefix logic.
- Avoid large dependencies; prefer native `fetch` to R2 endpoint (S3-compatible) or `@aws-sdk/client-s3` (can tree-shake; if size concerns, implement direct `fetch` signed requests—initially fine to use AWS SDK v3 S3 Client configured for R2 endpoint: `https://<accountid>.r2.cloudflarestorage.com` & custom region like `auto`).

## CRUD Operations
Expose API routes under `src/app/api/posts`:
- `GET /api/posts` (list, newest first, optional `limit`, `before` cursor).
- `POST /api/posts` (create: expects description, media file metadata, returns created Post).
- `GET /api/posts/:id` (fetch one).
- `PUT /api/posts/:id` (update mutable fields: description, add/remove media).
- `DELETE /api/posts/:id` (remove post + (optional) cascade delete R2 objects).

All writes validate Basic Auth.

## Media Upload Flow
1. User opens `/admin` (middleware enforces Basic Auth; sets `req.authUser`).
2. Drag‑and‑drop selects up to N files (config constant, e.g. 20).
3. Client requests a signed upload URL per file OR directly streams to an API route that uploads via server to R2.
4. After uploads complete, client posts metadata to `POST /api/posts` with arrays of resulting R2 URLs.
5. Response returns the new Post object.

Simplest initial approach: upload via server route (FormData) to avoid presigned complexity; revisit presigned for large files.

## Authentication (Basic Auth)
- Edge Middleware in `src/middleware.ts` checks `Authorization: Basic base64(user:pass)`.
- On success, add `x-auth-user` header to downstream request (username portion before `@` forms the `author`).
- On failure, return `401` with `WWW-Authenticate: Basic realm="Mooserific"`.

## Developer Workflows
- Install deps: `npm install`.
- Local dev: `npm run dev` (Next.js). Run `wrangler d1 execute <DB_NAME> --local --file=./migrations/0001_posts.sql` for first migration OR use `wrangler d1 migrations apply` once configured.
- Migrations directory: `migrations/` (numbered). Add new SQL migration files when schema changes.
- No Docker required. Remove any Docker-specific deployment assumptions.

## Migration Management (D1)
```
wrangler d1 migrations create <DB_NAME> create_posts
wrangler d1 migrations apply <DB_NAME>
```
Ensure migration file includes the table + index creation above.

## Frontend Rendering
- Home (`/`): Server component fetches `listPosts(limit=n)`; displays photo gallery via `react-photo-album` with R2 URLs.
- Post detail (if individual route used): fetch single post; render markdown description (sanitize) + photo album + `<video controls>` elements for videos.
- Optimize images later (initially direct R2 URL; potential future: Next Image + signed proxy).

## Admin UI
- Components: drag-and-drop zone, file list with thumbnail preview, markdown editor (textarea ok initially), submit button.
- After creation, optimistic add to list or redirect.
- Provide simple progress indicators for uploads.

## Extensibility Guidelines
- To add fields: update D1 schema (new migration), extend `Post` interface, adjust API validation, update admin form.
- Keep R2 object key generation centralized (`lib/r2.ts`).

## Example: Creating a Post (New Flow)
1. User authenticates via Basic Auth -> middleware injects `x-auth-user`.
2. User drags 5 images + 1 video into admin UI.
3. Client sends FormData to `POST /api/media` (or inlined inside post create) -> server uploads each file to R2 under `dev/` prefix if `ENVIRONMENT=development`.
4. Collect resulting R2 object URLs.
5. Client calls `POST /api/posts` with `{ description, photos: [...], videos: [...] }`.
6. Server inserts row in D1 with generated UUID + `author` from header + ISO `date` (`new Date().toISOString()`).
7. Response returns full Post; UI updates.

## Key Directories (Updated)
- `src/app/` — Pages, API routes (`api/posts`, `api/media`), admin UI.
- `lib/` — `db.ts`, `r2.ts`, other helpers.
- `migrations/` — D1 SQL migration files.
- `.github/` — Automation & these instructions.
- `public/` — Static assets (favicon, etc.).

Legacy `/posts/` directory is deprecated and should not be used for new content. (Eventually remove once migration script ports old content into D1/R2.)

## Migration of Existing Filesystem Posts (Outline)
(Future task) Script to:
1. Iterate existing `/posts/*/post.json`.
2. Upload media files to R2 preserving order.
3. Transform JSON fields into new D1 row.
4. Record mapping (old slug -> new UUID).

## Security & Validation
- Sanitize markdown (e.g. `sanitize-html`) before render.
- Validate MIME types for uploads (allow list: `image/*`, `video/mp4`, etc.).
- Enforce max file size (config constant) & total post media count.

## Performance Considerations
- Use server components for data fetch to minimize client JS.
- Defer loading of lightbox libraries until interaction (dynamic import) if bundle size becomes an issue.

## Testing / Quality
- Add lightweight tests for `lib/db.ts` (mock D1 binding) and `lib/r2.ts` key generation logic.
- Validate API handlers with basic integration tests (happy path + auth failure).

---
For questions about conventions or unclear patterns, review `README.md` or ask for clarification.

# Next.js + Tailwind + TypeScript Development Instructions

Instructions for generating high-quality Next.js applications with Tailwind CSS styling and TypeScript.

## Project Context
-   Latest Next.js (App Router preferred)
-   Use Next.js built-in components when appropriate (e.g., `Image`, `Link`, `Head`)
-   Be sure to consider the versions of Next.js and React in use
-   TypeScript for type safety and strong typing
-   Tailwind CSS for all styling

## Development Standards
### Architecture
-   Organize routes and components by feature or domain.

### TypeScript
-   Always define explicit interfaces or types for props, state, and API responses.
-   Use `async/await` for asynchronous operations and include robust error handling.

### Styling
-   Utilize Tailwind CSS classes for all styling.
-   Implement responsive design using Tailwind's utility classes (e.g., `md:`, `lg:`).

### Components
-   Create reusable and modular components.
-   Destructure props in component signatures.
-   Use React Fragments (`<>...</>`) to avoid unnecessary DOM elements.

### Performance
-   Minimize client-side rendering where server components can be used.
-   Implement lazy loading for non-critical components using `React.lazy` and `Suspense`.


---
For questions about conventions or unclear patterns, review `README.md` or ask for clarification.
