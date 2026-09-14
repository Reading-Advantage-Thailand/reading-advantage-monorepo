// @vitest-environment jsdom
// Characterization tests written before the written-question merge. They pin
// the current behavior of both kinds behind WrittenQuestionContent: the long
// answer view (former la-question-content) and the short answer view (former
// sa-question-content). The merge must keep these green.
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityType } from "@/types/enum";

const {
  getFeedbackMock,
  finishQuizMock,
  toastMock,
  useAuthRefreshMock,
} = vi.hoisted(() => ({
  getFeedbackMock: vi.fn(),
  finishQuizMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  useAuthRefreshMock: vi.fn(),
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
  useAuth: () => ({
    user: { id: "user-1" },
    refresh: useAuthRefreshMock,
  }),
  // Level 1 drives the long-answer minimum of 1 * 30 characters.
  useSession: () => ({ user: { id: "user-1", level: 1 } }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/question", () => ({
  getFeedback: getFeedbackMock,
  finishQuiz: finishQuizMock,
}));

vi.mock("@/components/icons", () => ({
  Icons: { spinner: () => null },
}));

import WrittenQuestionContent from "../written-question-content";

const ARTICLE_ID = "article-1";

const LA_QUESTION = {
  id: "la-1",
  articleId: ARTICLE_ID,
  question: "Why did the robot help the children?",
};

const LA_FEEDBACK = {
  detailedFeedback: {
    vocabularyUse: {
      areasForImprovement: "Use simpler words.",
      examples: "Sentence two is long.",
      strengths: "The idea is clear.",
      suggestions: "Add one detail.",
    },
  },
  scores: { vocabularyUse: 4 },
  overallImpression: "A strong first answer.",
  exampleRevisions: "The robot helped because it was kind.",
  nextSteps: ["Add a second reason."],
};

const SA_QUESTION = {
  id: "sa-1",
  articleId: ARTICLE_ID,
  question: "What did the cat chase?",
  answer: "The cat chased the mouse.",
};

const SA_FEEDBACK = { score: 8, feedback: "One clear sentence." };

const VALID_LA_ANSWER = "The robot helped the children because it was kind.";

beforeEach(() => {
  vi.clearAllMocks();
  getFeedbackMock.mockResolvedValue(LA_FEEDBACK);
  finishQuizMock.mockResolvedValue({ success: true });
  useAuthRefreshMock.mockResolvedValue(undefined);
});

describe("long answer kind (characterization)", () => {
  function renderLa() {
    return render(
      <WrittenQuestionContent
        kind="la"
        articleId={ARTICLE_ID}
        questions={LA_QUESTION}
      />,
    );
  }

  it("renders the question text and a textarea answer affordance", () => {
    renderLa();

    expect(screen.getByText("LAQuestion.title")).toBeInTheDocument();
    expect(
      screen.getByText("Why did the robot help the children?"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type your answer here..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "getFeedback" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "submitButton" })).toBeDisabled();
  });

  it("typing updates the answer state", () => {
    renderLa();
    const textarea = screen.getByPlaceholderText("Type your answer here...");

    fireEvent.change(textarea, { target: { value: "A partial answer." } });

    expect(textarea).toHaveValue("A partial answer.");
  });

  it("rejects an answer below the level minimum and skips the feedback call", async () => {
    renderLa();
    fireEvent.change(screen.getByPlaceholderText("Type your answer here..."), {
      target: { value: "Too short." },
    });

    fireEvent.click(screen.getByRole("button", { name: "getFeedback" }));

    expect(
      await screen.findByText("Please Enter minimum 30 character..."),
    ).toBeInTheDocument();
    expect(getFeedbackMock).not.toHaveBeenCalled();
  });

  it("submits a valid answer, calls getFeedback, and shows feedback in the modal", async () => {
    renderLa();
    fireEvent.change(screen.getByPlaceholderText("Type your answer here..."), {
      target: { value: VALID_LA_ANSWER },
    });

    fireEvent.click(screen.getByRole("button", { name: "getFeedback" }));

    await screen.findByText("A strong first answer.");
    expect(getFeedbackMock).toHaveBeenCalledWith({
      data: {
        articleId: ARTICLE_ID,
        question: LA_QUESTION.question,
        answer: VALID_LA_ANSWER,
        preferredLanguage: "English",
      },
      activityType: ActivityType.LA_QUESTION,
    });
    expect(screen.getByText("Feedback and your score")).toBeInTheDocument();
    expect(
      screen.getByText("The robot helped because it was kind."),
    ).toBeInTheDocument();
  });
});

describe("short answer kind (characterization)", () => {
  function renderSa() {
    return render(
      <WrittenQuestionContent
        kind="sa"
        articleId={ARTICLE_ID}
        questions={SA_QUESTION}
      />,
    );
  }

  it("renders the question text and an input answer affordance", () => {
    const { container } = renderSa();

    expect(screen.getByText("SAQuestion.title")).toBeInTheDocument();
    expect(
      screen.getByText("What did the cat chase?"),
    ).toBeInTheDocument();
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(screen.getByRole("button", { name: "submitButton" })).toBeEnabled();
  });

  it("typing updates the answer state", () => {
    const { container } = renderSa();
    const input = container.querySelector("input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "The cat chased a mouse." } });

    expect(input).toHaveValue("The cat chased a mouse.");
  });

  it("rejects an empty answer and skips the feedback call", async () => {
    renderSa();

    fireEvent.click(screen.getByRole("button", { name: "submitButton" }));

    expect(await screen.findByText("SAQuestion.anwserError")).toBeInTheDocument();
    expect(getFeedbackMock).not.toHaveBeenCalled();
  });

  it("submits, shows feedback, and finishing the quiz reports the score", async () => {
    renderSa();
    getFeedbackMock.mockResolvedValue(SA_FEEDBACK);
    const input = document.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "The cat chased a mouse." } });

    fireEvent.click(screen.getByRole("button", { name: "submitButton" }));

    await screen.findByText("One clear sentence.");
    expect(getFeedbackMock).toHaveBeenCalledWith({
      data: {
        articleId: ARTICLE_ID,
        question: SA_QUESTION.question,
        suggestedResponse: SA_QUESTION.answer,
        answer: "The cat chased a mouse.",
        preferredLanguage: "en",
      },
      activityType: ActivityType.SA_QUESTION,
    });
    expect(screen.getByText("The cat chased the mouse.")).toBeInTheDocument();
    expect(screen.getByText("SAQuestion.score")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "closeButton" }));

    await waitFor(() => expect(finishQuizMock).toHaveBeenCalled());
    expect(finishQuizMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      expect.objectContaining({
        score: 8,
        feedback: "One clear sentence.",
        question: SA_QUESTION.question,
        suggestedAnswer: SA_QUESTION.answer,
        yourAnswer: "The cat chased a mouse.",
        timer: 0,
      }),
      ActivityType.SA_QUESTION,
    );
    expect(toastMock.success).toHaveBeenCalled();
    expect(useAuthRefreshMock).toHaveBeenCalled();
  });
});
