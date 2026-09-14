// @vitest-environment jsdom
// Characterization tests written before the order/cloze merge. Each source file
// holds two full game implementations plus a dispatcher. These tests pin the
// current observable behavior of every variant so the merge must keep them
// green.
//
// Covered variants:
//   lesson-sentence-order.tsx      -> LessonSentenceOrderView (source="lesson")
//   lesson-sentence-order.tsx      -> DeckOrderSentenceGameView (source="deck")
//   lesson-sentence-cloze-test.tsx -> LessonSentenceClozeTestView (source="lesson")
//   lesson-sentence-cloze-test.tsx -> DeckClozeTestGameView (source="deck")
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityType, UserXpEarned } from "@/types/enum";

const {
  getLessonOrderingSentencesMock,
  getLessonClozeTestSentencesMock,
  updateUserActivityMock,
  authRefreshMock,
  fetchMock,
  toastMock,
} = vi.hoisted(() => ({
  getLessonOrderingSentencesMock: vi.fn(),
  getLessonClozeTestSentencesMock: vi.fn(),
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
  useSession: () => ({ user: { id: "user-1", level: 1 } }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: vi.fn(),
  getLessonOrderingSentences: getLessonOrderingSentencesMock,
  getLessonClozeTestSentences: getLessonClozeTestSentencesMock,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { OrderSentenceGame } from "../lesson-sentence-order";
import { SentenceClozeGame } from "../lesson-sentence-cloze-test";

const ARTICLE_ID = "article-1";
const DECK_ID = "deck-9";
const ORDER_DECK_URL = `/api/flashcard/decks/${DECK_ID}/sentences-for-ordering`;
const CLOZE_DECK_URL = `/api/flashcard/decks/${DECK_ID}/sentences-for-cloze`;

// The deck order view shows this hardcoded string; the lesson view shows the
// translation key. Both games keep that difference.
const DECK_ORDER_TOAST = "Perfect! Correct sentence order! 🎉";

/**
 * Builds a fetch Response stub for the deck endpoints.
 * @param payload JSON body the stubbed response resolves to.
 * @returns Object shaped like the Response the components consume.
 */
function jsonResponse(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

/**
 * Sentence-order group for the lesson variant. Article-shaped fields plus the
 * two sentences the shuffle must reorder.
 */
function orderGroup(articleTitle: string, articleId: string) {
  return {
    id: `group-${articleId}`,
    articleId,
    articleTitle,
    flashcardSentence: "Dogs bark. Cats sleep.",
    correctOrder: ["Dogs bark.", "Cats sleep."],
    sentences: [
      {
        id: "s1",
        text: "Dogs bark.",
        audioUrl: "/audio/full.mp3",
        startTime: 1,
        endTime: 3,
      },
      {
        id: "s2",
        text: "Cats sleep.",
        audioUrl: "/audio/full.mp3",
        startTime: 4,
        endTime: 6,
      },
    ],
    difficulty: "easy" as const,
    startIndex: 0,
    flashcardIndex: 0,
  };
}

/**
 * Cloze sentence for both variants. The views ignore any provided blanks and
 * regenerate them client-side from this sentence text.
 * @param articleTitle Title rendered in the game card.
 * @param articleId Owning article id.
 * @param blanks Blanks shipped with the payload, for the decoy assertion.
 */
function clozeSentence(
  articleTitle: string,
  articleId: string,
  blanks: unknown[] = [],
) {
  return {
    id: `cloze-${articleId}`,
    articleId,
    articleTitle,
    sentence: "The dog is very fast.",
    blanks,
    difficulty: "medium" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these pointer/DOM APIs that Radix Select calls during open.
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;

  getLessonOrderingSentencesMock.mockResolvedValue({
    sentenceGroups: [orderGroup("Lesson Order Article", ARTICLE_ID)],
    totalGroups: 1,
  });
  getLessonClozeTestSentencesMock.mockResolvedValue({
    clozeTests: [clozeSentence("Lesson Cloze Article", ARTICLE_ID)],
    totalTests: 1,
  });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue(
    jsonResponse({
      sentenceGroups: [orderGroup("Deck Order Article", "card-deck-1")],
      clozeTests: [
        clozeSentence("Deck Cloze Article", "card-deck-1", [
          {
            id: "fixture-blank",
            position: 0,
            correctAnswer: "decoyAnswer",
            options: ["decoyAnswer"],
          },
        ]),
      ],
      totalTests: 1,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Makes the Fisher-Yates shuffles deterministic: every j index becomes 0, so a
 * two-item sentence list renders reversed and needs one upward move.
 */
function freezeShuffle(): void {
  vi.spyOn(Math, "random").mockReturnValue(0);
}

/**
 * Returns the draggable sentence tokens of the order game.
 * @returns Tokens in their current visual order.
 */
function orderTokens(): HTMLElement[] {
  return screen.getAllByRole("button", { name: "reorderAriaLabel" });
}

/**
 * Starts the order game and reorders the two tokens into the correct order.
 */
function solveOrderRound(): void {
  fireEvent.click(screen.getByRole("button", { name: "startGame" }));
  const tokens = orderTokens();
  fireEvent.keyDown(tokens[1], { key: "ArrowUp" });
}

/**
 * Finds the POST a deck view sends when the game finishes.
 * @param url Deck endpoint the POST must target.
 * @returns The url and init object of that POST call.
 */
function postedFinish(url: string): [string, RequestInit] {
  const post = fetchMock.mock.calls.find((call: unknown[]) => {
    const init = call[1] as RequestInit | undefined;
    return init?.method === "POST";
  });
  if (!post) {
    throw new Error(`Expected a POST call to ${url}.`);
  }
  return [post[0] as string, post[1] as RequestInit];
}

/**
 * Opens one cloze blank Select and picks the given option.
 * @param user The user-event API instance.
 * @param blankIndex Zero-based index of the blank trigger.
 * @param answer Option label to choose.
 */
async function answerBlank(
  user: ReturnType<typeof userEvent.setup>,
  blankIndex: number,
  answer: string,
): Promise<void> {
  const triggers = screen.getAllByRole("combobox");
  await user.click(triggers[blankIndex]);
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: answer }));
  await waitFor(() =>
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
  );
}

/**
 * Fills both cloze blanks with the correct words. The game must already be
 * playing.
 * @param user The user-event API instance.
 */
async function solveClozeRound(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await answerBlank(user, 0, "dog");
  await answerBlank(user, 1, "fast");
}

describe("lesson sentence-order variant (characterization)", () => {
  it("loads groups through the lesson action and never through the deck endpoint", async () => {
    render(<OrderSentenceGame source="lesson" articleId={ARTICLE_ID} />);

    await screen.findByRole("button", { name: "startGame" });
    expect(getLessonOrderingSentencesMock).toHaveBeenCalledWith(ARTICLE_ID);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("readyToStart")).toBeInTheDocument();
  });

  it("renders lesson tokens and completes the round with one keyboard move", async () => {
    freezeShuffle();
    render(<OrderSentenceGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startGame" });

    fireEvent.click(screen.getByRole("button", { name: "startGame" }));

    // Data contract: tokens and title come from the lesson action payload.
    expect(screen.getByText(/Lesson Order Article/)).toBeInTheDocument();
    const tokens = orderTokens();
    expect(within(tokens[0]).getByText("Cats sleep.")).toBeInTheDocument();
    expect(within(tokens[1]).getByText("Dogs bark.")).toBeInTheDocument();

    fireEvent.keyDown(tokens[1], { key: "ArrowUp" });

    expect(await screen.findByText("1/1 correct")).toBeInTheDocument();
    expect(screen.getByText("perfectCorrectOrder")).toBeInTheDocument();
    // The lesson view reports completion through the translation key.
    expect(toastMock.success).toHaveBeenCalledWith("perfectCorrectOrder");
  });

  it("finishing the last group reports the lesson activity without a deck POST", async () => {
    freezeShuffle();
    render(<OrderSentenceGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startGame" });
    solveOrderRound();

    fireEvent.click(await screen.findByRole("button", { name: "finishGame" }));

    await screen.findByText(/completedTitle/);
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_ORDERING,
      expect.any(Number),
      { score: UserXpEarned.SENTENCE_ORDERING },
    );
    expect(authRefreshMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    // The lesson completion screen has no back-to-menu action.
    expect(
      screen.queryByRole("button", { name: "backToMenu" }),
    ).not.toBeInTheDocument();
  });
});

describe("deck sentence-order variant (characterization)", () => {
  it("renders prefetched deck sentences without any fetch", async () => {
    render(
      <OrderSentenceGame
        source="deck"
        deckId={DECK_ID}
        sentences={[orderGroup("Deck Order Article", "card-deck-1")]}
      />,
    );

    await screen.findByRole("button", { name: "startGame" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getLessonOrderingSentencesMock).not.toHaveBeenCalled();
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "startGame" }));
    expect(screen.getByText(/Deck Order Article/)).toBeInTheDocument();
    expect(screen.getByText("Cats sleep.")).toBeInTheDocument();
    expect(screen.getByText("Dogs bark.")).toBeInTheDocument();
  });

  it("fetches deck groups from the deck endpoint when nothing is prefetched", async () => {
    render(<OrderSentenceGame source="deck" deckId={DECK_ID} />);

    await screen.findByRole("button", { name: "startGame" });
    expect(fetchMock).toHaveBeenCalledWith(ORDER_DECK_URL);
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "startGame" }));
    expect(screen.getByText(/Deck Order Article/)).toBeInTheDocument();
  });

  it("completes with the hardcoded deck toast and posts the score to the deck endpoint", async () => {
    freezeShuffle();
    render(
      <OrderSentenceGame
        source="deck"
        deckId={DECK_ID}
        sentences={[orderGroup("Deck Order Article", "card-deck-1")]}
      />,
    );
    await screen.findByRole("button", { name: "startGame" });
    solveOrderRound();

    expect(await screen.findByText("1/1 correct")).toBeInTheDocument();
    // The deck view keeps a hardcoded English toast instead of a key.
    expect(toastMock.success).toHaveBeenCalledWith(DECK_ORDER_TOAST);

    fireEvent.click(screen.getByRole("button", { name: "finishGame" }));

    await screen.findByText(/completedTitle/);
    // The complete screen reports the live score.
    expect(await screen.findByText("1")).toBeInTheDocument();
    const [postUrl, postInit] = postedFinish(ORDER_DECK_URL);
    expect(postUrl).toBe(ORDER_DECK_URL);
    // handleNext closes over the score/timer captured when it was created, so
    // the posted numbers are stale today. Only the endpoint and body shape are
    // pinned; the merge may fix the values without breaking this test.
    expect(JSON.parse(String(postInit.body))).toEqual({
      score: expect.any(Number),
      timer: expect.any(Number),
    });
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(authRefreshMock).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "backToMenu" }),
    ).toBeInTheDocument();
  });
});

