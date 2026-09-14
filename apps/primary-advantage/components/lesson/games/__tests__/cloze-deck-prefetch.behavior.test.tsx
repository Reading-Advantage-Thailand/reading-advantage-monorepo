// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateUserActivityMock, authRefreshMock, fetchMock, toastMock } =
  vi.hoisted(() => ({
    updateUserActivityMock: vi.fn(),
    authRefreshMock: vi.fn(),
    fetchMock: vi.fn(),
    toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refresh: authRefreshMock }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  getLessonClozeTestSentences: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { SentenceClozeGame } from "../lesson-sentence-cloze-test";

const DECK_ID = "deck-9";

/**
 * Cloze sentences prefetched by the deck page. On the prefetch path the
 * payload blanks render as-is (no client-side regeneration), so each fixture
 * sentence ships its blanks with positions inside the sentence text.
 */
const prefetchedSentences = [
  {
    id: "cloze-1",
    articleId: "card-deck-1",
    articleTitle: "Deck Cloze Article",
    sentence: "The dog is very fast.",
    blanks: [
      {
        id: "blank-0",
        position: 4,
        correctAnswer: "dog",
        options: ["dog", "cat", "big", "run"],
        hint: "A word that fits in this context",
      },
      {
        id: "blank-1",
        position: 16,
        correctAnswer: "fast",
        options: ["fast", "slow", "quick", "late"],
        hint: "A word that fits in this context",
      },
    ],
    audioUrl: "/audio/deck.mp3",
    difficulty: "medium" as const,
  },
  {
    id: "cloze-2",
    articleId: "card-deck-1",
    articleTitle: "Deck Cloze Article",
    sentence: "A cat sleeps all day.",
    blanks: [
      {
        id: "blank-0",
        position: 2,
        correctAnswer: "cat",
        options: ["cat", "dog", "fox", "owl"],
        hint: "A word that fits in this context",
      },
      {
        id: "blank-1",
        position: 6,
        correctAnswer: "sleeps",
        options: ["sleeps", "runs", "eats", "plays"],
        hint: "A word that fits in this context",
      },
    ],
    audioUrl: "/audio/deck.mp3",
    difficulty: "medium" as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these pointer/DOM APIs that Radix Select may call.
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;

  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
  // Any fetch means the prefetch path regressed into the loader path.
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("SentenceClozeGame deck prefetch", () => {
  it("keeps the prefetched sentences through mount effects without any fetch", async () => {
    const { unmount } = render(
      <SentenceClozeGame
        source="deck"
        deckId={DECK_ID}
        sentences={prefetchedSentences}
      />,
    );

    // The start screen must report the prefetched deck size, not an emptied
    // list wiped by the mount effect while rawSentenceData is still unloaded.
    await screen.findByRole("button", { name: "startScreen.startButton" });
    expect(screen.getByText("2")).toBeInTheDocument();

    // Starting the game renders the first prefetched sentence's blanks.
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    expect(screen.getByText("is very")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // Late effects and timers must not wipe the rendered sentence either.
    vi.useFakeTimers();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("is very")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // The prefetch path never falls back to the deck endpoint.
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();
  });
});
