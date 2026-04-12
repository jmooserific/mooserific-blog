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
- ~~Validation: stronger request validation (schema-based) on API routes.~~ Done — Zod schemas in use.

## Media & Storage
- Image optimization: consider proxying through a lightweight image CDN/proxy; optionally signed URLs.
- ~~Thumbnails: generate and store smaller thumbnails/previews for faster grids.~~ Done — Sharp generates 5 WebP variants (320–2048px).

## Security & Auth
- Sanitize markdown at render time; consider an allowlist sanitizer (e.g., rehype-sanitize).
- ~~Enforce MIME types and file size limits on uploads.~~ Done — validated in upload route handler.
- ~~Explore using Vercel edge middleware for authentication.~~ Done — Basic Auth enforced in `middleware.ts`.
- ~~Strip geotagging data from uploaded images.~~ Done — Sharp strips EXIF when re-encoding to WebP.

## UX & Admin
- ~~Admin: show upload progress, thumbnails, and per-file status.~~ Done — per-file progress and previews in admin UI.

## DX & Quality
- Tests: unit tests for `lib/db.ts` (mock Cloudflare client) and `lib/r2.ts` (key generation URL logic).
- Integration tests: create → list → fetch → update → delete.
- ~~ESLint/Rules: enforce server-only imports for `lib/db.ts` and `lib/r2.ts`.~~ Already in place.
- ~~Centralize env var validation and helpful error messages on boot.~~ Done.
- ~~Code style: convert default exports to named exports in component files (`PostCard`, `PostListClient`, `FilterButton`, `DateTimePopover`, `ActiveFilterBadge`, `DateFilterPopover`).~~ Done.
- ~~Code style: replace `let` with `const` where variables are never reassigned (scattered across route handlers, db-core, admin page, login page).~~ Already clean — all `let` usages are reassigned.

## Observability
- Add minimal request/DB error logging (server-side only), with redaction of secrets.
- Optionally integrate a lightweight error tracker.

---
Add dates/owners next to items when you start them. Keep this list tidy—move completed items to a CHANGELOG.
