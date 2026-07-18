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
        }) => {
          mutationState.onSuccess = options.onSuccess;
          return { mutate: mutationState.mutate, isPending: false };
        },
      },
    },
  },
}));

describe("QuizComponent", () => {
  beforeEach(() => {
    mutationState.mutate.mockReset();
    mutationState.onSuccess = null;
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
});
