import type { UploadItem } from "./types";

/**
 * Move the item with id `fromId` so it lands where `toId` currently sits.
 *
 * Photos and videos stay in separate groups (the post card renders photos first,
 * then videos), so a move that would cross between the two kinds is rejected and
 * the list is returned unchanged. A no-op move (same id, missing id) is likewise
 * returned unchanged. Always returns a new array when a move actually happens, so
 * React state updates see a fresh reference.
 */
export function reorderWithinKind(
  items: UploadItem[],
  fromId: string,
  toId: string,
): UploadItem[] {
  if (fromId === toId) return items;
  const from = items.findIndex((i) => i.id === fromId);
  const to = items.findIndex((i) => i.id === toId);
  if (from === -1 || to === -1) return items;
  if (items[from].kind !== items[to].kind) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
