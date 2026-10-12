// @vitest-environment jsdom
/** The lesson game steps get save=false in Preview mode (rehearsal, staff view) and save=true for a student. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { QuizContext } from "@/contexts/question-context";
import { StudentViewProvider } from "@/components/student/student-view-provider";

vi.mock("@/actions/flashcard", () => ({ saveArticleToFlashcard: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../task", () => {
  const stub = (name: string) =>
    function TaskStub() {
      return <div data-testid="task">{name}</div>;
    };
  const game = (name: string) =>
    function GameStub({ save }: { save?: boolean }) {
      return <div data-testid="task">{`${name}:${String(save)}`}</div>;
    };
  return {
    TaskIntroduction: stub("intro"),
    TaskCollection: stub("collection"),
    TaskVocabularyCollection: stub("vocab-collection"),
    TaskReading: stub("reading"),
    TaskMultipleChoice: stub("mc"),
    TaskShortAnswer: stub("sa"),
    TaskVocabularyFlashcards: stub("vocab-cards"),
    TaskVocabularyGame: game("vocab-game"),
    TaskSentenceFlashcards: stub("sentence-cards"),
    TaskSentenceActivities: game("sentence-activities"),
    TaskLanguageQuestions: stub("language"),
    TaskLessonSummary: stub("summary"),
  };
});

import LessonProgressBar from "../lesson-progress-bar";

const article = { id: "article-1", title: "A Test Story" } as never;
const assignment = { id: "assignment-1", articleId: "article-1", article } as never;
const fetchMock = vi.fn();

/**
 * Renders a lesson at a stored progress in the given view mode.
 * @param mode The student view mode.
 * @param progress The stored percent that the progress route returns.
 */
function renderAt(mode: "preview" | "student", progress: number) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ userLessonProgress: { progress, timeSpent: 5 } }) });
  return renderWithMessages(
    withMessages(
      <StudentViewProvider mode={mode}>
        <QuizContext.Provider value={{ timer: 5, setPaused: vi.fn(), setTimer: vi.fn() }}>
          <LessonProgressBar source="assignment" assignment={assignment} />
        </QuizContext.Provider>
      </StudentViewProvider>,
      "en",
    ),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("lesson game save switch", () => {
  it("saves the vocabulary game run of a student (task 10)", async () => {
    renderAt("student", 71);
    expect(await screen.findByText("vocab-game:true")).toBeInTheDocument();
  });

  it("saves the sentence activity run of a student (task 12)", async () => {
    renderAt("student", 86);
    expect(await screen.findByText("sentence-activities:true")).toBeInTheDocument();
  });

  it("the preview mode runs both game steps with save=false", async () => {
    renderAt("preview", 0);
    const en = testMessages.en.Lesson;
    fireEvent.click(await screen.findByRole("button", { name: en.actions.startLesson }));
    for (const wanted of ["vocab-game:false", "sentence-activities:false"]) {
      for (let i = 0; i < 12 && !screen.queryByText(wanted); i += 1) {
        const next = await screen.findByRole("button", { name: en.actions.nextTask }, { timeout: 5000 });
        await waitFor(() => expect(next).toBeEnabled(), { timeout: 5000 });
        fireEvent.click(next);
        await new Promise((r) => setTimeout(r, 1500));
      }
      expect(await screen.findByText(wanted, {}, { timeout: 3000 })).toBeInTheDocument();
    }
  }, 120000);
});
