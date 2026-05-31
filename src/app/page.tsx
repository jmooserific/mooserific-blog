import { cookies } from "next/headers";
import { FeedClient } from "@/components/FeedClient";
import { Post } from "@/components/PostCard";
import { listPostIndex, getPostsByIds, getDateMetadata } from '@/lib/db';
import { buildTimelineModel } from '@/utils/timeline';
import { toClientPost } from '@/utils/clientPost';
import { getSessionCookieName, getSessionFromToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Posts SSR'd into the initial HTML; the rest stream in as the reader scrolls.
const FIRST_BATCH = 12;

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  const session = await getSessionFromToken(sessionToken);
  const isAdmin = session !== null;

  // The lightweight index drives both the timeline and the virtual list; the
  // density model comes from whole-archive month counts.
  const [index, dateMeta] = await Promise.all([listPostIndex(), getDateMetadata()]);
  const timelineModel = buildTimelineModel(dateMeta.postCounts);

  const firstRows = await getPostsByIds(index.slice(0, FIRST_BATCH).map(e => e.id));
  // getPostsByIds returns rows in arbitrary order; re-sort to match the index.
  const order = new Map(index.map((e, i) => [e.id, i]));
  firstRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const firstBatch: Post[] = firstRows.map(toClientPost);

  return (
    <FeedClient
      index={index}
      firstBatch={firstBatch}
      isAdmin={isAdmin}
      timelineModel={timelineModel}
    />
  );
}
