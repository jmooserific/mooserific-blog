import 'server-only';

export type { SessionPayload } from './core/auth-core';
export {
  authorFromUsername,
  authenticateCredentials,
  buildSessionClearCookie,
  buildSessionCookie,
  createSessionToken,
  getSessionCookieName,
  getSessionFromRequest,
  getSessionFromToken,
  hashPassword,
  normalizeUsername,
  parseCookies,
  SESSION_DEFAULT_TTL_SECONDS,
  shouldRefreshSession,
  verifyPassword,
  verifySessionToken,
} from './core/auth-core';
