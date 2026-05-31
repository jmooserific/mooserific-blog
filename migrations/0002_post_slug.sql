-- Migration 0002: add per-post permalink slug
-- Each post gets a stable, shareable slug used as its canonical URL (/p/<slug>).
-- The default slug is derived from the post's date as YYYY-MM-DD-HHMM (UTC); it can
-- be overridden when creating or editing a post.
--
-- The column is nullable so this migration can run before the backfill script
-- (scripts/backfill-slugs.ts) populates existing rows. SQLite unique indexes treat
-- NULLs as distinct, so multiple not-yet-backfilled rows coexist without conflict.
ALTER TABLE posts ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
