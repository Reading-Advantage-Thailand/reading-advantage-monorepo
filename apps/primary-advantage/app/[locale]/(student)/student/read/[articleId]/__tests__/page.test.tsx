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
  resolveLegacyArticleId: vi.fn(),
  saveArticleToFlashcard: vi.fn(),
  user: { id: "s1", role: "STUDENT" } as Record<string, unknown> | null,
}));

vi.mock("@/server/models/articleModel", async () => {
  class ArticleNotFoundError extends Error {}
  return { getArticleById: mocks.getArticleById, ArticleNotFoundError };
});
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: vi.fn(() => ({})) }));
vi.mock("@reading-advantage/domain/articles", () => ({ resolveLegacyArticleId: mocks.resolveLegacyArticleId }));
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
import { redirect } from "@/i18n/navigation";

const en = testMessages.en;
const ARTICLE_ID = "3b46fdbc-47ea-4e7f-ab9d-f8db4294081c";
const params = Promise.resolve({ locale: "en", articleId: ARTICLE_ID });
const LEGACY_ID = "cmgqx8v6602p3t79btatvfjuw";

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
    expect(lesson).toHaveAttribute("href", `/student/lesson/${ARTICLE_ID}?type=article`);
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

  it("opens the migrated article of a printed legacy id (FR-4)", async () => {
    mocks.resolveLegacyArticleId.mockResolvedValue(ARTICLE_ID);
    await ArticleQuizPage({ params: Promise.resolve({ locale: "th", articleId: LEGACY_ID }) });
    expect(mocks.resolveLegacyArticleId).toHaveBeenCalledWith(expect.objectContaining({ input: { legacyId: LEGACY_ID } }));
    expect(redirect).toHaveBeenCalledWith({ href: `/student/read/${ARTICLE_ID}`, locale: "th" });
    expect(mocks.getArticleById).not.toHaveBeenCalled();
  });

  it("shows the not-found state for an id that is neither a uuid nor a known legacy id", async () => {
    mocks.resolveLegacyArticleId.mockResolvedValue(null);
    render((await ArticleQuizPage({ params: Promise.resolve({ locale: "en", articleId: LEGACY_ID }) })) as React.ReactElement);
    expect(screen.getByRole("heading", { name: en.ReadList.notFound })).toBeInTheDocument();
    expect(mocks.getArticleById).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
