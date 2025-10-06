# Copilot Instructions for Mooserific Blog (Vercel + Cloudflare R2/D1)

Mooserific-blog is a simple photo/video blogging platform. It prioritizes easy posting and a clean, simple appearance.

These instructions describe the NEW architecture. All legacy filesystem post folder or container-specific assumptions are deprecated.

## Big Picture Architecture
- Deployment target: **Vercel** (Next.js App Router + Edge-friendly where useful).
- **Post metadata** persists in **Cloudflare D1** (SQLite-compatible) instead of JSON files.
- **Media (photos/videos)** stored in **Cloudflare R2** using the S3-compatible API. Stored URLs (public or signed) are referenced in D1.
- **Homepage (`/`)** lists posts in descending date order (query D1). Filtering by date continues via query params (future enhancement: add indexed date range queries). Public.
- **Admin UI (`/admin`)**: Protected by an application-level login flow. After sign-in, users can drag‑and‑drop upload (images + optional videos), add markdown descriptions, then create D1 records and upload media to R2.

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
D1_DATABASE_ID=            # Cloudflare D1 database ID (required)
CF_API_TOKEN=              # Cloudflare API token with D1 access (and R2 if needed)
## One of the following must be set for D1 API calls (prefer D1_ACCOUNT_ID):
# D1_ACCOUNT_ID=
# OR reuse R2_ACCOUNT_ID above
ENVIRONMENT=development    # or production
ADMIN_USERNAME=
ADMIN_PASSWORD=
SESSION_SECRET=            # used to sign/verify session cookies
```
Vercel: define the above (no secrets in repo). Local dev: `.env.local` + `wrangler.toml` for D1/R2 as needed. D1 is required in dev; no local SQLite fallback exists.

## Libraries / Helpers
- `lib/db.ts`: D1 access (minimal wrapper: getPost, listPosts, createPost, updatePost, deletePost). Use Cloudflare D1 raw API over HTTPS with positional params ($1, $2...) normalized to `?`.
- `lib/r2.ts`: R2 client creation + `putObject`, `getSignedUrl` (optional), and helper to build object keys with dev prefix logic.
- `lib/auth.ts` (planned): session + credential helpers (hash verification, cookie signing, timing-safe compare) used by login/logout endpoints and middleware.
- Avoid large dependencies; prefer native `fetch` to R2 endpoint (S3-compatible) or `@aws-sdk/client-s3` (can tree-shake; if size concerns, implement direct `fetch` signed requests—initially fine to use AWS SDK v3 S3 Client configured for R2 endpoint: `https://<accountid>.r2.cloudflarestorage.com` & custom region like `auto`).

## CRUD Operations
Expose API routes under `src/app/api/posts`:
- `GET /api/posts` (list, newest first, optional `limit`, `before`, `after`, `date_filter` query params).
- `POST /api/posts` (create: expects description, media file metadata, returns created Post).
- `GET /api/posts/:id` (fetch one).
- `PUT /api/posts/:id` (update mutable fields: description, add/remove media).
- `DELETE /api/posts/:id` (remove post + (optional) cascade delete R2 objects).

All write APIs require a valid authenticated session established through the login flow.

## Media Upload Flow
1. Authenticated admin visits `/admin` (redirects to `/login` if their session cookie is missing or expired).
2. Drag‑and‑drop selects up to N files (config constant, e.g. 20).
3. For each file the client calls `POST /api/media/presign` to get a presigned PUT URL plus headers (content type enforced, file size checked).
4. The browser uploads directly to R2 via `PUT` using the presigned URL while tracking per-file progress.
5. When all uploads resolve, the client posts metadata to `POST /api/posts` with the resulting photo objects (url + dimensions) and video URLs.
6. The server responds with the new Post object (or the updated one when editing).

## Authentication (Session-based login)
- A dedicated `/login` page presents a username/password form sourced from environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- Successful login issues an `HttpOnly`, `Secure` session cookie (use `SameSite=Lax` or `Strict`) that encodes the authenticated user; failures return a generic error without disclosing which field is wrong.
- Middleware (or API route handlers) verifies the session cookie for protected routes (`/admin`, write APIs, media presign endpoints) and attaches `x-auth-user` to downstream requests when valid.
- Session cookies should be signed (and optionally encrypted) with `SESSION_SECRET`, and include a short expiration (e.g. 12 hours) plus rolling renewal on active use.
- `/logout` clears the session cookie.

## Developer Workflows
- Install deps: `npm install`.
- Local dev: `npm run dev` (Next.js). Apply migrations via `wrangler d1 migrations apply <DB_NAME>` after configuring `wrangler.toml`.
- Migrations directory: `migrations/` (numbered). Add new SQL migration files when schema changes.
- Deployment is Vercel-native (no containers required).

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
- Components: drag-and-drop zone, markdown caption textarea, and a media list rendered with progress bars.
- File list supports drag-to-reorder (within media type) and shows upload status; thumbnails are still a TODO (see `TODO.md`).
- After creation/update, refresh the post list (currently via router refresh) instead of optimistic cache writes.

## Extensibility Guidelines
- To add fields: update D1 schema (new migration), extend `Post` interface, adjust API validation, update admin form.
- Keep R2 object key generation centralized (`lib/r2.ts`).

## Example: Creating a Post (New Flow)
1. User signs in via the `/login` form -> middleware/route handler sets the session cookie and injects `x-auth-user` for subsequent requests.
2. User drags 5 images + 1 video into admin UI.
3. Client sends FormData to `POST /api/media` (or inlined inside post create) -> server uploads each file to R2 under `dev/` prefix if `ENVIRONMENT=development`.
4. Collect resulting R2 object URLs.
5. Client calls `POST /api/posts` with `{ description, photos: [...], videos: [...] }`.
6. Server inserts row in D1 with generated UUID + `author` from header + ISO `date` (`new Date().toISOString()`).
7. Response returns full Post; UI updates.

## Key Directories (Updated)
- `src/app/` — Pages, API routes (`api/posts`, `api/media`), admin UI.
- `src/app/login/` — Login form page and any server actions related to session creation.
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
- Compare credentials using a timing-safe equals helper. Store `ADMIN_PASSWORD` hashed (bcrypt or scrypt) if operationally feasible; otherwise document the trade-offs and restrict access to env vars.

## Performance Considerations
- Use server components for data fetch to minimize client JS.
- Defer loading of lightbox libraries until interaction (dynamic import) if bundle size becomes an issue.

## Testing / Quality
- Add lightweight tests for `lib/db.ts` (mock D1 binding) and `lib/r2.ts` key generation logic.
- Validate API handlers with basic integration tests (happy path + auth failure).
- Cover the login flow with unit/integration tests (successful sign-in, invalid credentials, expired session refresh).

## Safety checks for contributors
- Treat `src/lib/db.ts` as server-only and avoid importing from client components.
- Always use parameterized queries with positional params and a separate params array.
- Never expose `CF_API_TOKEN`, `D1_*`, or `R2_*` secrets to the client.

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
For questions about conventions or unclear patterns, review `README.md`. Ask for clarification if there is any uncertainty.
