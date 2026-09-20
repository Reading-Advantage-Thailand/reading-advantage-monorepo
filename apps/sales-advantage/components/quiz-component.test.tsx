import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizComponent } from "./quiz-component";

const mutationState = vi.hoisted(() => ({
  mutate: vi.fn(),
  onSuccess: null as
    | ((data: {
        lessonId: string;
        score: number;
        passed: boolean;
        results: Array<{
          questionId: string;
          correct: boolean;
          explanation: string;
        }>;
      }) => void)
    | null,
  onError: null as (() => void) | null,
  isPending: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    sales: {
      submitQuiz: {
        useMutation: (options: {
          onSuccess: typeof mutationState.onSuccess;
          onError: typeof mutationState.onError;
        }) => {
          mutationState.onSuccess = options.onSuccess;
          mutationState.onError = options.onError;
          return { mutate: mutationState.mutate, isPending: mutationState.isPending };
        },
      },
    },
  },
}));

describe("QuizComponent", () => {
  beforeEach(() => {
    mutationState.mutate.mockReset();
    mutationState.onSuccess = null;
    mutationState.onError = null;
    mutationState.isPending = false;
  });

  it("submits selected answers and renders server-returned grading feedback", () => {
    render(
      <QuizComponent
        lessonId="lesson-1"
        questions={[
          {
            id: "question-1",
            question: "What should the rep ask first?",
            optionsJson: ["A discovery question", "A pricing question"],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("A discovery question"));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(mutationState.mutate).toHaveBeenCalledWith({
      lessonId: "lesson-1",
      answers: { "question-1": "A discovery question" },
    });

    act(() => {
      mutationState.onSuccess?.({
        lessonId: "lesson-1",
        score: 100,
        passed: true,
        results: [
          {
            questionId: "question-1",
            correct: true,
            explanation: "Discovery comes before presenting a solution.",
          },
        ],
      });
    });

    expect(screen.getByText("100%")).toBeTruthy();
    expect(
      screen.getByText("Discovery comes before presenting a solution."),
    ).toBeTruthy();
  });

  it("renders an alert when the quiz submission fails", () => {
    render(
      <QuizComponent
        lessonId="lesson-1"
        questions={[
          {
            id: "question-1",
            question: "What should the rep ask first?",
            optionsJson: ["A discovery question", "A pricing question"],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("A discovery question"));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      mutationState.onError?.();
    });

    expect(screen.getByRole("alert").textContent).toContain("submitFailed");
    const submitButton = screen.getByRole("button", {
      name: "submit",
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });

  it("disables the submit button while the mutation is pending", () => {
    mutationState.isPending = true;

    render(
      <QuizComponent
        lessonId="lesson-1"
        questions={[
          {
            id: "question-1",
            question: "What should the rep ask first?",
            optionsJson: ["A discovery question", "A pricing question"],
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByLabelText("A discovery question"));

    const submitButton = screen.getByRole("button", {
      name: "submit",
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });
});
