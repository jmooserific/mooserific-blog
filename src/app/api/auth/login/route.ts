import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateCredentials,
  createSessionToken,
  authorFromUsername,
  getSessionCookieName,
  SESSION_DEFAULT_TTL_SECONDS,
} from '@/lib/auth';

// The login route depends on the Cloudflare SDK (D1 lookup) + Node Buffer, so it
// must run on the Node runtime rather than Edge.
export const runtime = 'nodejs';

type LoginInput = {
  username?: string | null;
  password?: string | null;
  redirect?: string | null;
};

// Validated at the boundary: credentials must be non-empty. `redirect` is handled
// separately by resolveRedirect (leading-slash guard), so it's not validated here.
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function isHtmlRequest(req: NextRequest): boolean {
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
}

async function parseLoginInput(req: NextRequest): Promise<LoginInput> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json();
    return {
      username: body?.username,
      password: body?.password,
      redirect: body?.redirect,
    };
  }

  const form = await req.formData();
  return {
    username: (form.get('username') as string | null) ?? null,
    password: (form.get('password') as string | null) ?? null,
    redirect: (form.get('redirect') as string | null) ?? null,
  };
}

function resolveRedirect(req: NextRequest, target?: string | null): URL {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return new URL(target, req.url);
  }
  return new URL('/admin', req.url);
}

export async function POST(req: NextRequest) {
  const raw = await parseLoginInput(req);
  const parsed = loginSchema.safeParse(raw);
  // Only honor a string redirect; resolveRedirect further restricts it to a
  // same-origin path. A non-string (e.g. malformed JSON body) is ignored.
  const redirect = typeof raw.redirect === 'string' ? raw.redirect : undefined;

  if (!parsed.success) {
    if (isHtmlRequest(req)) {
      const redirectUrl = new URL(`/login?error=missing${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`, req.url);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const authedUser = await authenticateCredentials(username, password);
  if (!authedUser) {
    if (isHtmlRequest(req)) {
      const redirectUrl = new URL(`/login?error=invalid${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`, req.url);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSessionToken(authedUser);
  const targetUrl = resolveRedirect(req, redirect);
  const res = NextResponse.redirect(targetUrl, { status: 303 });
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    maxAge: SESSION_DEFAULT_TTL_SECONDS,
    path: '/',
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
  });
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('x-auth-user', authorFromUsername(authedUser));
  return res;
}
