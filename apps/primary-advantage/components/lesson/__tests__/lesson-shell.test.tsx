// @vitest-environment jsdom
/** Lesson flow shell (FR-5, audit S3): rail before the task on phones, save errors with a retry. */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { QuizContextProvider } from "@/contexts/question-context";

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

/**
 * Builds a progress response that lands on one task (14 tasks share 100 %).
 * @param task The task number.
 */
function progressFor(task: number) {
  // The API stores Math.round(task / 14 * 100), like the lesson POST.
  return { ok: true, json: async () => ({ userLessonProgress: { progress: Math.round((task / 14) * 100), timeSpent: 0 } }) };
}

/**
 * Renders the lesson shell inside the quiz and message providers.
 * @param maxUnlockedStep The workbook-first lock, when the class book has one.
 */
function renderShell(maxUnlockedStep: number | null = null) {
  return renderWithMessages(
    withMessages(
      <QuizContextProvider>
        <LessonProgressBar source="article" article={article} maxUnlockedStep={maxUnlockedStep} />
      </QuizContextProvider>,
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

describe("lesson shell", () => {
  it("puts the step rail before the task content, so phones see it first", async () => {
    fetchMock.mockResolvedValue(progressFor(3));
    renderShell();
    const task = await screen.findByText("reading");
    const bar = screen.getByRole("progressbar");
    expect(bar.compareDocumentPosition(task) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar).toHaveAttribute("aria-valuenow", "3");
  });

  it("shows an error with a retry when the next step cannot be saved, and the retry moves on", async () => {
    fetchMock.mockResolvedValueOnce(progressFor(3)).mockResolvedValueOnce({ ok: false, status: 500, statusText: "x" });
    renderShell();
    await screen.findByText("reading");
    const next = screen.getByRole("button", { name: en.actions.nextTask });
    expect(next).toHaveClass("min-h-12");
    fireEvent.click(next);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en.saveError);
    expect(screen.getByText("reading")).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce({ ok: true });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    fireEvent.click(screen.getByRole("button", { name: testMessages.en.Error.retry }));
    expect(await screen.findByText("vocab-collection")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("keeps a step the class has not opened locked and says so (workbook first)", async () => {
    fetchMock.mockResolvedValue(progressFor(3));
    renderShell(3);
    await screen.findByText("reading");
    fireEvent.click(screen.getByRole("button", { name: en.actions.nextTask }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your teacher opens step 4 in class.");
    expect(screen.getByText("reading")).toBeInTheDocument();
    // only the initial progress read: no save was attempted
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves on when the class has opened the next step", async () => {
    fetchMock.mockResolvedValueOnce(progressFor(3)).mockResolvedValueOnce({ ok: true });
    renderShell(4);
    await screen.findByText("reading");
    fireEvent.click(screen.getByRole("button", { name: en.actions.nextTask }));
    expect(await screen.findByText("vocab-collection")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
