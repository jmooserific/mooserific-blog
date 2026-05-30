// Global test setup. Runs before any module is imported (vitest `setupFiles`),
// so that `env()` in src/lib/env.ts finds every required variable on first load.
// These are throwaway test values — never real secrets.

const TEST_ENV: Record<string, string> = {
  CF_API_TOKEN: 'test-cf-token',
  D1_DATABASE_ID: 'test-d1-database',
  D1_ACCOUNT_ID: 'test-d1-account',
  R2_ACCOUNT_ID: 'test-r2-account',
  R2_BUCKET_NAME: 'test-bucket',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_PUBLIC_BASE_URL: 'https://cdn.example.test',
  SESSION_SECRET: 'test-session-secret-please-do-not-use-in-prod',
  ADMIN_USERNAME: 'admin@example.test',
  ADMIN_PASSWORD: 'correct-horse-battery-staple',
  ENVIRONMENT: 'test',
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
