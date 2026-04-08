# Mooserific Blog

<p align="center">
  <img src="https://raw.githubusercontent.com/jmooserific/mooserific-blog/refs/heads/main/public/Screenshot.png" alt="screenshot of Mooserific Blog" style="max-width: 800px;"/>
</p>

Private, family-oriented photo + video blog built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. Runs on **Vercel**, storing media in **Cloudflare R2** and post metadata in **Cloudflare D1**.

## ✨ Features

- Cloudflare D1 for post metadata (UUID, date, author, description, media URLs)
- Cloudflare R2 (S3-compatible) for photos & videos
- Server-side image processing with **Sharp** — uploaded photos are resized and converted to WebP at 5 sizes (320w, 480w, 768w, 1024w, 2048w) at upload time; Vercel's Image Optimization is not used
- Custom Next.js image loader serves the correct pre-generated variant for each display size; the 2048w variant is used in the lightbox for sharp rendering on retina displays
- Drag‑and‑drop Admin UI (up to 20 photos/videos per post)
- Responsive photo grids via `react-photo-album` with lightbox via `yet-another-react-lightbox`
- Inline `<video controls>` playback for uploaded MP4s
- Date-ordered feed with cursor-based pagination and date filtering

## 🌐 Browser Support

- Production builds target modern evergreen browsers that support ES modules (`defaults and supports es6-module`).
- Legacy browsers such as Internet Explorer and Opera Mini are not explicitly supported.
- If older browser support becomes necessary, adjust the `browserslist` field in `package.json` accordingly and verify the impact on bundle size and performance.

## 🧱 Data Model (D1 `posts`)

```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  author TEXT,
  description TEXT,
  photos TEXT,  -- JSON array of PhotoAsset objects
  videos TEXT   -- JSON array of R2 URLs (nullable)
);
CREATE INDEX idx_posts_date ON posts(date DESC);
```

TypeScript shape:

```ts
export interface PhotoAsset {
  url: string;    // base R2 URL (no extension) — append -{width}w.webp for actual files
  width: number;  // original pixel width
  height: number; // original pixel height
}

export interface Post {
  id: string;
  date: string;           // ISO timestamp
  author?: string;        // from admin username (portion before @)
  description?: string;   // markdown
  photos: PhotoAsset[];
  videos?: string[];      // R2 object URLs
}
```

## 🗄️ Media Storage (Cloudflare R2)

**Photos** are processed server-side with Sharp at upload time. Five WebP variants are stored per image:

```text
photos/<postUUID>/<uuid>-320w.webp
photos/<postUUID>/<uuid>-480w.webp
photos/<postUUID>/<uuid>-768w.webp
photos/<postUUID>/<uuid>-1024w.webp
photos/<postUUID>/<uuid>-2048w.webp
```

The `url` stored in D1 is the base (`photos/<postUUID>/<uuid>`) without a width suffix or extension. The custom image loader appends the appropriate suffix at render time.

**Videos** are uploaded directly to R2 via a presigned URL:

```text
videos/<postUUID>/<originalFileName>
```

Dev adds a `dev/` prefix to all keys; production omits it.

## 🔐 Authentication

A dedicated `/login` page accepts the admin username/password stored in environment variables. Successful sign-in sets a signed, HttpOnly session cookie (12-hour rolling window). Middleware validates the cookie for `/admin` and write APIs, forwarding the admin handle (portion before `@`) as the `author` value when posts are created/updated.

## 📦 Environment Variables

Provide these in `.env.local` (local) and Vercel Project Settings (production):

```env
R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=       # public base URL of your R2 bucket, e.g. https://pub-xxx.r2.dev
D1_DATABASE_ID=
CF_API_TOKEN=             # API token with D1 read/write access
## One of the following must be set for D1 API calls:
# D1_ACCOUNT_ID=
# OR reuse R2_ACCOUNT_ID above
ENVIRONMENT=development   # or production
ADMIN_USERNAME=
ADMIN_PASSWORD=
SESSION_SECRET=           # signing key for session cookies
MAX_FILE_BYTES=           # optional, default 524288000 (500 MB)
```

## 🚀 Getting Started (Local Dev)

1. Install deps:

   ```bash
   npm install
   ```

2. Copy env template:

   ```bash
   cp .env.example .env.local
   # fill in credentials
   ```

