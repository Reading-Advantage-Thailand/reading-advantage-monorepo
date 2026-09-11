/**
 * FR-9 characterization tests for the shared translate helper.
 *
 * One helper owns one endpoint call shape and one locale normalization
 * (`cn` to `zh-CN`, `tw` to `zh-TW`).
 */

import {
  getTranslateSentence,
  normalizeTranslateLocale,
} from "@/lib/translate-sentence";

describe("normalizeTranslateLocale", () => {
  it("normalizes cn to zh-CN", () => {
    expect(normalizeTranslateLocale("cn")).toBe("zh-CN");
  });

  it("normalizes tw to zh-TW", () => {
    expect(normalizeTranslateLocale("tw")).toBe("zh-TW");
  });

  it("passes other locales through unchanged", () => {
    expect(normalizeTranslateLocale("th")).toBe("th");
    expect(normalizeTranslateLocale("vi")).toBe("vi");
    expect(normalizeTranslateLocale("zh-CN")).toBe("zh-CN");
  });
});

describe("getTranslateSentence", () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ message: "success", translated_sentences: ["你好"] }),
    });
  });

  it("posts to the given endpoint with one body shape", async () => {
    await getTranslateSentence("/api/v1/assistant/translate/article-1", "zh-CN", {
      body: { type: "passage" },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/v1/assistant/translate/article-1");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      type: "passage",
      targetLanguage: "zh-CN",
    });
  });

  it("sends only targetLanguage when no extra body fields are given", async () => {
    await getTranslateSentence("/api/v1/articles/article-1/translate", "th");

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ targetLanguage: "th" });
  });

  it("returns the parsed payload on success", async () => {
    const data = await getTranslateSentence(
      "/api/v1/assistant/stories-translate/story-1/2",
      "zh-CN",
      { body: { type: "content" } },
    );

    expect(data).toEqual({ message: "success", translated_sentences: ["你好"] });
  });

  it("falls back to an error payload when the request fails", async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    const data = await getTranslateSentence("/api/v1/assistant/translate/article-1", "th");

    expect(data).toEqual({ message: "error", translated_sentences: [] });
  });
});
