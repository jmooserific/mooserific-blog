---
name: gen-test
description: Generate or update colocated Vitest tests for a TypeScript file or area of mooserific-blog. Use when asked to write tests, add test coverage, cover a function/module, or backfill missing tests. Follows the project's strict-TS, pure-function-first testing conventions and mocks the R2/D1/Cloudflare/sharp boundaries.
---

# gen-test

Generate high-value Vitest tests for this project. The goal is coverage of **logic and API route handlers** — not React rendering (see CLAUDE.md: "prefer small, pure, testable functions extracted from components over testing component rendering").

## When to use

- "write tests for `src/lib/foo.ts`"
- "this function needs a test"
- "backfill coverage for the auth module"
- after adding or changing a non-trivial pure function or route handler

## Test stack (already configured)

- **Runner:** Vitest (`npm test`, `npm run test:watch`, `npm run coverage`)
- **Config:** [vitest.config.mts](../../../vitest.config.mts) — Node environment, `@/*` → `src/*` alias, and a **`server-only` → no-op stub** so server modules import cleanly under test. (It's `.mts` because the project isn't `type: module`; a plain `.ts` config fails to load.)
- **Setup:** [test/setup.ts](../../../test/setup.ts) — populates the required env vars (`SESSION_SECRET`, `ADMIN_*`, `R2_*`, etc.) before any module loads, so `env()` resolves.
- **Coverage gate:** per-file thresholds enforced in CI ([.github/workflows/test.yml](../../../.github/workflows/test.yml)). New uncovered code fails the PR.

## Conventions for generated tests

1. **Colocate.** `src/lib/foo.ts` → `src/lib/foo.test.ts`. Name files `*.test.ts`.
2. **Strict TS.** No `any`. Use `unknown` + narrowing. Type mocks precisely.
3. **Import the real thing**, mock only the I/O boundary. The boundaries in this repo are:
   | Module under test | Mock |
   |---|---|
   | `db-core.ts` | `vi.mock('./cloudflare-core')` → fake `getCloudflareClient` returning a stub `d1.database.query` |
   | `image-processing.ts` | `vi.mock('sharp')` and `vi.mock('./r2')` (`putObject`, `getPublicUrl`) |
   | `r2-core.ts` (`putObject`/presign) | `vi.mock('@aws-sdk/client-s3')` + `vi.mock('@aws-sdk/s3-request-presigner')` |
   | `cloudflare-core.ts` | `vi.mock('cloudflare')` |
   | API route handlers | mock the `@/lib/*` module the handler calls; build a real `NextRequest`/`Request` |
4. **Pure logic needs no mocks.** `dateFilter.ts`, `image-loader.ts`, `auth-core` crypto round-trips, the `listPosts` date-range builder, `normalizePhoto`, etc. — test directly.
5. **Cover branches, not just the happy path.** For each function list: valid input, invalid/empty input, boundary values, and the error/early-return paths. Route handlers: assert both the status code *and* the body/headers (e.g. `Cache-Control: no-store`, `Set-Cookie`).
6. **`env()` caches per module.** To test the "missing required var throws" path, use `vi.resetModules()` and re-import inside the test after deleting the env var; restore it after.
7. **Crypto round-trips** (`createSessionToken`/`verifySessionToken`): test that a freshly minted token verifies, that a tampered payload or signature returns `null`, and that an expired token returns `null` (use `vi.useFakeTimers()` or a short negative TTL).

## Workflow

1. Read the target file and identify every exported function and its branches.
2. Identify which boundary (if any) it touches and apply the mock from the table above.
3. Write `*.test.ts` colocated with the source, grouped with `describe` per function.
4. Run `npm test -- <path>` to confirm green, then `npm run coverage -- <path>` to confirm the file clears the threshold. Add cases for any red lines.
5. Run `npx tsc --noEmit` (the project's PostToolUse hook also enforces this) — tests must type-check.

## Example skeleton

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudflare-core', () => ({
  getCloudflareClient: vi.fn(),
}));

import { getCloudflareClient } from './cloudflare-core';
import { listPosts } from './db-core';

function mockQuery(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ result: [{ results: rows }] });
  vi.mocked(getCloudflareClient).mockReturnValue({ d1: { database: { query } } } as never);
  return query;
}

describe('listPosts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('caps the limit at 100', async () => {
    const query = mockQuery([]);
    await listPosts({ limit: 9999 });
    const params = query.mock.calls[0][1].params;
    expect(params[params.length - 1]).toBe(100);
  });
});
```
