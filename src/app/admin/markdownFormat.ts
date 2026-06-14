// Pure helpers behind the caption toolbar. Each takes the current textarea value
// and selection and returns the new value plus where the selection should land,
// so the toolbar works for authors who don't know Markdown — they select text and
// press a button. Kept free of the DOM so the selection math is unit-testable; the
// component applies the returned range back onto the textarea.

export interface FormatResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Wrap the current selection in `marker` on both sides (e.g. `**` for bold). With
 * no selection, inserts `placeholder` wrapped and selects it, so the next keypress
 * overtypes a sensible default.
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string,
): FormatResult {
  const body = text.slice(start, end) || placeholder;
  const inserted = `${marker}${body}${marker}`;
  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    selectionStart: start + marker.length,
    selectionEnd: start + marker.length + body.length,
  };
}

/**
 * Insert a Markdown link `[label](url)`. The selected text becomes the label (or
 * `fallbackLabel`, or the URL itself). The label is left selected so it's easy to
 * retype.
 */
export function insertLink(
  text: string,
  start: number,
  end: number,
  url: string,
  fallbackLabel = "",
): FormatResult {
  const label = text.slice(start, end) || fallbackLabel || url;
  const inserted = `[${label}](${url})`;
  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    selectionStart: start + 1, // just inside the opening bracket
    selectionEnd: start + 1 + label.length,
  };
}

/**
 * Turn the selection into a bullet item, prefixing a newline only when we're not
 * already at the start of a line so the `- ` lands on its own row.
 */
export function insertListItem(
  text: string,
  start: number,
  end: number,
  placeholder: string,
): FormatResult {
  const body = text.slice(start, end) || placeholder;
  const atLineStart = start === 0 || text[start - 1] === "\n";
  const prefix = atLineStart ? "- " : "\n- ";
  const inserted = prefix + body;
  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + body.length,
  };
}
