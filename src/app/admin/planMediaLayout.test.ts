import { describe, it, expect } from "vitest";
import type { UploadItem } from "./types";
import { planMediaLayout } from "./planMediaLayout";

let n = 0;
function photo(w: number, h: number): UploadItem {
  return { id: `p${n++}`, kind: "photo", source: "existing", filename: "p.jpg", url: "u", width: w, height: h };
}
function video(): UploadItem {
  return { id: `v${n++}`, kind: "video", source: "existing", filename: "v.mp4", url: "u" };
}
const land = () => photo(1600, 900);
const port = () => photo(900, 1600);
const ids = (rows: UploadItem[][]) => rows.map((r) => r.length);

describe("planMediaLayout", () => {
  it("returns empty structures for no items", () => {
    expect(planMediaLayout([])).toEqual({ hero: null, rows: [], videos: [] });
  });

  it("leads a single landscape photo with a hero and no rows", () => {
    const p = land();
    const { hero, rows } = planMediaLayout([p]);
    expect(hero).toBe(p);
    expect(rows).toEqual([]);
  });

  it("does not hero a single portrait photo — it falls to a row", () => {
    const p = port();
    const { hero, rows } = planMediaLayout([p]);
    expect(hero).toBeNull();
    expect(ids(rows)).toEqual([1]);
  });

  it("keeps a 2-photo post as a balanced pair (no hero)", () => {
    const { hero, rows } = planMediaLayout([land(), land()]);
    expect(hero).toBeNull();
    expect(ids(rows)).toEqual([2]);
  });

  it("heroes the first of a 3-photo landscape-led post, rest in a row", () => {
    const first = land();
    const { hero, rows } = planMediaLayout([first, land(), land()]);
    expect(hero).toBe(first);
    expect(ids(rows)).toEqual([2]);
  });

  it("chunks remaining photos into rows of at most three", () => {
    // 1 hero + 4 remaining → rows of [3, 1]
    const { hero, rows } = planMediaLayout([land(), land(), land(), land(), land()]);
    expect(hero).not.toBeNull();
    expect(ids(rows)).toEqual([3, 1]);
  });

  it("does not hero a portrait-led post even with 3+ photos", () => {
    const { hero, rows } = planMediaLayout([port(), land(), land()]);
    expect(hero).toBeNull();
    expect(ids(rows)).toEqual([3]);
  });

  it("treats missing dimensions as landscape so the hero choice stays stable", () => {
    const noDims: UploadItem = { id: "x", kind: "photo", source: "new", filename: "x.jpg" };
    const { hero } = planMediaLayout([noDims, land(), land()]);
    expect(hero).toBe(noDims);
  });

  it("groups videos after the photos and never heroes a video", () => {
    const v = video();
    const { hero, rows, videos } = planMediaLayout([land(), v]);
    // 2 photos would be a pair, but here it's 1 photo + 1 video → photo heroes.
    const single = planMediaLayout([land(), v]);
    expect(single.hero).not.toBeNull();
    expect(videos).toEqual([v]);
    expect(hero).not.toBeNull();
    expect(rows).toEqual([]);
  });

  it("lists videos with no photos as videos only (no hero, no rows)", () => {
    const v1 = video(), v2 = video();
    expect(planMediaLayout([v1, v2])).toEqual({ hero: null, rows: [], videos: [v1, v2] });
  });

  it("respects a custom maxPerRow", () => {
    const { rows } = planMediaLayout([port(), land(), land(), land(), land()], 2);
    // portrait-led so no hero; 5 photos chunked by 2 → [2, 2, 1]
    expect(ids(rows)).toEqual([2, 2, 1]);
  });
});
