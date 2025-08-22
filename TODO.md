# Mooserific Blog – TODO / Ideas

A running list of future improvements and nice-to-haves. This is developer-facing; keep the README user‑friendly.

## Platform & Deployment
- Consider migrating to Cloudflare Pages Functions (Workers) via `@cloudflare/next-on-pages`.
  - Use D1 binding (env.DB) instead of HTTP client calls.
  - Use R2 bucket binding for uploads instead of S3 client (Workers only).
  - Verify Basic Auth middleware is Edge-safe (no Node Buffer).
- Automate D1 migrations in CI or a deploy script.

## Data & API
- Pagination: add cursor-based pagination to `/api/posts` (limit + before/after).
- Date filters: add indexed date range queries for the homepage.
- Cascade delete: when deleting a post, optionally delete associated R2 objects.
- Validation: stronger request validation (schema-based) on API routes.

## Media & Storage
- Presigned/direct uploads to R2 for large files; avoid routing big uploads through the server.
- Image optimization: consider proxying through Next Image or a lightweight image CDN/proxy; optionally signed URLs.
- Thumbnails: generate and store smaller thumbnails/previews for faster grids.

## Security & Auth
- Sanitize markdown at render time; consider an allowlist sanitizer.
- Enforce MIME types and file size limits on uploads.
- Explore Cloudflare-based auth (e.g., Auth.js with D1 adapter) if moving to Workers.
 - Multiple administrators:
   - Short-term: support multiple Basic Auth users via env (e.g., `BASIC_AUTH_USERS=user1:pass1,user2:pass2`) and update middleware to accept any valid pair; keep `x-auth-user` header using username.
   - Long-term: migrate to Cloudflare Access or Auth.js with D1-backed users/roles; store salted+hashed passwords (Argon2/bcrypt), and support roles (admin, editor).

## UX & Admin
- Admin: show upload progress, thumbnails, and per-file status.
- Admin: edit existing posts (reorder/remove media, update description).
- Admin: keyboard shortcuts and drag-to-reorder media.

## DX & Quality
- Tests: unit tests for `lib/db.ts` (mock Cloudflare client) and `lib/r2.ts` (key generation URL logic).
- Integration tests: create → list → fetch → update → delete.
- ESLint/Rules: enforce server-only imports for `lib/db.ts` and `lib/r2.ts`.
- Centralize env var validation and helpful error messages on boot.

## Cleanup / Legacy
- Remove legacy filesystem post route at `src/app/posts/[slug]/[filename]/route.ts` once D1/R2 migration is complete.
- Delete any old `/posts` content from the repo after verifying migration.

## Observability
- Add minimal request/DB error logging (server-side only), with redaction of secrets.
- Optionally integrate a lightweight error tracker.

---
Add dates/owners next to items when you start them. Keep this list tidy—move completed items to a CHANGELOG.