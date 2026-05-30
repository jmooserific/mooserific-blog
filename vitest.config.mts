import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Scope coverage to logic + API route handlers (per agreed test scope).
      // React components and server-rendered pages are intentionally excluded.
      include: ['src/lib/**/*.ts', 'src/utils/**/*.ts', 'src/app/api/**/route.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/lib/types.ts', // type-only declarations, no executable code
      ],
      // Per-file gate: any single in-scope file dropping below the bar fails CI,
      // so newly added uncovered code is flagged on the PR.
      thresholds: {
        perFile: true,
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      // The `server-only` guard throws outside an RSC bundle; stub it under test.
      'server-only': r('./test/stubs/server-only.ts'),
      '@/components': r('./src/components'),
      '@/lib': r('./src/lib'),
      '@/utils': r('./src/utils'),
      '@': r('./src'),
    },
  },
});
