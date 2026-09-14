// @vitest-environment jsdom
/**
 * Behavioral replacement for `authoritative-session-refresh.test.ts`.
 *
 * Each completion flow renders the real component with a mocked
 * `@reading-advantage/auth-client` session and asserts the authoritative
 * `refresh()` spy fires when the flow finishes. No source-text assertions.
 *
 * Coverage map (11 static rows):
 * - lesson-sentence-cloze-test, lesson-flashcard-game, lesson-matching-game,
 *   lesson-sentence-order-word: already covered by the merge-characterization
 *   completion tests (each asserts `authRefreshMock` after finishing), so
 *   those rows are deleted without duplication.
 * - The seven flows below had no behavioral refresh coverage and are
 *   exercised here.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Rating } from "ts-fsrs";

import type { Article } from "@/types";
import { ActivityType } from "@/types/enum";

const mocks = vi.hoisted(() => ({
  authRefresh: vi.fn(),
  finishQuiz: vi.fn(),
  getFeedback: vi.fn(),
  retakeQuiz: vi.fn(),
  getLessonSummaryData: vi.fn(),
  updateUserActivity: vi.fn(),
  reviewCard: vi.fn(),
  getLessonFlashcards: vi.fn(),
  getLessonOrderingSentences: vi.fn(),
  fetch: vi.fn(),
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
  useAuth: () => ({ user: { id: "user-1" }, refresh: mocks.authRefresh }),
  useSession: () => ({ user: { id: "user-1", level: 5 } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/actions/question", () => ({
  finishQuiz: (...args: unknown[]) => mocks.finishQuiz(...args),
  getFeedback: (...args: unknown[]) => mocks.getFeedback(...args),
  retakeQuiz: (...args: unknown[]) => mocks.retakeQuiz(...args),
}));

vi.mock("@/actions/article", () => ({
  getLessonSummaryData: (...args: unknown[]) =>
    mocks.getLessonSummaryData(...args),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: (...args: unknown[]) =>
    mocks.updateUserActivity(...args),
}));

vi.mock("@/actions/flashcard", () => ({
  reviewCard: (...args: unknown[]) => mocks.reviewCard(...args),
  getLessonFlashcards: (...args: unknown[]) =>
    mocks.getLessonFlashcards(...args),
  getLessonOrderingSentences: (...args: unknown[]) =>
    mocks.getLessonOrderingSentences(...args),
}));

import { WrittenQuestionContent } from "../articles/questions/written-question-content";
import { MCQContent } from "../articles/questions/mc-question-content";
import LessonSAQ from "../lesson/practice/lesson-task-saq";
import TaskLessonSummary from "../lesson/task/task-lesson-summary";
import { MatchingGame } from "../practice/matching-game";
import { FlashcardGameInline } from "../flashcards/flashcard-game";
import { OrderSentenceGame } from "../lesson/games/lesson-sentence-order";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authRefresh.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", mocks.fetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("completion flows refresh the authoritative session", () => {
  it("written short-answer finish calls refresh", async () => {
    mocks.getFeedback.mockResolvedValue({ feedback: "Nice work", score: 8 });
    mocks.finishQuiz.mockResolvedValue({ success: true });

    render(
      <WrittenQuestionContent
        kind="sa"
        articleId="article-1"
        questions={{
          id: "q1",
          question: "Why?",
          articleId: "article-1",
          answer: "Because.",
        }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "My answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submitButton" }));

    fireEvent.click(
      await screen.findByRole("button", { name: "closeButton" }),
    );

    await waitFor(() =>
      expect(mocks.finishQuiz).toHaveBeenCalledWith(
        "article-1",
        expect.anything(),
        ActivityType.SA_QUESTION,
      ),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("lesson multiple-choice finish calls refresh", async () => {
    mocks.finishQuiz.mockResolvedValue({ success: true });
    const article = {
      id: "article-1",
      multipleChoiceQuestions: [0, 1, 2, 3, 4].map((i) => ({
        id: `q${i}`,
        question: `Q${i}?`,
        articleId: "article-1",
        options: ["Right", "WrongA", "WrongB"],
        answer: "Right",
      })),
    } as unknown as Article;

    render(<MCQContent mode="lesson" article={article} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.click(await screen.findByRole("button", { name: /Right/ }));
      fireEvent.click(
        screen.getByRole("button", {
          name: i === 4 ? "actions.finishQuiz" : "actions.nextQuestion",
        }),
      );
    }

    await waitFor(() =>
      expect(mocks.finishQuiz).toHaveBeenCalledWith(
        "article-1",
        expect.anything(),
        ActivityType.MC_QUESTION,
      ),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("lesson short-answer submit calls refresh", async () => {
    mocks.getFeedback.mockResolvedValue({ feedback: "Good", score: 7 });
    mocks.finishQuiz.mockResolvedValue({ success: true });

    render(
      <LessonSAQ
        article={
          {
            id: "article-1",
            shortAnswerQuestions: [
              {
                id: "s1",
                question: "Explain.",
                articleId: "article-1",
                answer: "Because.",
              },
            ],
          } as unknown as Article
        }
      />,
    );

    fireEvent.change(
      await screen.findByPlaceholderText("form.placeholder.answer"),
      { target: { value: "My detailed answer" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "actions.submit" }));

    await waitFor(() => expect(mocks.finishQuiz).toHaveBeenCalled());
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("lesson summary load calls refresh", async () => {
    mocks.getLessonSummaryData.mockResolvedValue({
      data: { totalXp: 42, quizScores: { mcqScore: 3, saqScore: 2 } },
    });

    render(
      <TaskLessonSummary
        article={
          { id: "article-1", sentencsAndWordsForFlashcard: [] } as unknown as Article
        }
        timerSpent={60}
      />,
    );

    await waitFor(() =>
      expect(mocks.getLessonSummaryData).toHaveBeenCalledWith("article-1"),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("practice matching-game finish calls refresh", async () => {
    const pair = {
      id: "p1",
      left: { id: "l1", content: "Cat", type: "word" },
      right: { id: "r1", content: "แมว", type: "translation" },
      articleId: "a1",
      articleTitle: "T",
    };
    mocks.fetch.mockImplementation(async (input: unknown) => {
      if (String(input).includes("sentences-for-matching?language")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            matchingGames: [{ id: "g1", pairs: [pair], language: "th" }],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    // The mount effect overwrites the gameData prop with deck-derived pairs,
    // so the deck path (the production usage) drives this flow.
    render(<MatchingGame deckId="deck-1" />);

    await waitFor(() => {
      const pairButton = screen.queryByRole("button", { name: /Cat/ });
      if (!pairButton) {
        fireEvent.click(
          screen.getByRole("button", { name: "startScreen.startButton" }),
        );
        throw new Error("game not started yet");
      }
    });

    fireEvent.click(screen.getByRole("button", { name: /Cat/ }));
    fireEvent.click(screen.getByRole("button", { name: /แมว/ }));
    // A correct full match auto-completes; the manual check is a fallback.
    const checkButton = screen.queryByRole("button", {
      name: "buttons.checkMatches",
    });
    if (checkButton) {
      fireEvent.click(checkButton);
    }
    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/flashcard/decks/deck-1/sentences-for-matching",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("flashcard review completion calls refresh", async () => {
    mocks.reviewCard.mockResolvedValue({ success: true });

    render(
      <FlashcardGameInline
        deck={{ id: "d1", name: "Deck", type: "VOCABULARY" }}
        cards={[{ id: "c1", word: "cat", definition: { th: "แมว" } }]}
        onComplete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "flipCard" }));
    fireEvent.click(await screen.findByRole("button", { name: "good" }));

    await waitFor(() =>
      expect(mocks.reviewCard).toHaveBeenCalledWith("c1", Rating.Good),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });

  it("deck sentence-order finish calls refresh", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sentenceGroups: [] }),
    });

    render(
      <OrderSentenceGame
        source="deck"
        deckId="deck-1"
        sentences={[
          {
            id: "g1",
            articleId: "a1",
            articleTitle: "T",
            flashcardSentence: "First second",
            correctOrder: ["First", "second"],
            sentences: [
              { id: "s1", text: "First" },
              { id: "s2", text: "second" },
            ],
            difficulty: "easy",
            startIndex: 0,
            flashcardIndex: 0,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "startGame" }));

    const items = await screen.findAllByRole("button", {
      name: "reorderAriaLabel",
    });
    expect(items).toHaveLength(2);
    if (items[0].textContent?.includes("second")) {
      fireEvent.keyDown(items[0], { key: "ArrowDown" });
    }

    // Arranging the correct order auto-completes; the manual check covers
    // the already-correct shuffle.
    const checkButton = screen.queryByRole("button", { name: "checkAnswer" });
    if (checkButton) {
      fireEvent.click(checkButton);
    }
    fireEvent.click(
      await screen.findByRole("button", { name: "finishGame" }),
    );

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/flashcard/decks/deck-1/sentences-for-ordering",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(mocks.authRefresh).toHaveBeenCalled());
  });
});
