import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateCredentials,
  createSessionToken,
  getConfiguredCredentials,
  authorFromUsername,
  getSessionCookieName,
  SESSION_DEFAULT_TTL_SECONDS,
} from '@/lib/auth';

type LoginInput = {
  username?: string | null;
  password?: string | null;
  redirect?: string | null;
};

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
  if (target && target.startsWith('/')) {
    return new URL(target, req.url);
  }
  return new URL('/admin', req.url);
}

export async function POST(req: NextRequest) {
  const { username, password, redirect } = await parseLoginInput(req);

  if (!username || !password) {
    if (isHtmlRequest(req)) {
      const redirectUrl = new URL(`/login?error=missing${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`, req.url);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const isValid = await authenticateCredentials(username, password);
  if (!isValid) {
    if (isHtmlRequest(req)) {
      const redirectUrl = new URL(`/login?error=invalid${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`, req.url);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const { username: configuredUsername } = getConfiguredCredentials();
  const token = await createSessionToken(configuredUsername);
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
  res.headers.set('x-auth-user', authorFromUsername(configuredUsername));
  return res;
}
