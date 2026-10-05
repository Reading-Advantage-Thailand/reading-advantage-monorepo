// @vitest-environment jsdom
/**
 * Audit S2: a question card with no questions, or a failed question load, shows its own
 * state inside the card. It never throws to the error boundary that replaces the article.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import { QuestionState } from "@/types/enum";

const mocks = vi.hoisted(() => ({ load: vi.fn(), refresh: vi.fn() }));

vi.mock("@/server/models/articleModel", () => ({ getQuestionsByArticleId: mocks.load }));
vi.mock("@/actions/question", () => ({ retakeQuiz: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }) }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }),
  };
});

import MCQuestionCard from "../mc-question-card";
import SAQuestionCard from "../sa-question-card";
import LAQuestionCard from "../la-question-card";

const cards = [
  { name: "MC", Card: MCQuestionCard, title: testMessages.en.Question.MCQuestion.title },
  { name: "SA", Card: SAQuestionCard, title: testMessages.en.Question.SAQuestion.title },
  { name: "LA", Card: LAQuestionCard, title: testMessages.en.Question.LAQuestion.title },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(cleanup);

describe.each(cards)("$name question card", ({ Card, title }) => {
  it("shows a short note when the article has no questions of this type", async () => {
    mocks.load.mockResolvedValue({ questions: [], result: { details: { timer: 0 }, completed: false }, questionStatus: QuestionState.EMPTY });
    renderWithMessages((await Card({ articleId: "a1" })) as React.ReactElement);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(testMessages.en.Question.descriptionEmpty)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error with a retry inside the card when the questions fail to load", async () => {
    mocks.load.mockRejectedValue(new Error("db down"));
    renderWithMessages((await Card({ articleId: "a1" })) as React.ReactElement);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(testMessages.en.Question.descriptionError);
    fireEvent.click(within(alert).getByRole("button", { name: testMessages.en.Error.retry }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
