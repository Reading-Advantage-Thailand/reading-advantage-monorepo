// @vitest-environment jsdom
/** Article view (audit S2): the article and its tools render; a missing article is an empty state. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  getArticleById: vi.fn(),
  saveArticleToFlashcard: vi.fn(),
  user: { id: "s1", role: "STUDENT" } as Record<string, unknown> | null,
}));

vi.mock("@/server/models/articleModel", async () => {
  class ArticleNotFoundError extends Error {}
  return { getArticleById: mocks.getArticleById, ArticleNotFoundError };
});
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@/actions/flashcard", () => ({ saveArticleToFlashcard: mocks.saveArticleToFlashcard }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/articles/article-card", () => ({ default: () => <article data-testid="article-card" /> }));
vi.mock("@/components/articles/word-list", () => ({ default: () => <div data-testid="word-list" /> }));
vi.mock("@/components/articles/sentence", () => ({ default: () => <div data-testid="sentences" /> }));
vi.mock("@/components/teacher/assign-button", () => ({ default: () => <div data-testid="assign" /> }));
vi.mock("@/components/articles/questions/mc-question-card", () => ({ default: () => <div data-testid="mc" /> }));
vi.mock("@/components/articles/questions/sa-question-card", () => ({ default: () => <div data-testid="sa" /> }));
vi.mock("@/components/articles/questions/la-question-card", () => ({ default: () => <div data-testid="la" /> }));

import ArticleQuizPage from "../page";
import { ArticleNotFoundError } from "@/server/models/articleModel";

const en = testMessages.en;
const params = Promise.resolve({ locale: "en", articleId: "a1" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getArticleById.mockResolvedValue({
    article: { id: "a1", title: "The Moon", summary: "", sentencsAndWordsForFlashcard: null, articleActivityLog: [] },
  });
});
afterEach(cleanup);

describe("article view", () => {
  it("renders the article, its tools, the lesson link, and the question cards", async () => {
    render((await ArticleQuizPage({ params })) as React.ReactElement);
    expect(screen.getByTestId("article-card")).toBeInTheDocument();
    for (const id of ["word-list", "sentences", "mc", "sa", "la"]) expect(screen.getByTestId(id)).toBeInTheDocument();
    const lesson = screen.getByRole("link", { name: en.Article.studyAsLesson });
    expect(lesson).toHaveAttribute("href", "/student/lesson/a1?type=article");
    expect(lesson.querySelector("button")).toBeNull();
    expect(lesson).toHaveClass("min-h-12");
  });

  it("shows a not-found state with a way back when the article does not exist", async () => {
    mocks.getArticleById.mockRejectedValue(new ArticleNotFoundError());
    render((await ArticleQuizPage({ params })) as React.ReactElement);
    expect(screen.getByRole("heading", { name: en.ReadList.notFound })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.ReadList.backToStories })).toHaveAttribute("href", "/student/read");
  });

  it("lets other load errors reach the error page (retry there)", async () => {
    mocks.getArticleById.mockRejectedValue(new Error("db down"));
    await expect(ArticleQuizPage({ params })).rejects.toThrow("db down");
  });
});
