// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchArticleActivityMock, saveFlashcardMock, retakeQuizMock } = vi.hoisted(() => ({
  fetchArticleActivityMock: vi.fn(),
  saveFlashcardMock: vi.fn(),
  retakeQuizMock: vi.fn(),
}));

vi.mock("@/actions/article", () => ({ fetchArticleActivity: (...a: unknown[]) => fetchArticleActivityMock(...a) }));
vi.mock("@/actions/flashcard", () => ({ saveFlashcard: (...a: unknown[]) => saveFlashcardMock(...a) }));
vi.mock("@/actions/question", () => ({ retakeQuiz: (...a: unknown[]) => retakeQuizMock(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/" }));

import type { Article } from "@/types";
import ArticleContent from "../article-content";
import { StudentViewProvider } from "@/components/student/student-view-provider";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

const article = {
  id: "article-1", title: "A Test Story", summary: "", translatedSummary: null, translatedPassage: null,
  imageDescription: "", passage: "Alpha beta gamma.", createdAt: new Date(0), rating: 1, type: "story",
  cefrLevel: "A1", raLevel: 1, genre: "fiction", audioUrl: "/audio/article-1.mp3",
  sentences: [{ sentence: "Alpha beta gamma.", startTime: 0, endTime: 3, words: [{ word: "Alpha", start: 0, end: 1 }] }],
} as unknown as Article;

beforeEach(() => {
  vi.clearAllMocks();
  fetchArticleActivityMock.mockResolvedValue({ success: true });
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  (globalThis as Record<string, unknown>).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
});

describe("article page in preview", () => {
  it("does not track the article access", () => {
    renderWithMessages(<StudentViewProvider mode="preview"><ArticleContent article={article} /></StudentViewProvider>);
    expect(fetchArticleActivityMock).not.toHaveBeenCalled();
    expect(saveFlashcardMock).not.toHaveBeenCalled();
  });

  it("tracks the article access for a student", () => {
    renderWithMessages(<StudentViewProvider mode="student"><ArticleContent article={article} /></StudentViewProvider>);
    expect(fetchArticleActivityMock).toHaveBeenCalledWith("article-1");
  });
});
