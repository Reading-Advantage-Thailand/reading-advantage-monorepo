// @vitest-environment jsdom
// Staff preview render tests: each lesson game finishes its round in Preview
// mode without calling any write path. The client preview skip
// (`usePreviewSave`) is the only thing under test here; server guards cover
// data safety. The identity next-intl mock pins translation keys, matching
// the characterization tests in this directory.
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
import type { ReactElement } from "react";

import { StudentViewProvider } from "@/components/student/student-view-provider";
import { ActivityType, FlashcardType } from "@/types/enum";

const {
  getLessonClozeTestSentencesMock,
  getLessonOrderingSentencesMock,
  getLessonOrderingWordsMock,
  getLessonFlashcardsMock,
  reviewCardMock,
  updateUserActivityMock,
  authRefreshMock,
  fetchMock,
  toastMock,
} = vi.hoisted(() => ({
  getLessonClozeTestSentencesMock: vi.fn(),
  getLessonOrderingSentencesMock: vi.fn(),
  getLessonOrderingWordsMock: vi.fn(),
  getLessonFlashcardsMock: vi.fn(),
  reviewCardMock: vi.fn(),
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
  getLessonFlashcards: getLessonFlashcardsMock,
  getDeckCards: vi.fn(),
  getLessonOrderingSentences: getLessonOrderingSentencesMock,
  getLessonClozeTestSentences: getLessonClozeTestSentencesMock,
  getLessonOrderingWords: getLessonOrderingWordsMock,
  reviewCard: reviewCardMock,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { SentenceClozeGame } from "../lesson-sentence-cloze-test";
import { OrderSentenceGame } from "../lesson-sentence-order";
import { OrderWordGame } from "../lesson-sentence-order-word";
import { LessonMatchingGame } from "../lesson-matching-game";
import LessonFlashcardGame from "../lesson-flashcard-game";

const ARTICLE_ID = "article-1";

/**
 * Renders a game the way the staff preview page does: inside the preview
 * provider, so `usePreviewSave` reports preview and the write path is skipped.
 * @param ui The game element.
 */
function renderPreview(ui: ReactElement): void {
  render(<StudentViewProvider mode="preview">{ui}</StudentViewProvider>);
}

/**
 * Finds the deck POSTs a game would send when it finishes.
 * @returns The fetch calls with a POST method.
 */
function postedCalls(): unknown[] {
  return fetchMock.mock.calls.filter(
    (call: unknown[]) =>
      (call[1] as RequestInit | undefined)?.method === "POST",
  );
}

/**
 * Cloze sentence for the lesson variant. Blanks regenerate client-side from
 * the sentence text; the medium difficulty always yields two blanks here.
 */
function clozeSentence() {
  return {
    id: "cloze-article-1",
    articleId: ARTICLE_ID,
    articleTitle: "Lesson Cloze Article",
    sentence: "The dog is very fast.",
    blanks: [],
    difficulty: "medium" as const,
  };
}

/**
 * Sentence-order group for the lesson variant. Two sentences, so a frozen
 * shuffle renders them reversed and one upward move fixes the order.
 */
function orderGroup() {
  return {
    id: `group-${ARTICLE_ID}`,
    articleId: ARTICLE_ID,
    articleTitle: "Lesson Order Article",
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
 * Order-word group for the lesson variant. Clicking the bank words in order
 * auto-completes the round.
 */
function wordGroup() {
  const correctOrder = ["The", "cat", "sat"];
  return {
    id: "wg-a",
    articleId: ARTICLE_ID,
    articleTitle: "Animals",
    sentence: correctOrder.join(" "),
    correctOrder,
    words: correctOrder.map((text, index) => ({
      id: `a-w${index}`,
      text,
      translation: { th: `th-${text}` },
      audioUrl: `/audio/a-w${index}.mp3`,
      startTime: index + 1,
      endTime: index + 2,
    })),
    difficulty: "easy" as const,
    sentenceTranslations: { th: "Animals translated." },
  };
}

const SENTENCE_CARDS = [
  {
    id: "pair-1",
    sentence: "Dogs bark.",
    translation: { th: "Dog sound." },
  },
  {
    id: "pair-2",
    sentence: "Cats meow.",
    translation: { th: "Cat sound." },
  },
];

const FLASHCARDS = [
  {
    id: "sentence-card-1",
    sentence: "The dog runs fast.",
    translation: { th: "The dog moves quickly." },
    state: "NEW",
  },
  {
    id: "sentence-card-2",
    sentence: "The cat sleeps here.",
    translation: { th: "The cat is asleep here." },
    state: "NEW",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these pointer/DOM APIs that Radix Select calls during open.
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;

  getLessonClozeTestSentencesMock.mockResolvedValue({
    clozeTests: [clozeSentence()],
    totalTests: 1,
  });
  getLessonOrderingSentencesMock.mockResolvedValue({
    sentenceGroups: [orderGroup()],
    totalGroups: 1,
  });
  getLessonOrderingWordsMock.mockResolvedValue({
    sentences: [wordGroup()],
    totalSentences: 1,
  });
  getLessonFlashcardsMock.mockResolvedValue({ success: true, cards: [] });
  reviewCardMock.mockResolvedValue({ success: true });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({}),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Makes the Fisher-Yates shuffles deterministic: every j index becomes 0, so
 * a two-item sentence list renders reversed and needs one upward move.
 */
function freezeShuffle(): void {
  vi.spyOn(Math, "random").mockReturnValue(0);
}

/**
 * Clicks a button by its translated (identity-mocked) label.
 * @param name The rendered accessible button name.
 */
function clickButton(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

/**
 * Answers every cloze blank with its first option. Correctness does not
 * matter: any full set of answers completes the round and arms Finish.
 * @param user The user-event API instance.
 */
async function answerEveryBlank(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const count = screen.getAllByRole("combobox").length;
  for (let index = 0; index < count; index++) {
    await user.click(screen.getAllByRole("combobox")[index]);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getAllByRole("option")[0]);
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  }
}

/**
 * Matches one left item to one right item by their visible labels.
 * @param leftLabel Sentence or word button label.
 * @param rightLabel Translation or definition button label.
 */
function matchPair(leftLabel: string, rightLabel: string): void {
  fireEvent.click(screen.getByRole("button", { name: leftLabel }));
  fireEvent.click(screen.getByRole("button", { name: rightLabel }));
}

describe("lesson games in staff preview", () => {
  it("finishes the cloze round without reporting the activity", async () => {
    const user = userEvent.setup();
    renderPreview(
      <SentenceClozeGame source="lesson" articleId={ARTICLE_ID} />,
    );
    await screen.findByRole("button", { name: "buttons.startGame" });
    clickButton("buttons.startGame");

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    await answerEveryBlank(user);

    clickButton("buttons.finish");

    await screen.findByText("complete.title");
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(postedCalls()).toHaveLength(0);
    expect(toastMock.info).toHaveBeenCalledWith("notSaved");
  });

  it("finishes the sentence-order round without reporting the activity", async () => {
    freezeShuffle();
    renderPreview(
      <OrderSentenceGame source="lesson" articleId={ARTICLE_ID} />,
    );
    await screen.findByRole("button", { name: "startGame" });
    clickButton("startGame");

    const tokens = screen.getAllByRole("button", { name: "reorderAriaLabel" });
    fireEvent.keyDown(tokens[1], { key: "ArrowUp" });

    clickButton("finishGame");

    await screen.findByText(/completedTitle/);
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(postedCalls()).toHaveLength(0);
    expect(toastMock.info).toHaveBeenCalledWith("notSaved");
  });

  it("finishes the word-order round without reporting the activity", async () => {
    renderPreview(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    clickButton("startScreen.startButton");

    for (const text of ["The", "cat", "sat"]) {
      clickButton(text);
    }

    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await screen.findByText("complete.title");
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(postedCalls()).toHaveLength(0);
    expect(toastMock.info).toHaveBeenCalledWith("notSaved");
  });

  it("completes the matching round without reporting the activity", async () => {
    getLessonFlashcardsMock.mockResolvedValue({
      success: true,
      cards: SENTENCE_CARDS,
    });
    renderPreview(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.SENTENCE}
      />,
    );
    await screen.findByRole("button", { name: "startScreen.startButton" });
    clickButton("startScreen.startButton");

    matchPair("Dogs bark.", "Dog sound.");
    matchPair("Cats meow.", "Cat sound.");

    expect(await screen.findByText("results.allCorrect")).toBeInTheDocument();
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(postedCalls()).toHaveLength(0);
    expect(toastMock.info).toHaveBeenCalledWith("notSaved");

    clickButton("buttons.finishGame");
    await screen.findByText("complete.title");
    expect(updateUserActivityMock).not.toHaveBeenCalled();
  });

  it("rates every flashcard without saving any rating", async () => {
    getLessonFlashcardsMock.mockResolvedValue({ cards: FLASHCARDS });
    renderPreview(
      <LessonFlashcardGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.SENTENCE}
      />,
    );
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    clickButton("buttons.showAnswer");
    clickButton("rating.good");
    clickButton("buttons.showAnswer");
    clickButton("rating.easy");

    await screen.findByText("complete.title");
    await waitFor(() =>
      expect(toastMock.info).toHaveBeenCalledWith("notSaved"),
    );
    expect(reviewCardMock).not.toHaveBeenCalled();
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(authRefreshMock).not.toHaveBeenCalled();
  });
});
