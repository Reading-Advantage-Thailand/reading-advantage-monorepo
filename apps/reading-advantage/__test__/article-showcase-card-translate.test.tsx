/**
 * FR-4 behavioral regression test for the showcase-card translate storm.
 *
 * A card must skip the translate POST when the article payload already
 * carries a cached translation for the locale, and must normalize the `cn`
 * locale to `zh-CN` before the cache check and the request.
 */

import { render, screen, waitFor } from "@testing-library/react";

import ArticleShowcaseCard from "@/components/article-showcase-card";
import type { ArticleShowcase } from "@/components/models/article-model";

let mockLocale = "th";

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => mockLocale,
  useScopedI18n: () => (key: string) => key,
  usePathname: () => "/student/read",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/student/read",
}));

function makeArticle(overrides: Partial<ArticleShowcase> = {}): ArticleShowcase {
  return {
    id: "article-1",
    title: "The River",
    summary: "A short summary.",
    type: "fiction",
    ra_level: "A1",
    genre: "fiction",
    subgenre: "adventure",
    cefr_level: "A1",
    cefrLevel: "A1",
    average_rating: 4,
    rating: 4,
    created_at: "2026-01-01",
    ...overrides,
  } as ArticleShowcase;
}

describe("ArticleShowcaseCard translate cache check", () => {
  beforeEach(() => {
    mockLocale = "th";
    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "success", translated_sentences: ["translated summary"] }),
    });
  });

  it("skips the translate POST when the locale translation is cached", async () => {
    const article = makeArticle({ translatedSummary: { th: ["cached summary"] } });
    render(<ArticleShowcaseCard article={article} />);

    await waitFor(() => expect(screen.getByText("cached summary")).toBeInTheDocument());
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("normalizes cn to zh-CN before the cache check", async () => {
    mockLocale = "cn";
    const article = makeArticle({ translatedSummary: { "zh-CN": ["中文摘要"] } });
    render(<ArticleShowcaseCard article={article} />);

    await waitFor(() => expect(screen.getByText("中文摘要")).toBeInTheDocument());
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("posts one translate request for an uncached locale", async () => {
    const article = makeArticle();
    render(<ArticleShowcaseCard article={article} />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/articles/article-1/translate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetLanguage: "th" }),
      }),
    );
    await waitFor(() => expect(screen.getByText("translated summary")).toBeInTheDocument());
  });
});
