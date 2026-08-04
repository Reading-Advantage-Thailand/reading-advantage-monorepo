import { beforeEach, describe, expect, it, vi } from "vitest";
import type { workbooks } from "@reading-advantage/domain";
import { getStorageUrl } from "@reading-advantage/storage";
import { resolveArticleImageUrls } from "./resolve-article-image-urls";

vi.mock("@reading-advantage/storage", () => ({
  getStorageUrl: vi.fn(),
}));

function makeContent(
  articleImages?: workbooks.WorkbookArticleImage[],
): workbooks.WorkbookNormalizedContent {
  return {
    title: "Lesson",
    cefrLevel: "A1",
    paragraphs: [{ order: 0, text: "text" }],
    questions: [],
    assets: [],
    ...(articleImages !== undefined ? { articleImages } : {}),
  };
}

describe("resolveArticleImageUrls", () => {
  beforeEach(() => {
    vi.mocked(getStorageUrl).mockReset();
    vi.mocked(getStorageUrl).mockReturnValue(
      "https://cdn.example.com/resolved.png",
    );
  });

  it("resolves key-only images and leaves the input untouched", () => {
    const content = makeContent([{ key: "img/hero.png", position: "hero" }]);
    const result = resolveArticleImageUrls(content);
    expect(result).not.toBe(content);
    expect(result.articleImages).toEqual([
      {
        key: "img/hero.png",
        position: "hero",
        legacyUrl: "https://cdn.example.com/resolved.png",
      },
    ]);
    expect(getStorageUrl).toHaveBeenCalledWith("img/hero.png");
    expect(content.articleImages).toEqual([
      { key: "img/hero.png", position: "hero" },
    ]);
  });

  it("preserves entries that already carry legacyUrl without calling storage", () => {
    const content = makeContent([
      { key: "img/a.png", legacyUrl: "https://legacy.example.com/a.png" },
    ]);
    const result = resolveArticleImageUrls(content);
    expect(result.articleImages).toEqual([
      { key: "img/a.png", legacyUrl: "https://legacy.example.com/a.png" },
    ]);
    expect(getStorageUrl).not.toHaveBeenCalled();
  });

  it("survives a throwing resolver per image", () => {
    vi.mocked(getStorageUrl).mockImplementation((key: string) => {
      if (key === "img/ok.png") return "https://cdn.example.com/ok.png";
      throw new Error("storage down");
    });
    const content = makeContent([
      { key: "img/broken.png" },
      { key: "img/ok.png" },
    ]);
    const result = resolveArticleImageUrls(content);
    expect(result.articleImages?.[0]?.legacyUrl).toBeUndefined();
    expect(result.articleImages?.[1]?.legacyUrl).toBe(
      "https://cdn.example.com/ok.png",
    );
  });

  it("passes through entries with neither a key nor a legacyUrl", () => {
    const content = makeContent([{ caption: "orphan caption" }]);
    const result = resolveArticleImageUrls(content);
    expect(result.articleImages).toEqual([{ caption: "orphan caption" }]);
    expect(getStorageUrl).not.toHaveBeenCalled();
  });

  it("does not resolve blank or whitespace-only keys", () => {
    const content = makeContent([{ key: "" }, { key: "   " }]);
    const result = resolveArticleImageUrls(content);
    expect(result.articleImages?.[0]?.legacyUrl).toBeUndefined();
    expect(result.articleImages?.[1]?.legacyUrl).toBeUndefined();
    expect(getStorageUrl).not.toHaveBeenCalled();
  });

  it("returns the content unchanged when it has no article images", () => {
    const content = makeContent();
    expect(resolveArticleImageUrls(content)).toBe(content);
    expect(getStorageUrl).not.toHaveBeenCalled();
  });
});
