import { getDateMetadata } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const meta = await getDateMetadata();
  return NextResponse.json(meta);
}
