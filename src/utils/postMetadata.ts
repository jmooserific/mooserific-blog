// DB-backed metadata for filtering UI
import 'server-only';
import type { Post } from '@/lib/types';
import { getDateMetadata } from '@/lib/db';

export interface PostMetadata {
  availableYears: number[];
  monthsWithPosts: { [year: number]: number[] };
  postCounts: { [yearMonth: string]: number };
}

export async function getPostMetadata(): Promise<PostMetadata> {
  const meta = await getDateMetadata();
  return meta;
}
