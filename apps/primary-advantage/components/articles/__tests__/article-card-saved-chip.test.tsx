// @vitest-environment jsdom
/** FR-11 (STU-16): the chip shows the state of the signed-in student, not of other users. */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => "en",
    getTranslations: async () => createTranslator({ locale: "en", messages: messages.en }),
  };
});
vi.mock("../article-content", () => ({ default: () => <div /> }));

import ArticleCard from "../article-card";
import type { Article } from "@/types";

const en = testMessages.en as { Article: { saveToFlashcard: string; notSaved: string } };
const article = { id: "a1", title: "T", summary: "S", cefrLevel: "A1", articleActivityLog: [] } as unknown as Article & {
  articleActivityLog: unknown[];
};

describe("ArticleCard saved chip", () => {
  it("shows Not saved when another user saved the article and this student did not", async () => {
    const withOtherLog = { ...article, articleActivityLog: [{ userId: "other", isSentenceAndWordsSaved: true }] };
    render(await ArticleCard({ article: withOtherLog as never, saved: false }));
    expect(screen.getByTestId("saved-chip")).toHaveTextContent(en.Article.notSaved);
    expect(screen.getByTestId("saved-chip")).toHaveAttribute("data-saved", "false");
  });

  it("shows Saved for the student's own saved state", async () => {
    render(await ArticleCard({ article: article as never, saved: true }));
    expect(screen.getByTestId("saved-chip")).toHaveTextContent(en.Article.saveToFlashcard);
    expect(screen.getByTestId("saved-chip")).toHaveAttribute("data-saved", "true");
  });

  it("shows Not saved when no state is given", async () => {
    render(await ArticleCard({ article: article as never }));
    expect(screen.getByTestId("saved-chip")).toHaveAttribute("data-saved", "false");
  });
});
