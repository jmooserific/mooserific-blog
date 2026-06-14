import { describe, it, expect } from "vitest";
import { formatPostDateUTC, toDatetimeLocalUTC, fromDatetimeLocalUTC } from "./dateField";

describe("formatPostDateUTC", () => {
  it("formats using UTC components like the post card byline", () => {
    expect(formatPostDateUTC(new Date("2026-05-14T12:00:00Z"))).toBe("May 14, 2026");
  });

  it("uses the UTC day even when local time would roll over", () => {
    // 23:30 UTC is still the 14th in UTC regardless of the runner's timezone.
    expect(formatPostDateUTC(new Date("2026-05-14T23:30:00Z"))).toBe("May 14, 2026");
  });
});

describe("toDatetimeLocalUTC / fromDatetimeLocalUTC", () => {
  it("round-trips a date through the datetime-local string", () => {
    const d = new Date("2026-05-31T14:30:00Z");
    expect(toDatetimeLocalUTC(d)).toBe("2026-05-31T14:30");
    expect(fromDatetimeLocalUTC(toDatetimeLocalUTC(d))?.toISOString()).toBe(
      "2026-05-31T14:30:00.000Z",
    );
  });

  it("zero-pads single-digit fields", () => {
    expect(toDatetimeLocalUTC(new Date("2026-01-02T03:04:00Z"))).toBe("2026-01-02T03:04");
  });

  it("returns null for empty or malformed input", () => {
    expect(fromDatetimeLocalUTC("")).toBeNull();
    expect(fromDatetimeLocalUTC("2026-05-31")).toBeNull();
    expect(fromDatetimeLocalUTC("not a date")).toBeNull();
  });
});
