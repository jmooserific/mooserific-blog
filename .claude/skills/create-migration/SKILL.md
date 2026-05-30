---
name: create-migration
description: >-
  Scaffold a new D1 schema migration (and, when needed, a companion data-backfill
  script) for mooserific-blog, following the project's numbered-SQL and tsx-script
  conventions. Use when adding/altering a D1 table or column, or when a schema
  change needs existing rows backfilled.
disable-model-invocation: true
---

# create-migration

Scaffold a new Cloudflare **D1 schema migration** for mooserific-blog, and when
the change touches existing data, a matching **backfill script**. This skill
produces files and instructions — it does not apply migrations to the database.

## Step 1 — Understand the change

Confirm with the user (or infer from their request) exactly what's changing:
new table, new column, index, constraint, or a data transform. If it adds or
renames a `posts` column, remember the downstream work in Step 5.

## Step 2 — Pick the next migration number

Migrations live in [`migrations/`](../../../migrations/) named
`NNNN_short_snake_name.sql`, zero-padded, sequential (e.g. `0001_posts.sql`).
Find the highest existing number and add one:

```bash
ls migrations/ | grep -E '^[0-9]{4}_' | sort | tail -1
```

Name the file for the change, e.g. `0002_add_location_to_posts.sql`.

## Step 3 — Write the SQL migration

Follow the existing house style in [`migrations/0001_posts.sql`](../../../migrations/0001_posts.sql):

- Lead with a comment: `-- Migration NNNN: <what it does>`.
- **Idempotent DDL**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
  D1/SQLite supports `ALTER TABLE ... ADD COLUMN` but **not** `IF NOT EXISTS` on
  it, so for a re-runnable add-column, note in a comment that it runs once.
- Prefer **additive, non-destructive** changes. New columns should be nullable or
  carry a `DEFAULT` so existing rows stay valid. SQLite can't add a `NOT NULL`
  column without a default to a non-empty table.
- No `DROP`/destructive statement without an explicit comment explaining why and
  confirming with the user first — this DB holds the family's photo metadata.
- Keep JSON-bearing columns (`photos`, `videos`) as `TEXT`, matching the schema.

Example skeleton:

```sql
-- Migration 0002: add optional location to posts
ALTER TABLE posts ADD COLUMN location TEXT;            -- nullable; runs once
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location);
```

## Step 4 — Backfill script (only if existing rows need data)

If the schema change requires populating or transforming existing rows, scaffold
a script in [`scripts/`](../../../scripts/) named to match (e.g.
`scripts/backfill-location.ts`) and add an npm script entry to
[`package.json`](../../../package.json) like the existing
`backfill:cache-control` / `migrate:images` entries.

Match the established backfill conventions (see
[`scripts/backfill-cache-control.ts`](../../../scripts/backfill-cache-control.ts)):

- `#!/usr/bin/env tsx` shebang and a header comment block documenting purpose +
  `Usage:` examples.
- Load env from `.env.local` (falling back to default) via the standard `dotenv`
  preamble used in the other scripts.
- Reuse the core libs — `listPosts`/`updatePost` from `../src/lib/core/db-core`,
  R2 helpers from `../src/lib/core/r2-core` — never re-implement D1/R2 access.
- Support `--dry-run` (no writes), `--concurrency=N`, and `--verbose`.
- **Idempotent & resumable**: skip rows already in the target state so the script
  can be re-run safely.
- All D1 access stays parameterized (the core helpers handle this) — never
  interpolate values into SQL.

## Step 5 — Downstream changes for a `posts` column

Per the project README, adding a field is more than a migration. Remind the user
(and offer to do it) to also:

- Extend the `Post` interface / row type in `src/lib/types.ts` and
  `src/lib/core/db-core.ts` (`PostRow`, `createPost`, `updatePost` SQL + params).
- Add **Zod validation** for the new field at the API boundary in the relevant
  `src/app/api/**/route.ts`.
- Update the admin post form UI if the field is user-editable.
- Add/adjust colocated `*.test.ts` for any new non-trivial logic.

## Step 6 — Tell the user how to apply it

Do **not** apply the migration yourself. Present both paths:

- **wrangler** (canonical, per README): `npx wrangler d1 migrations apply <DB_NAME>`
  after `wrangler.toml` is configured.
- **cloudflare-bindings MCP**: the SQL can be executed against D1 via
  `d1_database_query` if the user prefers — but confirm the target database
  first, and never run destructive SQL without explicit confirmation.

End by summarizing: the new file(s), the chosen migration number, any
package.json script added, and the exact apply command.
