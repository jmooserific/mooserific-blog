// Vitest stub for the `server-only` package. The real module throws when imported
// outside a React Server Component bundle; under test we run server modules directly
// in Node, so we alias it to this no-op. See vitest.config.ts `resolve.alias`.
export {};
