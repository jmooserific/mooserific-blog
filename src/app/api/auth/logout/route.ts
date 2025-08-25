import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
	// Clear any cookies we might have set for auth; currently Basic Auth is middleware-based.
	const res = new Response(null, { status: 204 });
	// No cookies to clear, but placeholder for future.
	return res;
}
