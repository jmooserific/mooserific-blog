"use client"

import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { DateTimePopover } from "@/components/DateTimePopover";
import { usePostEditor } from "./usePostEditor";
import { MediaUploader } from "./MediaUploader";

function AdminPageInner() {
  const {
    caption, setCaption,
    editingId, isEditing, isSubmitting, loadingExisting,
    showAdvanced, setShowAdvanced,
    postDate, setPostDate,
    showDatePopover, setShowDatePopover,
    items, uploadProgress, dropDisabled, draggingId, dragOver, itemRefs,
    handleDrop, addFilesToItems,
    handleDragStart, handleDragEnd, handleDragOverItem, handleItemDrop,
    removeItem, handleSubmit,
  } = usePostEditor();

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <nav className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start rounded-[10px] border border-transparent bg-transparent px-2 py-1.5 text-sm text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span>Back to posts</span>
        </Link>
        <form action="/api/auth/logout?redirect=/" method="post" className="self-start sm:self-auto">
          <button
            type="submit"
            className="inline-flex items-center rounded-[10px] border border-transparent bg-transparent px-3 py-1.5 text-sm text-red-700/80 transition-colors hover:bg-red-900/6 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </nav>
      <article className="bg-white rounded-[20px] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {isEditing ? 'Edit post' : 'Create a new post'}
        </h1>
        {isEditing && editingId && (
          <p className="mb-4 text-sm text-gray-500">
            Editing post ID: <code className="rounded bg-accent/6 text-accent px-1 py-0.5 text-xs">{editingId}</code>
          </p>
        )}
        {loadingExisting && (
          <div className="mb-4 rounded-[10px] border border-accent/15 bg-accent/6 px-3 py-2 text-sm text-accent">
            Loading selected post…
          </div>
        )}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <textarea
            className="appearance-none w-full rounded-[10px] border border-accent/15 bg-white py-2 px-4 text-gray-800 leading-relaxed transition-colors placeholder:text-gray-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            rows={3}
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <p className="text-xs text-gray-500 italic">
            Use{' '}
            <a
              href="https://commonmark.org/help/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Markdown
            </a>{' '}
            to style
          </p>
          <MediaUploader
            items={items}
            uploadProgress={uploadProgress}
            isSubmitting={isSubmitting}
            loadingExisting={loadingExisting}
            dropDisabled={dropDisabled}
            draggingId={draggingId}
            dragOver={dragOver}
            itemRefs={itemRefs}
            onDrop={handleDrop}
            onFiles={addFilesToItems}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOverItem}
            onItemDrop={handleItemDrop}
            onRemove={removeItem}
          />
          <details className="mt-4" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer select-none py-2 text-sm font-medium text-accent">
              Advanced
            </summary>
            <div className="pb-4 pt-2 space-y-3">
              <div className="relative">
                <button
                  type="button"
                  className="w-full rounded-[10px] border border-accent/15 bg-white px-3 py-2 text-left text-gray-800 transition-colors hover:border-accent/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  aria-haspopup="dialog"
                  aria-expanded={showDatePopover}
                  onClick={() => setShowDatePopover((v) => !v)}
                >
                  {postDate ? new Date(postDate).toLocaleString() : 'Use current date/time'}
                </button>
                {showDatePopover && (
                  <div className="absolute left-0 top-full mt-2 z-10">
                    <DateTimePopover
                      initialDate={postDate ?? undefined}
                      onApply={(d) => setPostDate(d)}
                      onClose={() => setShowDatePopover(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </details>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-[10px] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (isEditing ? 'Updating…' : 'Posting…') : (isEditing ? 'Update post' : 'Post')}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-500">Loading editor…</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
