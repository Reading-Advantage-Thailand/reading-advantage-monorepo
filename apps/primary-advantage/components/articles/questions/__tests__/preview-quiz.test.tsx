// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { finishQuizMock, retakeQuizMock, getFeedbackMock, toastMock } = vi.hoisted(() => ({
  finishQuizMock: vi.fn(),
  retakeQuizMock: vi.fn(),
  getFeedbackMock: vi.fn(),
  toastMock: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "en" }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "u1" }, refresh: vi.fn() }),
  useSession: () => ({ user: { id: "u1", level: 1 } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/actions/question", () => ({ getFeedback: getFeedbackMock, finishQuiz: finishQuizMock, retakeQuiz: retakeQuizMock }));
vi.mock("@/components/icons", () => ({ Icons: { spinner: () => null } }));

import { StudentViewProvider } from "@/components/student/student-view-provider";
import MCQContent from "../mc-question-content";
import WrittenQuestionContent from "../written-question-content";

const MCQ = [{ id: "q1", question: "What?", answer: "A", options: ["A", "B", "C", "D"], textualEvidence: "e" }];
const SA = { id: "sa-1", articleId: "a1", question: "What did the cat chase?", answer: "The mouse." };
const LA = { id: "la-1", articleId: "a1", question: "Why did the robot help?" };

const inMode = (mode: "preview" | "student", ui: React.ReactElement) => render(<StudentViewProvider mode={mode}>{ui}</StudentViewProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  finishQuizMock.mockResolvedValue({ success: true });
  getFeedbackMock.mockResolvedValue({ score: 8, feedback: "Good." });
});

describe("MCQ in preview", () => {
  const finish = async () => {
    fireEvent.click(await screen.findByText(/^\d\. A$/));
    fireEvent.click(screen.getByRole("button", { name: "finishButton" }));
  };

  it("shows the score with the not-saved note and does not call finishQuiz", async () => {
    inMode("preview", <MCQContent mode="article" articleId="a1" questions={MCQ as never} />);
    await finish();
    expect(await screen.findByText(/notSaved/)).toBeInTheDocument();
    expect(finishQuizMock).not.toHaveBeenCalled();
  });

  it("saves for a student as before", async () => {
    inMode("student", <MCQContent mode="article" articleId="a1" questions={MCQ as never} />);
    await finish();
    await waitFor(() => expect(finishQuizMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/notSaved/)).not.toBeInTheDocument();
  });
});

describe.each([
  ["SAQ", "sa", SA, "The cat chased a mouse."],
  ["LAQ", "la", LA, "The robot helped the children because it was kind."],
] as const)("%s in preview", (_label, kind, question, answer) => {
  const run = async () => {
    inMode("preview", <WrittenQuestionContent kind={kind} articleId="a1" questions={question as never} />);
    const field = (document.querySelector("textarea") ?? document.querySelector("input")) as HTMLInputElement;
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.click(screen.getByRole("button", { name: kind === "la" ? "getFeedback" : "submitButton" }));
    await waitFor(() => expect(getFeedbackMock).toHaveBeenCalled());
    if (kind === "la") {
      fireEvent.click(await screen.findByRole("button", { name: "reviseResponse" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "submitButton" })).toBeEnabled());
      fireEvent.click(screen.getByRole("button", { name: "submitButton" }));
      const getXp = await screen.findByRole("button", { name: "getXP" });
      await waitFor(() => expect(getXp).toBeEnabled());
      fireEvent.click(getXp);
    } else {
      fireEvent.click(await screen.findByRole("button", { name: "closeButton" }));
    }
  };

  it("does not call finishQuiz and shows the not-saved note", async () => {
    getFeedbackMock.mockResolvedValue(
      kind === "la"
        ? { detailedFeedback: {}, scores: {}, overallImpression: "ok", exampleRevisions: "x", nextSteps: [] }
        : { score: 8, feedback: "Good." },
    );
    await run();
    await waitFor(() => expect(toastMock.info.mock.calls.flat().join()).toContain("notSaved"));
    expect(finishQuizMock).not.toHaveBeenCalled();
  });
});
