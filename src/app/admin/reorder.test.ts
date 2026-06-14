import { describe, it, expect } from "vitest";
import type { UploadItem } from "./types";
import { reorderWithinKind } from "./reorder";

function item(id: string, kind: UploadItem["kind"]): UploadItem {
  return { id, kind, source: "existing", filename: `${id}.x`, url: `https://x/${id}` };
}

describe("reorderWithinKind", () => {
  const photos = [item("a", "photo"), item("b", "photo"), item("c", "photo")];

  it("moves an item forward to the target's slot", () => {
    const next = reorderWithinKind(photos, "a", "c");
    expect(next.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("moves an item backward to the target's slot", () => {
    const next = reorderWithinKind(photos, "c", "a");
    expect(next.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("returns a new array reference on a real move", () => {
    const next = reorderWithinKind(photos, "a", "b");
    expect(next).not.toBe(photos);
  });

  it("is a no-op when from and to are the same", () => {
    const next = reorderWithinKind(photos, "b", "b");
    expect(next).toBe(photos);
  });

  it("is a no-op when an id is missing", () => {
    expect(reorderWithinKind(photos, "z", "a")).toBe(photos);
    expect(reorderWithinKind(photos, "a", "z")).toBe(photos);
  });

  it("refuses to move across kinds (photos stay before videos)", () => {
    const mixed = [item("a", "photo"), item("b", "photo"), item("v", "video")];
    expect(reorderWithinKind(mixed, "a", "v")).toBe(mixed);
    expect(reorderWithinKind(mixed, "v", "a")).toBe(mixed);
  });
});
