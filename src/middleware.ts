import { NextRequest, NextResponse } from 'next/server';
import {
  authorFromUsername,
  buildSessionCookie,
  getSessionCookieName,
  parseCookies,
  shouldRefreshSession,
  verifySessionToken,
  createSessionToken,
  SESSION_DEFAULT_TTL_SECONDS,
} from '@/lib/auth';

// Determine if a route must enforce Basic Auth (challenge when missing/invalid)
function needsAuth(pathname: string, method: string) {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/posts') && method !== 'GET') return true;
  if (pathname.startsWith('/api/media')) return true;
  return false;
}

function isHtmlRequest(req: NextRequest) {
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
}

function buildLoginRedirect(req: NextRequest) {
  const loginUrl = new URL('/login', req.url);
  const target = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', target);
  return loginUrl;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[getSessionCookieName()];
  const enforce = needsAuth(pathname, req.method);
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;
  if (enforce && !session) {
    if (isHtmlRequest(req)) {
      return NextResponse.redirect(buildLoginRedirect(req), { status: 303 });
    }
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestHeaders = new Headers(req.headers);
  if (session) {
    requestHeaders.set('x-auth-user', authorFromUsername(session.user));
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (session && shouldRefreshSession(session)) {
    const refreshedToken = await createSessionToken(session.user, SESSION_DEFAULT_TTL_SECONDS);
    res.headers.append('Set-Cookie', buildSessionCookie(refreshedToken));
  }
  return res;
}

export const config = {
  // Run middleware for these paths. Auth will only be enforced based on needsAuth.
  matcher: ['/admin/:path*', '/api/posts/:path*', '/api/media', '/api/media/:path*', '/api/auth/:path*']
};
