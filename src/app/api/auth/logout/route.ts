import { NextRequest, NextResponse } from 'next/server';
import { buildSessionClearCookie } from '@/lib/auth';

function getRedirect(req: NextRequest): URL {
	const { searchParams } = new URL(req.url);
	const target = searchParams.get('redirect');
	if (target && target.startsWith('/')) {
		return new URL(target, req.url);
	}
	return new URL('/login', req.url);
}

export async function GET(req: NextRequest) {
	const res = NextResponse.redirect(getRedirect(req), { status: 303 });
	res.headers.append('Set-Cookie', buildSessionClearCookie());
	res.headers.set('Cache-Control', 'no-store');
	return res;
}

export async function POST(req: NextRequest) {
	const res = NextResponse.redirect(getRedirect(req), { status: 303 });
	res.headers.append('Set-Cookie', buildSessionClearCookie());
	res.headers.set('Cache-Control', 'no-store');
	return res;
}
