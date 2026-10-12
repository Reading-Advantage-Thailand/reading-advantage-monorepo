// @vitest-environment jsdom
/** Lesson task 8 shows the saved short answer again (FR-7, STU-17). */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";

// The task wraps itself in its own quiz provider; a passthrough lets the test see the pause call.
vi.mock("@/contexts/question-context", async () => {
  const { createContext } = await import("react");
  const QuizContext = createContext({ timer: 3, setPaused: (_: boolean) => {}, setTimer: () => {} });
  return { QuizContext, QuizContextProvider: ({ children }: { children: React.ReactNode }) => children };
});
vi.mock("@/actions/question", () => ({ finishQuiz: vi.fn(), getFeedback: vi.fn() }));
vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ user: null, refresh: vi.fn() }) }));

import { QuizContext } from "@/contexts/question-context";
import LessonSAQ from "../lesson-task-saq";

const article = {
  id: "article-1",
  shortAnswerQuestions: [{ id: "q1", question: "Who is in the story?", answer: "A fox" }],
} as never;
const fetchMock = vi.fn();
const setPaused = vi.fn();

/**
 * Renders task 8 with a spy on the timer pause.
 */
function renderTask() {
  return renderWithMessages(
    withMessages(
      <QuizContext.Provider value={{ timer: 3, setPaused, setTimer: vi.fn() }}>
        <LessonSAQ article={article} />
      </QuizContext.Provider>,
      "en",
    ),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  setPaused.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("lesson task 8 saved answer", () => {
  it("shows the saved question, answer, suggested answer, feedback, and score, and pauses the timer", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        questionStatus: 2,
        result: {
          completed: true,
          details: { question: "Saved question?", yourAnswer: "My saved answer", suggestedAnswer: "The ideal answer", feedback: "Good work", score: 4 },
        },
      }),
    });
    renderTask();
    expect(await screen.findByText("Saved question?")).toBeInTheDocument();
    expect(screen.getByText("My saved answer")).toBeInTheDocument();
    expect(screen.getByText("The ideal answer")).toBeInTheDocument();
    expect(screen.getByText("Good work")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(setPaused).toHaveBeenCalledWith(true);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("questionType=SA_QUESTION"), { cache: "no-store" });
  });

  it("shows the empty form when the read fails", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    renderTask();
    expect(await screen.findByText("Who is in the story?")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(setPaused).not.toHaveBeenCalled();
  });

  it("shows the form for an INCOMPLETE response", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ questionStatus: 1 }) });
    renderTask();
    expect(await screen.findByText("Who is in the story?")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
