// @vitest-environment jsdom
/** Lesson resume (FR-5, STU-02): the stored percent opens the saved task, never task 0 or an overshoot. */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { QuizContext } from "@/contexts/question-context";

vi.mock("@/actions/flashcard", () => ({ saveArticleToFlashcard: vi.fn() }));
vi.mock("../task", () => {
  const stub = (name: string) =>
    function TaskStub() {
      return <div data-testid="task">{name}</div>;
    };
  return {
    TaskIntroduction: stub("intro"),
    TaskCollection: stub("collection"),
    TaskVocabularyCollection: stub("vocab-collection"),
    TaskReading: stub("reading"),
    TaskMultipleChoice: stub("mc"),
    TaskShortAnswer: stub("sa"),
    TaskVocabularyFlashcards: stub("vocab-cards"),
    TaskVocabularyMatching: stub("vocab-matching"),
    TaskVocabularyGame: stub("vocab-game"),
    TaskSentenceFlashcards: stub("sentence-cards"),
    TaskSentenceActivities: stub("sentence-activities"),
    TaskLanguageQuestions: stub("language"),
    TaskLessonSummary: stub("summary"),
  };
});

import LessonProgressBar from "../lesson-progress-bar";

const en = testMessages.en.Lesson;
const article = { id: "article-1", title: "A Test Story" } as never;
const assignment = { id: "assignment-1", articleId: "article-1", article } as never;
const fetchMock = vi.fn();
const setPaused = vi.fn();

/**
 * Renders an assignment lesson with a stored progress value.
 * @param progress The stored percent that the progress route returns.
 */
function renderWith(progress: number) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ userLessonProgress: { progress, timeSpent: 5 } }) });
  return renderWithMessages(
    withMessages(
      <QuizContext.Provider value={{ timer: 5, setPaused, setTimer: vi.fn() }}>
        <LessonProgressBar source="assignment" assignment={assignment} />
      </QuizContext.Provider>,
      "en",
    ),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  setPaused.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("lesson resume", () => {
  it("opens task 13 with a Next button for a saved progress of 93", async () => {
    renderWith(93);
    expect(await screen.findByText("language")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.actions.nextTask })).toBeInTheDocument();
    expect(setPaused).not.toHaveBeenCalledWith(true);
  });

  it("opens the vocabulary game step at task 10, not the matching game", async () => {
    renderWith(71);
    expect(await screen.findByText("vocab-game")).toBeInTheDocument();
    expect(screen.queryByText("vocab-matching")).toBeNull();
  });

  it("opens task 1 with the start button for progress 0 on an assignment", async () => {
    renderWith(0);
    expect(await screen.findByText("intro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.actions.startLesson })).toBeInTheDocument();
  });

  it("opens the summary and pauses the timer for progress 100", async () => {
    renderWith(100);
    expect(await screen.findByText("summary")).toBeInTheDocument();
    expect(setPaused).toHaveBeenCalledWith(true);
  });
});
