import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/admin', '/api/posts', '/api/media', '/api/auth'];

function needsAuth(pathname: string, method: string) {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/posts') && method !== 'GET') return true;
  if (pathname.startsWith('/api/media')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!needsAuth(pathname, req.method)) return NextResponse.next();

  const authHeader = req.headers.get('authorization');
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) {
    return new NextResponse('Auth not configured', { status: 500 });
  }
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorized();
  }
  const creds = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [user, pass] = creds.split(':');
  if (user !== expectedUser || pass !== expectedPass) {
    return unauthorized();
  }
  const res = NextResponse.next();
  res.headers.set('x-auth-user', user.split('@')[0]);
  return res;
}

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mooserific"' }
  });
}

export const config = {
  matcher: ['/admin/:path*', '/api/posts/:path*', '/api/media', '/api/media/:path*', '/api/auth/:path*']
};
