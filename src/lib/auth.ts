import 'server-only';

export type { SessionPayload } from './core/auth-core';
export {
  authorFromUsername,
  authenticateCredentials,
  buildSessionClearCookie,
  buildSessionCookie,
  createSessionToken,
  getConfiguredCredentials,
  getSessionCookieName,
  getSessionFromRequest,
  parseCookies,
  SESSION_DEFAULT_TTL_SECONDS,
  shouldRefreshSession,
  verifySessionToken,
} from './core/auth-core';
