import { describe, it, expect } from "vitest";
import { estimateSkeletonMediaBox } from "./skeletonMediaBox";

describe("estimateSkeletonMediaBox", () => {
  it("returns a hero box clamped to 85vh for a lone landscape photo", () => {
    expect(estimateSkeletonMediaBox({ width: 1600, height: 900 }, 1)).toEqual({
      aspectRatio: 1600 / 900,
      maxHeight: "85vh",
    });
  });

  it("treats a lone square photo as a hero", () => {
    expect(estimateSkeletonMediaBox({ width: 1000, height: 1000 }, 1)).toEqual({
      aspectRatio: 1,
      maxHeight: "85vh",
    });
  });

  it("returns a single-row box clamped to 535px for a lone portrait photo", () => {
    expect(estimateSkeletonMediaBox({ width: 800, height: 1200 }, 1)).toEqual({
      aspectRatio: 800 / 1200,
      maxHeight: "535px",
    });
  });

  it("returns null for multi-photo posts (justified rows need every photo's ratio)", () => {
    expect(estimateSkeletonMediaBox({ width: 1600, height: 900 }, 3)).toBeNull();
    expect(estimateSkeletonMediaBox({ width: 1600, height: 900 }, 2)).toBeNull();
  });

  it("returns null when dimensions are missing or invalid (legacy / video-only rows)", () => {
    expect(estimateSkeletonMediaBox(null, 1)).toBeNull();
    expect(estimateSkeletonMediaBox({ width: 0, height: 0 }, 1)).toBeNull();
    expect(estimateSkeletonMediaBox({ width: 1600, height: 900 }, 0)).toBeNull();
  });
});
