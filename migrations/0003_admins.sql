-- Migration 0003: admin accounts table (multi-admin support)
-- Replaces the single ADMIN_USERNAME/ADMIN_PASSWORD env-var login with a row per
-- admin. Usernames are stored normalized (trimmed + lowercased) so lookups match
-- the normalization in authenticateCredentials. Passwords are never stored in the
-- clear: password_hash holds a PBKDF2-HMAC-SHA256 string of the form
-- `pbkdf2$<iterations>$<saltB64url>$<hashB64url>` (see src/lib/core/auth-core.ts).
--
-- Seed the first admin from the existing env vars with: npm run admin -- seed
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
