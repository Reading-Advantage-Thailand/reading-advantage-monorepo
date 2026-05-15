import { describe, it, expect } from "vitest";
import { getPrDisplayName } from "../pr-url";

describe("getPrDisplayName", () => {
  it("shortens a GitHub PR URL", () => {
    expect(getPrDisplayName("https://github.com/reading-advantage/tracker/pull/5")).toBe(
      "reading-advantage/tracker/pull/5"
    );
  });

  it("falls back to original URL for non-GitHub URLs", () => {
    expect(getPrDisplayName("https://example.com/some/path")).toBe("https://example.com/some/path");
  });

  it("falls back for issue URLs", () => {
    expect(getPrDisplayName("https://github.com/reading-advantage/tracker/issues/5")).toBe(
      "https://github.com/reading-advantage/tracker/issues/5"
    );
  });

  it("falls back for malformed URLs", () => {
    expect(getPrDisplayName("not-a-url")).toBe("not-a-url");
  });

  it("handles short paths gracefully", () => {
    expect(getPrDisplayName("https://github.com/reading-advantage/tracker")).toBe(
      "https://github.com/reading-advantage/tracker"
    );
  });
});
