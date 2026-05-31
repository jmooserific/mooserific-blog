import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/db";
import { getSessionCookieName, getSessionFromToken } from "@/lib/auth";
import type { Post as UiPost } from "@/components/PostCard";
import type { Post } from "@/lib/types";
import { SinglePostView } from "./SinglePostView";

// Posts are fetched from D1 per request.
export const dynamic = "force-dynamic";

interface PostPermalinkPageProps {
  params: Promise<{ slug: string }>;
}

const MAX_TITLE = 70;

/** A short, plain-text title derived from the (Markdown) caption, falling back to the date. */
function deriveTitle(post: Post): string {
  const firstLine = (post.description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) {
    // Strip the most common Markdown markers so the title reads as plain text.
    const plain = firstLine
      .replace(/^#{1,6}\s+/, "")
      .replace(/[*_`>#~]/g, "")
      .trim();
    if (plain) {
      return plain.length > MAX_TITLE ? `${plain.slice(0, MAX_TITLE - 1).trimEnd()}…` : plain;
    }
  }
  return formatDate(post.date);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function toUiPost(post: Post): UiPost {
  return {
    id: post.id,
    slug: post.slug,
    date: post.date,
    author: post.author || "",
    caption: post.description || "",
    photos: post.photos.map((p) => ({ filename: p.url, width: p.width, height: p.height })),
    videos: post.videos,
  };
}

export async function generateMetadata({ params }: PostPermalinkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) return { title: "Post not found" };

  const title = deriveTitle(post);
  const description = post.description?.trim()
    ? post.description.replace(/\s+/g, " ").trim().slice(0, 200)
    : `A moment from ${formatDate(post.date)}.`;
  // R2 images are stored as a base URL; request a reasonably sized variant for sharing.
  const ogImage = post.photos[0] ? `${post.photos[0].url}-1024w.webp` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/p/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/p/${post.slug}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PostPermalinkPage({ params }: PostPermalinkPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) notFound();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  const session = await getSessionFromToken(sessionToken);
  const isAdmin = session !== null;

  return <SinglePostView post={toUiPost(post)} isAdmin={isAdmin} />;
}
