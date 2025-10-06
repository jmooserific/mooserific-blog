import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, authorFromUsername } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({ authenticated: true, user: authorFromUsername(session.user) }, { status: 200 });
}
