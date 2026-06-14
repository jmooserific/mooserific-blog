import { describe, it, expect } from "vitest";
import { wrapSelection, insertLink, insertListItem } from "./markdownFormat";

describe("wrapSelection", () => {
  it("wraps a selection and selects the inner text", () => {
    const r = wrapSelection("a lake house", 2, 12, "**", "bold text");
    expect(r.text).toBe("a **lake house**");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("lake house");
  });

  it("inserts the placeholder when nothing is selected", () => {
    const r = wrapSelection("", 0, 0, "_", "italic text");
    expect(r.text).toBe("_italic text_");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("italic text");
  });
});

describe("insertLink", () => {
  it("uses the selection as the label and selects the label", () => {
    const r = insertLink("see the trip blog", 8, 17, "https://x.com");
    expect(r.text).toBe("see the [trip blog](https://x.com)");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("trip blog");
  });

  it("falls back to the URL as label when nothing is selected and no fallback", () => {
    const r = insertLink("", 0, 0, "https://x.com");
    expect(r.text).toBe("[https://x.com](https://x.com)");
  });

  it("uses the fallback label when provided and nothing is selected", () => {
    const r = insertLink("", 0, 0, "https://x.com", "link");
    expect(r.text).toBe("[link](https://x.com)");
  });
});

describe("insertListItem", () => {
  it("prefixes a newline when not at line start", () => {
    const r = insertListItem("first", 5, 5, "list item");
    expect(r.text).toBe("first\n- list item");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("list item");
  });

  it("omits the newline at the start of the text", () => {
    const r = insertListItem("", 0, 0, "list item");
    expect(r.text).toBe("- list item");
  });

  it("omits the newline right after an existing line break", () => {
    const r = insertListItem("a\n", 2, 2, "item");
    expect(r.text).toBe("a\n- item");
  });

  it("turns the selection into the item body, leaving the rest in place", () => {
    const r = insertListItem("milk eggs", 0, 4, "list item");
    expect(r.text).toBe("- milk eggs");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("milk");
  });
});