describe("lesson cloze variant (characterization)", () => {
  it("loads through the lesson action with the default difficulty", async () => {
    render(<SentenceClozeGame source="lesson" articleId={ARTICLE_ID} />);

    await screen.findByRole("button", { name: "buttons.startGame" });
    expect(getLessonClozeTestSentencesMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      "medium",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("start.title")).toBeInTheDocument();
  });

  it("regenerates blanks from the lesson sentence and completes the round", async () => {
    const user = userEvent.setup();
    render(<SentenceClozeGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "buttons.startGame" });

    fireEvent.click(screen.getByRole("button", { name: "buttons.startGame" }));

    // Data contract: the sentence text drives the client-generated blanks.
    expect(screen.getByText(/Lesson Cloze Article/)).toBeInTheDocument();
    expect(screen.getByText("is very")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByText("___")).toHaveLength(2);

    await solveClozeRound(user);

    expect(await screen.findByText("result.perfect")).toBeInTheDocument();
    expect(screen.getByText("progress.perfect")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "buttons.finish" })).toBeEnabled();
  });

  it("finishing reports the cloze lesson activity and refreshes the session", async () => {
    const user = userEvent.setup();
    render(<SentenceClozeGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "buttons.startGame" });
    fireEvent.click(screen.getByRole("button", { name: "buttons.startGame" }));
    await solveClozeRound(user);

    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finish" }),
    );

    await screen.findByText("complete.title");
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByText("complete.stats.perfect")).toBeInTheDocument();
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_CLOZE_TEST,
      expect.any(Number),
      { score: UserXpEarned.SENTENCE_CLOZE_TEST },
    );
    expect(authRefreshMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("deck cloze variant (characterization)", () => {
  it("fetches deck cloze data from the deck endpoint on mount", async () => {
    render(<SentenceClozeGame source="deck" deckId={DECK_ID} />);

    await screen.findByRole("button", { name: "startScreen.startButton" });
    expect(fetchMock).toHaveBeenCalledWith(CLOZE_DECK_URL);
    expect(getLessonClozeTestSentencesMock).not.toHaveBeenCalled();
    expect(screen.getByText("startScreen.title")).toBeInTheDocument();
  });

  it("rebuilds deck blanks client-side and completes with deck result labels", async () => {
    const user = userEvent.setup();
    render(<SentenceClozeGame source="deck" deckId={DECK_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });

    fireEvent.click(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    );

    // Data contract: payload blanks are ignored; options come from the sentence.
    expect(screen.queryByText("decoyAnswer")).not.toBeInTheDocument();
    expect(screen.getByText("is very")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByText("gameplay.placeholder")).toHaveLength(2);

    await solveClozeRound(user);

    expect(await screen.findByText("results.allCorrect")).toBeInTheDocument();
    expect(screen.getByText("gameplay.score")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "buttons.finishGame" }),
    ).toBeEnabled();
  });

  it("posts the finished deck score to the cloze endpoint", async () => {
    const user = userEvent.setup();
    render(<SentenceClozeGame source="deck" deckId={DECK_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    );
    await solveClozeRound(user);

    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await screen.findByText("complete.title");
    // The complete screen reports the live score.
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(
      await screen.findByText("complete.stats.perfectScores"),
    ).toBeInTheDocument();
    const [postUrl, postInit] = postedFinish(CLOZE_DECK_URL);
    expect(postUrl).toBe(CLOZE_DECK_URL);
    // Same stale score/timer closure as the deck order view: pin the endpoint
    // and the body shape only.
    expect(JSON.parse(String(postInit.body))).toEqual({
      score: expect.any(Number),
      timer: expect.any(Number),
    });
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(authRefreshMock).toHaveBeenCalled();
  });
});
