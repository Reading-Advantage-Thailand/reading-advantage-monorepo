// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({}),
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush, back: mockBack, refresh: mockRefresh }),
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, refresh: mockRefresh }),
  usePathname: () => "/",
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: null, refresh: vi.fn() }),
  useSession: () => ({ user: null }),
}));

vi.mock("@/components/audio-button", () => ({
  default: () => null,
}));

vi.mock("../articles/article-showcase-card", () => ({
  default: ({ article }: { article: { id: string; title: string } }) => (
    <div data-testid={`article-card-${article.id}`}>{article.title}</div>
  ),
}));

import { useDebounce } from "@/hooks/use-debounce";
import { AdminStatsCards } from "../admin/admin-stats-cards";
import ArticleSelect from "../articles/article-select";
import { TaskCollection } from "../lesson/task/task-collection";
import { MatchingGame } from "../practice/matching-game";
import type { Article } from "@/types";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

/** Real English copy used for user-facing assertions. */
const en = testMessages.en;
const matchingGameCopy = en.SentencesPage.matchingGame;

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("FR-1 empty collections clear loading", () => {
  it("shows the empty state for an empty word list", async () => {
    const article = {
      sentencsAndWordsForFlashcard: [{ words: [], wordsUrl: "" }],
    } as unknown as Article;
    renderWithMessages(<TaskCollection article={article} kind="vocabulary" />);
    expect(
      await screen.findByText(en.Lesson.PreviewVocabulary.empty),
    ).toBeInTheDocument();
  });
});

describe("FR-2 matching game states", () => {
  it("renders an error state when the deck fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("deck down"));
    renderWithMessages(<MatchingGame deckId="deck-1" />);
    expect(
      await screen.findByText(matchingGameCopy.toast.failedToLoad),
    ).toBeInTheDocument();
    expect(
      screen.getByText(matchingGameCopy.buttons.tryAgain),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(matchingGameCopy.buttons.tryAgain));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("renders an empty state when the deck has no pairs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchingGames: [] }),
    });
    renderWithMessages(<MatchingGame deckId="deck-1" />);
    expect(
      await screen.findByText(matchingGameCopy.noDeck.error),
    ).toBeInTheDocument();
    expect(
      screen.getByText(matchingGameCopy.noDeck.message),
    ).toBeInTheDocument();
  });
});

describe("FR-4 article-select pagination", () => {
  const observerCallbacks: IntersectionObserverCallback[] = [];
  const articles = Array.from({ length: 10 }, (_, index) => ({
    id: `a${index}`,
    title: `Title ${index}`,
    type: null,
    genre: null,
  }));

  beforeEach(() => {
    observerCallbacks.length = 0;
    // Installed for the whole file (no teardown): article-select effects can
    // flush after a test ends, and jsdom provides no IntersectionObserver.
    (globalThis as Record<string, unknown>).IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  /**
   * Fires the latest captured observer entry.
   */
  function intersect(): void {
    const callback = observerCallbacks.at(-1);
    if (!callback) throw new Error("Expected an observer to be registered.");
    act(() => {
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  }

  it("advances the offset when a page returns only duplicates", async () => {
    let release!: (value: unknown) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });
    renderWithMessages(<ArticleSelect initialArticles={articles} total={30} />);
    intersect();
    expect(await screen.findByText("Loading more...")).toBeInTheDocument();
    await act(async () => {
      release({ ok: true, json: async () => ({ articles }) });
    });
    intersect();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const secondUrl = String(mockFetch.mock.calls[1]?.[0]);
    expect(secondUrl).toContain("offset=20");
  });

  it("keeps at most one fetch in flight", async () => {
    let release!: (value: { articles: never[] }) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        release = (value) =>
          resolve({ ok: true, json: async () => value });
      }),
    );
    renderWithMessages(<ArticleSelect initialArticles={articles} total={30} />);
    intersect();
    intersect();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ articles: [] });
    });
  });
});

describe("FR-5 debounce coalesces rapid keystrokes", () => {
  it("settles ten rapid values into one debounced value", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: "" } },
    );
    let value = "";
    for (const char of "abcdefghij") {
      value += char;
      rerender({ value });
    }
    expect(result.current).toBe("");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("abcdefghij");
  });

  it("fires one request for ten rapid keystrokes", () => {
    vi.useFakeTimers();
    const requests: string[] = [];

    /**
     * Probe that fetches on the debounced value.
     * @param props Current raw input value.
     * @returns Null.
     */
    function SearchProbe({ value }: { value: string }) {
      const debounced = useDebounce(value, 300);
      useEffect(() => {
        requests.push(debounced);
      }, [debounced]);
      return null;
    }

    const { rerender } = render(<SearchProbe value="" />);
    let value = "";
    for (const char of "abcdefghij") {
      value += char;
      rerender(<SearchProbe value={value} />);
    }
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(requests).toEqual(["", "abcdefghij"]);
  });
});

describe("FR-11 admin stats error state", () => {
  it("renders an error state when the stats fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("stats down"));
    renderWithMessages(<AdminStatsCards />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      await screen.findByText(en.AdminDashboard.stats.loadError),
    ).toBeInTheDocument();
  });
});
