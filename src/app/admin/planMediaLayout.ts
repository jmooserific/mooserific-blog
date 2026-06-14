import { shouldLeadWithHero } from "@/utils/heroLayout";
import type { UploadItem } from "./types";

export interface MediaLayout {
  /** The first photo when it leads as a full-bleed hero, else null. */
  hero: UploadItem | null;
  /** Justified photo rows (≤ maxPerRow each), excluding the hero. */
  rows: UploadItem[][];
  /** Videos render full-width beneath the photos (photos-before-videos rule). */
  videos: UploadItem[];
}

/** Dims with a stable landscape fallback so the hero choice doesn't flip while async dims load. */
function dimsOf(item: UploadItem): { width: number; height: number } {
  return { width: item.width ?? 1200, height: item.height ?? 900 };
}

/**
 * Plan how the editor lays media out so it mirrors the published post card: a
 * full-bleed hero when the first photo is landscape/square and the count is 1 or
 * 3+ (the shared {@link shouldLeadWithHero} rule), the remaining photos in
 * justified rows of up to `maxPerRow`, and videos grouped after the photos. Pure
 * so the composition is unit-testable without rendering the grid.
 */
export function planMediaLayout(items: UploadItem[], maxPerRow = 3): MediaLayout {
  const photos = items.filter((i) => i.kind === "photo");
  const videos = items.filter((i) => i.kind === "video");
  const useHero = shouldLeadWithHero(photos.map(dimsOf));
  const hero = useHero ? photos[0] : null;
  const rowPhotos = useHero ? photos.slice(1) : photos;

  const rows: UploadItem[][] = [];
  for (let i = 0; i < rowPhotos.length; i += maxPerRow) {
    rows.push(rowPhotos.slice(i, i + maxPerRow));
  }

  return { hero, rows, videos };
}
