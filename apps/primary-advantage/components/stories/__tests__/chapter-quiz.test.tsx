// @vitest-environment jsdom
/** Chapter quiz (STU-04 S5): MCQ submit and retake, written feedback and submit. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitMcq: vi.fn(),
  retake: vi.fn(),
  feedback: vi.fn(),
  submitWritten: vi.fn(),
  notSaved: vi.fn(),
  isPreview: false,
}));

vi.mock("@/actions/story-question", () => ({
  submitChapterMcq: (...args: unknown[]) => mocks.submitMcq(...args),
  retakeChapterMcq: (...args: unknown[]) => mocks.retake(...args),
  getChapterWrittenFeedback: (...args: unknown[]) => mocks.feedback(...args),
  submitChapterWritten: (...args: unknown[]) => mocks.submitWritten(...args),
}));
vi.mock("@/components/student/student-view-provider", () => ({
  usePreviewSave: () => ({ isPreview: mocks.isPreview, notSaved: mocks.notSaved }),
}));

import { ChapterQuiz } from "../chapter-quiz";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

const CHAPTER = "22222222-2222-4222-8222-222222222222";
const mcq = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  question: `Q${i + 1}?`,
  options: ["a", "b", "c", "d"],
}));
const initial = {
  chapterId: CHAPTER,
  mcq,
  saq: { id: "00000000-0000-4000-8000-000000000010", question: "Why?" },
  laq: { id: "00000000-0000-4000-8000-000000000011", question: "Tell the tale." },
  done: { mc: false, sa: false, la: false },
  mcScore: null,
};

/** Picks option "b" for every MCQ. */
function answerAll() {
  mcq.forEach((q, i) => {
    const group = screen.getByRole("group", { name: new RegExp(`^${i + 1}\\.`) });
    fireEvent.click(within(group).getByRole("radio", { name: "b" }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isPreview = false;
});
afterEach(cleanup);

describe("chapter MCQ", () => {
  it("submits 5 answers and shows the score, the XP, and the correct answers", async () => {
    mocks.submitMcq.mockResolvedValue({
      success: true,
      score: 4,
      total: 5,
      xpEarned: 8,
      results: mcq.map((q, i) => ({
        questionId: q.id,
        question: q.question,
        answer: "b",
        correct: i < 4,
        correctAnswer: "b",
        textualEvidence: null,
      })),
    });
    renderWithMessages(<ChapterQuiz chapterId={CHAPTER} userLevel={5} initial={initial} />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(mocks.submitMcq).toHaveBeenCalledWith(
      CHAPTER,
      mcq.map((q) => ({ questionId: q.id, answer: "b" })),
    );
    expect(await screen.findByText("+8 XP")).toBeInTheDocument();
    expect(screen.getByText("Done: 4 of 5")).toBeInTheDocument();
  });

  it("shows the done state with a retake, and the retake practices with no XP", async () => {
    mocks.retake.mockResolvedValue({
      success: true,
      mcq: mcq.map((q) => ({ ...q, question: `${q.question} (new)` })),
      xpAvailable: false,
    });
    renderWithMessages(
      <ChapterQuiz chapterId={CHAPTER} userLevel={5} initial={{ ...initial, done: { mc: true, sa: false, la: false }, mcScore: 3 }} />,
    );
    expect(screen.getByText("Done: 3 of 5")).toBeInTheDocument();
    expect(screen.getByText("Practice only: no XP left for this chapter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    expect(await screen.findByText("Answer all 5 questions.")).toBeInTheDocument();
    expect(mocks.retake).toHaveBeenCalledWith(CHAPTER);
  });
});

describe("chapter written questions", () => {
  it("asks for feedback, then submits the SAQ and shows the XP", async () => {
    mocks.feedback.mockResolvedValue({ success: true, feedback: "Good.", score: 4 });
    mocks.submitWritten.mockResolvedValue({ success: true, xpEarned: 4, question: "Why?" });
    renderWithMessages(<ChapterQuiz chapterId={CHAPTER} userLevel={5} initial={initial} />);
    const panel = screen.getByRole("region", { name: "Short answer" });
    fireEvent.change(within(panel).getByLabelText("Your answer"), { target: { value: "Because." } });
    expect(within(panel).getByRole("button", { name: "Submit answer" })).toBeDisabled();
    fireEvent.click(within(panel).getByRole("button", { name: "Get feedback" }));
    expect(await within(panel).findByText("Good.")).toBeInTheDocument();
    expect(within(panel).getByText(/Score: 4/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Submit answer" }));
    expect(mocks.submitWritten).toHaveBeenCalledWith(CHAPTER, "sa", initial.saq.id, "Because.", 4);
    expect(await within(panel).findByText("+4 XP")).toBeInTheDocument();
  });

  it("refuses LAQ feedback under level x 30 characters and caps tries at 2", async () => {
    mocks.feedback.mockResolvedValue({ success: true, feedback: "Fine.", score: 18 });
    renderWithMessages(<ChapterQuiz chapterId={CHAPTER} userLevel={5} initial={initial} />);
    const panel = screen.getByRole("region", { name: "Long answer" });
    expect(within(panel).getByText(/Write at least 150 characters/)).toBeInTheDocument();
    const box = within(panel).getByLabelText("Your answer");
    fireEvent.change(box, { target: { value: "short" } });
    expect(within(panel).getByRole("button", { name: "Get feedback" })).toBeDisabled();
    fireEvent.change(box, { target: { value: "x".repeat(150) } });
    const button = within(panel).getByRole("button", { name: "Get feedback" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    await within(panel).findByText("Fine.");
    fireEvent.click(within(panel).getByRole("button", { name: "Get feedback" }));
    await within(panel).findByText(/0 tries left/);
    expect(within(panel).getByRole("button", { name: "Get feedback" })).toBeDisabled();
    expect(mocks.feedback).toHaveBeenCalledTimes(2);
  });

  it("shows the done mark for finished written questions", async () => {
    renderWithMessages(
      <ChapterQuiz chapterId={CHAPTER} userLevel={5} initial={{ ...initial, done: { mc: false, sa: true, la: true } }} />,
    );
    expect(screen.getByRole("region", { name: "Short answer" })).toHaveTextContent("Done");
    expect(screen.queryByLabelText("Your answer")).toBeNull();
  });
});
