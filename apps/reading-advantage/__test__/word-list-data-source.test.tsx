/**
 * FR-7 behavioral test: the merged word-list dialog drives both the article
 * data source (fetch + normalize) and the stories data source (local chapter
 * words), and renders one shared audio element per dialog.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import WordList from "@/components/word-list";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useCurrentLocale: () => "en",
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={(props.alt as string) ?? ""} />
  ),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

const ARTICLE_WORDS = [
  {
    vocabulary: "apple",
    definition: { en: "a fruit", th: "ผลไม้", cn: "苹果", tw: "蘋果", vi: "quả táo" },
    timeSeconds: 0,
  },
  {
    vocabulary: "banana",
    definition: { en: "a yellow fruit", th: "กล้วย", cn: "香蕉", tw: "香蕉", vi: "chuối" },
    timeSeconds: 5,
  },
];

function makeArticleDataSource() {
  return {
    type: "article" as const,
    article: { title: "Article One" } as never,
    articleId: "article-1",
  };
}

function makeStoriesDataSource() {
  return {
    type: "stories" as const,
    chapter: {
      storyId: "story-1",
      chapter: { words: ARTICLE_WORDS },
    } as never,
    storyId: "story-1",
    chapterNumber: "2",
  };
}

describe("WordList dataSource prop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("article source posts to the assistant wordlist endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ word_list: ARTICLE_WORDS }),
    });
    (globalThis.fetch as jest.Mock) = fetchMock;

    const user = userEvent.setup();
    render(<WordList dataSource={makeArticleDataSource()} userId="user-1" />);

    await user.click(screen.getByRole("button", { name: "title" }));

    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/assistant/wordlist",
      expect.objectContaining({ method: "POST" })
    );
    expect(document.querySelectorAll("audio").length).toBeLessThanOrEqual(1);
  });

  it("stories source reads chapter words without an assistant fetch", async () => {
    const fetchMock = jest.fn();
    (globalThis.fetch as jest.Mock) = fetchMock;

    const user = userEvent.setup();
    render(<WordList dataSource={makeStoriesDataSource()} userId="user-1" />);

    await user.click(screen.getByRole("button", { name: "title" }));

    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    const assistantCalls = fetchMock.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" ? url.includes("/api/v1/assistant/wordlist") : false
    );
    expect(assistantCalls).toEqual([]);
    expect(document.querySelectorAll("audio").length).toBeLessThanOrEqual(1);
  });
});