3. (First time) Create + apply D1 migration:

   ```bash
   npx wrangler d1 migrations apply <DB_NAME>
   ```

4. Start dev server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000/login` to sign in, then continue to `/admin`.

Media uploads in dev go to R2 under `dev/` prefix; production omits it.

## 🛫 Deployment (Vercel)

1. Push repo to GitHub.
2. Import project in Vercel dashboard.
3. Add the environment variables above to Production / Preview scopes.
4. Trigger deploy; migrations can be applied via CI step or manual Wrangler run.

## 🧪 API Routes

| Method | Route                      | Purpose                                        | Auth |
|--------|----------------------------|------------------------------------------------|------|
| GET    | `/api/posts`               | List posts (desc, optional limit/cursor)       | No   |
| POST   | `/api/posts`               | Create post                                    | Yes  |
| GET    | `/api/posts/:id`           | Fetch single post                              | No   |
| PUT    | `/api/posts/:id`           | Update description / media lists               | Yes  |
| DELETE | `/api/posts/:id`           | Delete post                                    | Yes  |
| POST   | `/api/media/upload-image`  | Upload image → Sharp processing → R2 variants  | Yes  |
| POST   | `/api/media/presign`       | Get presigned PUT URL for direct video upload  | Yes  |
| POST   | `/api/media`               | Upload media via FormData (legacy)             | Yes  |

## 🧮 Admin Flow

**Photos:**

1. User selects/drops image files in `/admin`
2. Each image is POSTed to `/api/media/upload-image`
3. Server processes with Sharp → uploads 5 WebP variants to R2
4. Server returns `{ baseUrl, width, height }`

**Videos:**

1. Client calls `/api/media/presign` to get a signed R2 PUT URL
2. Client PUTs the file directly to R2 (with progress tracking)

**Post submission:**

1. Client submits `POST /api/posts` (or `PUT /api/posts/:id`) with `{ description, photos, videos }`
2. `photos` is an array of `{ url: baseUrl, width, height }` objects
3. UI refreshes with the new/updated post

## 🗂️ Project Structure

```text
src/
  app/           – Pages & API routes (api/posts, api/media, admin, login)
  components/    – PostCard, DateTimePopover
  lib/
    image-loader.ts        – Custom Next.js image loader (maps base URL + width → variant)
    image-processing.ts    – Sharp processing + R2 upload utility
    r2.ts / core/r2-core.ts
    db.ts / core/db-core.ts
    types.ts
migrations/      – SQL migration files (numbered)
scripts/
  import-legacy.ts   – One-time import from legacy filesystem format
  migrate-images.ts  – Migrate existing R2 images to Sharp WebP variants
public/          – Static assets (favicon, screenshot)
```

## 📥 Scripts

### Legacy import (filesystem → D1/R2)

Import legacy Tumblr-style folders under `posts/` into D1 and upload their media to R2.

Folder format: `posts/YYYY-MM-DDTHH-MM/` containing `post.json` plus referenced media files.

```bash
# Dry-run (no uploads or DB writes):
npm run import:legacy -- --dry-run posts
# Real import:
npm run import:legacy posts
```

### Image migration (raw uploads → Sharp WebP variants)

For deployments that have existing raw-uploaded images in R2, this script generates the missing Sharp variants and updates the D1 records.

```bash
# Dry-run (no uploads or DB writes):
npm run migrate:images -- --dry-run
# Real migration:
npm run migrate:images
```

Run locally with prod `.env.local` credentials. Already-migrated photos are skipped automatically, so the script is safe to re-run.

## 📄 Sample Post (API JSON)

```json
{
  "id": "b52a5d3d-5e4b-4c5e-8e2e-6a3d1b7e9f10",
  "date": "2025-07-26T14:42:00.000Z",
  "author": "vemoose",
  "description": "Short paragraph of markdown **here**...",
  "photos": [
    {
      "url": "https://<r2-public-domain>/photos/b52a5d3d.../a1b2c3d4-e5f6-...",
      "width": 4032,
      "height": 3024
    }
  ],
  "videos": [
    "https://<r2-public-domain>/videos/b52a5d3d.../clip1.mp4"
  ]
}
```

## 🗺️ Routes (User-Facing)

- `/` – Homepage (newest posts, cursor-based pagination)
- `/admin` – Admin UI (requires session login)
- `/login` – Session-based sign-in form

## ⚖️ License

See `LICENSE`.
