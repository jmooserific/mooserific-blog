import { NextRequest } from 'next/server';

// Simple endpoint to check if the middleware authenticated the request
export async function GET(req: NextRequest) {
  const user = req.headers.get('x-auth-user');
  if (!user) return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
  return Response.json({ authenticated: true, user });
}
