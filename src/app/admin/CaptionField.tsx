"use client"

import { useLayoutEffect, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import { BoldIcon, ItalicIcon, LinkIcon, ListBulletIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { wrapSelection, insertLink, insertListItem, type FormatResult } from "./markdownFormat";

interface CaptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// In the editor preview, links render styled but non-interactive so the
// tap-to-edit region (a role="button") holds no nested interactive element.
// The author edits the link's target through the toolbar, not by clicking it.
const PREVIEW_COMPONENTS: Components = {
  a: ({ children }) => <span className="text-blue-600 underline">{children}</span>,
};

/**
 * Coerce a prompt-entered URL to a safe one: accept http(s)/mailto as-is, assume
 * https for a scheme-less host, and reject anything with another scheme
 * (javascript:, data:, …). Defense-in-depth — react-markdown already neutralizes
 * unsafe hrefs at render — and a small UX win (typing `example.com` just works).
 */
function safeLinkUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(https?:\/\/|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null; // some other (unsafe) scheme
  return `https://${url}`;
}

/**
 * WYSIWYG caption editor. At rest it shows the rendered Markdown exactly as the
 * post card will (`prose prose-sm` + the same `react-markdown`), so authors who
 * don't know Markdown see the result, not the syntax. Tapping it reveals a
 * textarea with a formatting toolbar whose buttons wrap the selection in Markdown
 * — select "lake house", press B. The string stays Markdown end to end, so storage
 * and the live site render it unchanged.
 */
export function CaptionField({ value, onChange, disabled = false }: CaptionFieldProps) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // A selection range to reapply after a toolbar edit re-renders the controlled
  // textarea (React would otherwise drop the caret to the end).
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    if (!editing) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pending = pendingSelection.current;
    if (pending) {
      ta.focus();
      ta.setSelectionRange(pending.start, pending.end);
      pendingSelection.current = null;
    }
  }, [value, editing]);

  function enterEdit() {
    if (disabled) return;
    setEditing(true);
    // Focus + caret to end once the textarea mounts.
    pendingSelection.current = { start: value.length, end: value.length };
  }

  function applyFormat(fn: (text: string, start: number, end: number) => FormatResult) {
    const ta = textareaRef.current;
    if (!ta) return;
    const result = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
    onChange(result.text);
  }

  const trimmed = value.trim();

  if (!editing) {
    // Empty state is a real <button> (it holds only phrasing content).
    if (!trimmed) {
      return (
        <button
          type="button"
          onClick={enterEdit}
          disabled={disabled}
          className="group inline-flex items-center gap-1.5 rounded-[10px] text-sm text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        >
          <PencilSquareIcon className="h-3.75 w-3.75 opacity-80" aria-hidden="true" />
          Add a caption
          <span className="text-gray-500">— optional</span>
        </button>
      );
    }
    // Filled state: tap-anywhere-to-edit. Rendered as a role="button" div (not a
    // real <button>) because react-markdown emits block content (<p>, <ul>); and
    // its links render as non-interactive spans here so the preview holds no
    // nested interactive element. The author edits the link via the toolbar.
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={enterEdit}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            enterEdit();
          }
        }}
        aria-label="Edit caption"
        className="-mx-1.5 cursor-text rounded-[10px] px-1.5 py-1 transition-colors hover:bg-accent/6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <div className="prose prose-sm max-w-none">
          <Markdown components={PREVIEW_COMPONENTS}>{value}</Markdown>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <ToolbarButton label="Bold" onPress={() => applyFormat((t, s, e) => wrapSelection(t, s, e, "**", "bold text"))}>
          <BoldIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onPress={() => applyFormat((t, s, e) => wrapSelection(t, s, e, "_", "italic text"))}>
          <ItalicIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          onPress={() => {
            const raw = window.prompt("Link URL", "https://");
            if (raw === null) return;
            const url = safeLinkUrl(raw);
            if (!url) {
              window.alert("Links must start with http://, https://, or mailto:");
              return;
            }
            applyFormat((t, s, e) => insertLink(t, s, e, url));
          }}
        >
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onPress={() => applyFormat((t, s, e) => insertListItem(t, s, e, "list item"))}>
          <ListBulletIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Done
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="block w-full resize-y appearance-none rounded-[10px] border border-accent bg-white px-3 py-2 text-sm leading-relaxed text-gray-800 outline-none ring-2 ring-accent/30 placeholder:text-gray-400"
        rows={3}
        autoFocus
        placeholder="Write a caption… select text, then tap B, I, or the link icon to format."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, onPress, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // mousedown (not click) so the textarea keeps its selection when pressed.
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-accent/15 bg-transparent text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      {children}
    </button>
  );
}
