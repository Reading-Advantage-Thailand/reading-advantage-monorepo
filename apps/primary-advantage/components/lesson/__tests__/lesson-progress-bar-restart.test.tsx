// @vitest-environment jsdom
/** After "Start again" the lesson opens at task 1 with a fresh timer (S2). */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
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
    TaskLessonSummary: (props: { assignmentId?: string | null; attemptNumber?: number; onRestarted?: (n: number | null) => void }) => (
      <div>
        <span data-testid="summary">{`summary attempt ${props.attemptNumber ?? 1} assignment ${props.assignmentId ?? "none"}`}</span>
        <button onClick={() => props.onRestarted?.(2)}>restart-stub</button>
      </div>
    ),
  };
});

import LessonProgressBar from "../lesson-progress-bar";

const article = { id: "article-1", title: "A Test Story" } as never;
const assignment = { id: "assignment-1", articleId: "article-1", article } as never;
const fetchMock = vi.fn();
const setPaused = vi.fn();
const setTimer = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  setPaused.mockReset();
  setTimer.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ userLessonProgress: { progress: 100, timeSpent: 5 } }) });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("restart from the summary", () => {
  it("passes the assignment id and moves to task 1 with the timer reset", async () => {
    renderWithMessages(
      withMessages(
        <QuizContext.Provider value={{ timer: 5, setPaused, setTimer }}>
          <LessonProgressBar source="assignment" assignment={assignment} />
        </QuizContext.Provider>,
        "en",
      ),
    );
    expect(await screen.findByTestId("summary")).toHaveTextContent("summary attempt 1 assignment assignment-1");
    fireEvent.click(screen.getByRole("button", { name: "restart-stub" }));
    expect(await screen.findByText("intro")).toBeInTheDocument();
    expect(screen.queryByTestId("summary")).toBeNull();
    expect(setTimer).toHaveBeenLastCalledWith(0);
    expect(setPaused).toHaveBeenLastCalledWith(false);
  });
});
