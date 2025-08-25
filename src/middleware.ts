import { NextRequest, NextResponse } from 'next/server';

// Determine if a route must enforce Basic Auth (challenge when missing/invalid)
function needsAuth(pathname: string, method: string) {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/posts') && method !== 'GET') return true;
  if (pathname.startsWith('/api/media')) return true;
  // Only protect the explicit login endpoint under /api/auth to avoid prompting on status checks
  if (pathname.startsWith('/api/auth/login')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) {
    return new NextResponse('Auth not configured', { status: 500 });
  }

  // Parse Authorization header if present, and set x-auth-user when valid.
  const authHeader = req.headers.get('authorization');
  let authUser: string | null = null;
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const creds = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
      const [user, pass] = creds.split(':');
      if (user === expectedUser && pass === expectedPass) {
        authUser = user.split('@')[0];
      }
    } catch {
      // ignore parse errors; treated as unauthenticated
    }
  }

  const enforce = needsAuth(pathname, req.method);
  if (enforce && !authUser) {
    return unauthorized();
  }

  const res = NextResponse.next();
  if (authUser) res.headers.set('x-auth-user', authUser);
  return res;
}

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mooserific"' }
  });
}

export const config = {
  // Run middleware for these paths. Auth will only be enforced based on needsAuth.
  matcher: ['/admin/:path*', '/api/posts/:path*', '/api/media', '/api/media/:path*', '/api/auth/:path*']
};
