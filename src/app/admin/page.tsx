"use client"

import { Suspense } from "react";
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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a href="/" className="text-blue-600 hover:underline text-sm">← Back to posts</a>
        <form action="/api/auth/logout?redirect=/" method="post">
          <button
            type="submit"
            className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            Sign out
          </button>
        </form>
      </nav>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit post' : 'Create a new post'}</h1>
      </div>
      {isEditing && editingId && (
        <p className="mb-4 text-sm text-gray-500">
          Editing post ID: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{editingId}</code>
        </p>
      )}
      {loadingExisting && (
        <div className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Loading selected post…
        </div>
      )}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <textarea
          className="appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 my-0"
          rows={3}
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="prose text-gray-600 text-xs italic">
          Use <a href="https://commonmark.org/help/" target="_blank">Markdown</a> to style
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
          <summary className="cursor-pointer select-none py-2 text-sm font-medium text-gray-600">
            Advanced
          </summary>
          <div className="pb-4 pt-2 space-y-3">
            <div className="relative">
              <button
                type="button"
                className="w-full text-left rounded-md border border-gray-300 px-3 py-2 text-gray-800 bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-haspopup="dialog"
                aria-expanded={showDatePopover}
                onClick={() => setShowDatePopover((v) => !v)}
              >
                {postDate ? new Date(postDate).toLocaleString() : 'Use current date/time'}
              </button>
              {showDatePopover && (
                <div className="absolute left-0 top-full mt-2">
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
        <button
          type="submit"
          className={`bg-blue-600 text-white px-4 py-2 rounded ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (isEditing ? 'Updating…' : 'Posting…') : (isEditing ? 'Update Post' : 'Post')}
        </button>
      </form>
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
