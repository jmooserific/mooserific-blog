# Mooserific Blog – TODO / Ideas

A running list of future improvements and nice-to-haves. This is developer-facing; keep the README user‑friendly.

## Platform & Deployment
- Consider migrating to Cloudflare Pages Functions (Workers) via `@cloudflare/next-on-pages`.
  - Use D1 binding (env.DB) instead of HTTP client calls.
  - Use R2 bucket binding for uploads instead of S3 client (Workers only).
  - Verify Basic Auth middleware is Edge-safe (no Node Buffer).
- Automate D1 migrations in CI or a deploy script.

## Data & API
- Cascade delete: when deleting a post, optionally delete associated R2 objects.
- Validation: stronger request validation (schema-based) on API routes.

## Media & Storage
- Image optimization: consider proxying through Next Image or a lightweight image CDN/proxy; optionally signed URLs.
- Thumbnails: generate and store smaller thumbnails/previews for faster grids. Use Vercel Image Optimization?

## Security & Auth
- Sanitize markdown at render time; consider an allowlist sanitizer.
- Enforce MIME types and file size limits on uploads.
- Explore using Vercel edge middleware for authentication.
- Strip geotagging data from uploaded images.

## UX & Admin
- Admin: show upload progress, thumbnails, and per-file status.

## DX & Quality
- Tests: unit tests for `lib/db.ts` (mock Cloudflare client) and `lib/r2.ts` (key generation URL logic).
- Integration tests: create → list → fetch → update → delete.
- ESLint/Rules: enforce server-only imports for `lib/db.ts` and `lib/r2.ts`.
- Centralize env var validation and helpful error messages on boot.

## Observability
- Add minimal request/DB error logging (server-side only), with redaction of secrets.
- Optionally integrate a lightweight error tracker.

---
Add dates/owners next to items when you start them. Keep this list tidy—move completed items to a CHANGELOG.