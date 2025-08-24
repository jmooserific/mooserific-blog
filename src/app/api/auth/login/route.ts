import { NextRequest } from 'next/server';

// Calling this endpoint with proper Basic credentials will succeed and set x-auth-user via middleware
export async function GET(req: NextRequest) {
  const user = req.headers.get('x-auth-user');
  const { searchParams } = new URL(req.url);
  const redirect = searchParams.get('redirect') || '/';
  if (!user) return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Mooserific"' } });
  return Response.redirect(new URL(redirect, req.url));
}
