// @vitest-environment jsdom
/** Lesson in Preview mode: the progress bar and the step moves call no write path and read no progress row. */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { QuizContext } from "@/contexts/question-context";
import { StudentViewProvider } from "@/components/student/student-view-provider";

const { saveArticleToFlashcardMock } = vi.hoisted(() => ({ saveArticleToFlashcardMock: vi.fn() }));
vi.mock("@/actions/flashcard", () => ({ saveArticleToFlashcard: (...a: unknown[]) => saveArticleToFlashcardMock(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
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
    TaskSentenceFlashcards: stub("sentence-cards"),
    TaskSentenceActivities: stub("sentence-activities"),
    TaskLanguageQuestions: stub("language"),
    TaskLessonSummary: stub("summary"),
  };
});

import LessonProgressBar from "../lesson-progress-bar";

const en = testMessages.en.Lesson;
const article = { id: "article-1", title: "A Test Story" } as never;
const fetchMock = vi.fn();

function renderIn(mode: "preview" | "student") {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ userLessonProgress: { progress: 0, timeSpent: 0 } }) });
  return renderWithMessages(
    withMessages(
      <StudentViewProvider mode={mode}>
        <QuizContext.Provider value={{ timer: 5, setPaused: vi.fn(), setTimer: vi.fn() }}>
          <LessonProgressBar source="standalone" article={article} />
        </QuizContext.Provider>
      </StudentViewProvider>,
      "en",
    ),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  saveArticleToFlashcardMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("lesson progress bar in preview", () => {
  it("reads no progress row, writes no progress, and moves on locally", async () => {
    renderIn("preview");
    fireEvent.click(await screen.findByRole("button", { name: en.actions.startLesson }));
    await waitFor(() => expect(screen.getByText("collection")).toBeInTheDocument(), { timeout: 3000 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveArticleToFlashcardMock).not.toHaveBeenCalled();
  });

  it("saves the progress for a student", async () => {
    renderIn("student");
    fireEvent.click(await screen.findByRole("button", { name: en.actions.startLesson }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true), { timeout: 3000 });
  });
});
