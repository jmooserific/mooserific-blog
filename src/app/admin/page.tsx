"use client"

import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { usePostEditor } from "./usePostEditor";
import { DateChip } from "./DateChip";
import { CaptionField } from "./CaptionField";
import { MediaGrid } from "./MediaGrid";

function AdminPageInner() {
  const {
    caption, setCaption,
    isEditing, isSubmitting, loadingExisting,
    showAdvanced, setShowAdvanced,
    postDate, setPostDate,
    slug, setSlug, slugChanged,
    items, uploadProgress, dropDisabled,
    addFilesToItems, moveItem, removeItem, handleSubmit,
  } = usePostEditor();

  const canPost = items.length > 0 && !dropDisabled;
  const photoCount = items.filter((i) => i.kind === "photo").length;
  const videoCount = items.length - photoCount;
  const countLabel = items.length === 0
    ? "No media yet"
    : [photoCount && `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
       videoCount && `${videoCount} video${videoCount > 1 ? "s" : ""}`].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-gray-50/95 to-gray-50/60 px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1.5 text-sm text-accent underline decoration-1 decoration-accent/15 underline-offset-[3px] transition-colors hover:bg-accent/6 hover:decoration-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span>Posts</span>
        </Link>
        <h1 className="text-[19px] font-medium text-accent [font-family:var(--font-zilla-slab)]">
          {isEditing ? "Edit post" : "New post"}
        </h1>
        <form action="/api/auth/logout?redirect=/" method="post">
          <button
            type="submit"
            className="rounded-[10px] px-2 py-1.5 text-sm text-red-700/80 underline decoration-1 decoration-red-700/20 underline-offset-[3px] transition-colors hover:bg-red-900/6 hover:decoration-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-2">
        {loadingExisting && (
          <div className="mb-3 rounded-[10px] border border-accent/15 bg-accent/6 px-3 py-2 text-sm text-accent">
            Loading selected post…
          </div>
        )}

        {/* The canvas IS the post card the author is composing. */}
        <article className="overflow-clip rounded-[20px] bg-white">
          <div className="flex flex-col gap-2.5 px-5 pb-3.5 pt-[18px]">
            <div className="text-[13px] text-accent">
              <DateChip date={postDate ?? new Date()} onChange={setPostDate} />
            </div>
            <CaptionField value={caption} onChange={setCaption} disabled={dropDisabled} />
          </div>

          <MediaGrid
            items={items}
            uploadProgress={uploadProgress}
            disabled={dropDisabled}
            onFiles={addFilesToItems}
            onRemove={removeItem}
            onMove={moveItem}
          />
          <div className="pb-4" />
        </article>

        {/* Advanced: permalink slug */}
        <details
          className="mt-3.5 px-0.5"
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        >
          <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1.5 py-2 text-sm font-medium text-accent [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`} aria-hidden="true" />
            Advanced
          </summary>
          <div className="px-1 pb-2 pt-1">
            <label htmlFor="post-slug" className="mb-1.5 block text-[12.5px] text-gray-500">
              Permalink
            </label>
            <div className="flex items-center rounded-[10px] border border-accent/15 bg-white px-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
              <span className="select-none text-sm text-gray-400">/p/</span>
              <input
                id="post-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-transparent py-2 pl-0.5 text-gray-800 focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-gray-500">
              Lowercase letters, numbers, and hyphens. Defaults to the post date.
            </p>
            {isEditing && (
              <p className={`mt-1 text-[11.5px] ${slugChanged ? "text-red-700/80" : "text-amber-700/80"}`}>
                {slugChanged
                  ? "Heads up: changing the permalink will break existing links to this post."
                  : "Changing the permalink will break existing links to this post."}
              </p>
            )}
          </div>
        </details>
      </main>

      {/* Floating publish bar — thumb-reachable on phones */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-gray-50/95 from-55% to-transparent px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3">
          <span className="whitespace-nowrap text-[12.5px] text-gray-500">{countLabel}</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost}
            aria-busy={isSubmitting}
            className="flex-1 rounded-2xl bg-accent px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(132,90,44,0.28)] transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? (isEditing ? "Updating…" : "Posting…") : (isEditing ? "Update post" : "Post")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-8 text-center text-gray-500">Loading editor…</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
