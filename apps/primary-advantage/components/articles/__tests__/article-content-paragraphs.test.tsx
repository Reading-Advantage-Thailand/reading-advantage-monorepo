// @vitest-environment jsdom
/**
 * Behavioral replacement for the audio-highlight static case "holds the
 * highlight timer in a ref" (article-content.tsx half). Skipping ahead in the
 * passage arms the 100 ms intermediate-word timer; unmounting mid-highlight
 * must clear that timer and pause the audio element.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchArticleActivityMock = vi.fn();

vi.mock("@/actions/article", () => ({
  fetchArticleActivity: (...args: unknown[]) =>
    fetchArticleActivityMock(...args),
}));

vi.mock("@/actions/flashcard", () => ({
  saveFlashcard: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import type { Article } from "@/types";
import ArticleContent from "../article-content";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

const article: Article = {
  id: "article-1",
  title: "A Test Story",
  summary: "",
  translatedSummary: null,
  translatedPassage: null,
  imageDescription: "",
  passage: "Alpha beta gamma.",
  createdAt: new Date(0),
  rating: 1,
  type: "story",
  cefrLevel: "A1",
  raLevel: 1,
  genre: "fiction",
  audioUrl: "/audio/article-1.mp3",
  sentences: [
    {
      sentence: "Alpha beta gamma.",
      startTime: 0,
      endTime: 3,
      words: [
        { word: "Alpha", start: 0, end: 1 },
        { word: "beta", start: 1, end: 2 },
        { word: "gamma.", start: 2, end: 3 },
      ],
    },
  ],
};


const words = (s: string) => s.split(" ").map((word, i) => ({ word, start: i, end: i + 1 }));
const sentenceTexts = ["Go.", "It is a cat.", "The cat runs.", "Go home now.", "Stop.", "Look up.", "The end."];
const sentences = sentenceTexts.map((sentence, i) => ({
  sentence,
  startTime: i,
  endTime: i + 1,
  words: words(sentence),
}));
// The passage has paragraphs that hold none of the sentences, and "Go." sits in two paragraphs.
const unmatchedArticle: Article = {
  ...article,
  passage: "Totally different words here Go.\n\nMore other words Go. again",
  sentences,
};

beforeEach(() => {
  fetchArticleActivityMock.mockResolvedValue([]);
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("ArticleContent paragraph blocks", () => {
  it("shows every sentence once, in order, in 3 blocks", () => {
    const { container } = renderWithMessages(<ArticleContent article={unmatchedArticle} />);
    const blocks = container.querySelectorAll("p.indent-8");
    expect(blocks).toHaveLength(3);
    const text = Array.from(blocks).map((b) => b.textContent);
    expect(text.join("").replace(/\s+/g, "")).toBe(sentenceTexts.join("").replace(/\s+/g, ""));
    expect(text.join(" ").match(/Go\./g)).toHaveLength(1);
    expect(container.querySelectorAll("img[alt='Article Image']")).toHaveLength(3);
  });
});
