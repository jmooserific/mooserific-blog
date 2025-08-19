# Mooserific Blog

<p align="center">
  <img src="https://raw.githubusercontent.com/jmooserific/mooserific-blog/refs/heads/main/public/Screenshot.png" alt="screenshot of Mooserific Blog" style="max-width: 800px;"/>
</p>

Private, family-oriented photo + video blog built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. Modernized to run on **Vercel**, storing media in **Cloudflare R2** and post metadata in **Cloudflare D1**.

## ✨ Features
- Fast Vercel deployment (Edge-friendly where possible)
- Cloudflare D1 as the sole source of truth for post metadata (UUID, date, author, description, media URLs)
- Cloudflare R2 (S3-compatible) for photos & videos (no local filesystem storage)
- Drag‑and‑drop Admin UI (Basic Auth protected) with Markdown description
- Responsive photo grids via `react-photo-album` (lightbox optional future)
- Inline `<video controls>` playback for uploaded MP4s
- Date-ordered feed with server-side filtering utilities (DB-derived metadata)

## 🧱 Data Model (D1 `posts`)
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  author TEXT,
  description TEXT,
  photos TEXT,  -- JSON array of R2 URLs
  videos TEXT   -- JSON array of R2 URLs (nullable)
);
CREATE INDEX idx_posts_date ON posts(date DESC);
```

TypeScript shape:
```ts
export interface Post {
  id: string;
  date: string;          // ISO timestamp
  author?: string;        // from Basic Auth username (before @)
  description?: string;   // markdown
  photos: string[];       // R2 object URLs
  videos?: string[];      // R2 object URLs
}
```

## 🗄️ Media Storage (Cloudflare R2)
- Object key pattern (prod): `photos/<postUUID>/<originalFileName>`
- Dev adds prefix: `dev/photos/<postUUID>/<originalFileName>`
- URLs stored directly in D1; currently served as-is (optionally move to signed or proxied URLs later).

## 🔐 Authentication
Basic HTTP Auth enforced via Vercel middleware (`/admin` + write API routes). Username (portion before `@` if email) is recorded as `author` when posts are created/updated.

## 📦 Environment Variables
Provide these in `.env.local` (local) and Vercel Project Settings (production). Example `.env.example`:
```env
R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
D1_DATABASE_ID=           # if using direct binding ID
ENVIRONMENT=development   # or production
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
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
   # or: wrangler d1 execute <DB_NAME> --local --file=./migrations/0001_posts.sql
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000/admin` (browser will prompt for Basic Auth).

Media uploads in dev go to R2 under `dev/` prefix; production omits it.

## 🛫 Deployment (Vercel)
1. Push repo to GitHub.
2. Import project in Vercel dashboard.
3. Add the environment variables above to Production / Preview scopes.
4. (Optional) Add Cloudflare account-specific IP allow rules if bucket is private.
5. Trigger deploy; migrations can be applied via CI step or manual Wrangler run (future automation TBD).

## 🧪 API Routes
| Method | Route             | Purpose                                | Auth |
|--------|-------------------|-----------------------------------------|------|
| GET    | `/api/posts`      | List posts (desc, optional limit/cursor)| No   |
| POST   | `/api/posts`      | Create post (description + media URLs)  | Yes  |
| GET    | `/api/posts/:id`  | Fetch single post                       | No   |
| PUT    | `/api/posts/:id`  | Update description / media lists        | Yes  |
| DELETE | `/api/posts/:id`  | Delete post (optional media cascade)    | Yes  |
| POST   | `/api/media`      | Upload media (FormData) -> R2           | Yes  |

## 🧮 Admin Flow
1. User authenticates (Basic Auth middleware)
2. Drag‑and‑drop selects images/videos
3. Client sends FormData to `/api/media` (server streams to R2)
4. Receive array of R2 URLs
5. Submit `POST /api/posts` with `{ description, photos, videos }`
6. UI refreshes with new post

## 🗂️ Project Structure
- `src/app/` – Pages & API routes (`api/posts`, `api/media`, `admin`)
- `lib/` – `db.ts` (D1 helpers), `r2.ts` (R2 helpers)
- `migrations/` – SQL migration files (numbered)
- `public/` – Static assets (favicon, screenshot)
- `.github/` – CI / instructions

## 🧪 Testing & Quality Notes
- Unit: key generation (R2), DB helpers, API auth guard
- Integration: create → list → fetch → update → delete cycle
- Security: sanitize markdown, enforce MIME & size limits

## 📄 Sample Post (API JSON)
```json
{
  "id": "b52a5d3d-5e4b-4c5e-8e2e-6a3d1b7e9f10",
  "date": "2025-07-26T14:42:00.000Z",
  "author": "vemoose",
  "description": "Short paragraph of markdown **here**...",
  "photos": [
    "https://<r2-public-domain>/photos/b52a5d3d-5e4b-4c5e-8e2e-6a3d1b7e9f10/IMG_0001.jpg",
    "https://<r2-public-domain>/photos/b52a5d3d-5e4b-4c5e-8e2e-6a3d1b7e9f10/IMG_0002.jpg"
  ],
  "videos": [
    "https://<r2-public-domain>/photos/b52a5d3d-5e4b-4c5e-8e2e-6a3d1b7e9f10/clip1.mp4"
  ]
}
```

## 🗺️ Routes (User-Facing)
- `/` – Homepage (lists newest posts; future pagination/cursor)
- `/admin` – Admin UI (Basic Auth)
- (Optional) `/post/[id]` – Individual post view (if implemented)

## ⚖️ License
See `LICENSE`.

