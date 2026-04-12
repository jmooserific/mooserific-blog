import 'server-only';

// Required env vars — the app cannot function without these.
const REQUIRED = [
  'CF_API_TOKEN',
  'D1_DATABASE_ID',
  'R2_ACCOUNT_ID',
  'R2_BUCKET_NAME',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'SESSION_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
] as const;

type RequiredVar = (typeof REQUIRED)[number];

// Optional env vars — have sensible defaults or are only needed in certain environments.
interface OptionalEnv {
  /** Falls back to R2_ACCOUNT_ID when absent. */
  D1_ACCOUNT_ID: string;
  /** "development" enables the dev/ prefix for R2 keys. */
  ENVIRONMENT: string;
  /** Public base URL for R2 assets. Falls back to relative paths. */
  R2_PUBLIC_BASE_URL: string | undefined;
  /** Max upload size in bytes. Defaults to 500 MB. */
  MAX_FILE_BYTES: number;
}

type Env = Record<RequiredVar, string> & OptionalEnv;

function loadEnv(): Env {
  const missing: string[] = [];
  for (const name of REQUIRED) {
    if (!process.env[name]) missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nCheck your .env.local file or deployment config.`
    );
  }

  return {
    CF_API_TOKEN: process.env.CF_API_TOKEN!,
    D1_DATABASE_ID: process.env.D1_DATABASE_ID!,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME!,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
    D1_ACCOUNT_ID: process.env.D1_ACCOUNT_ID || process.env.R2_ACCOUNT_ID!,
    ENVIRONMENT: process.env.ENVIRONMENT ?? '',
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    MAX_FILE_BYTES: Number(process.env.MAX_FILE_BYTES || 500 * 1024 * 1024),
  };
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}
