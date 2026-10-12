// @vitest-environment jsdom
/** Chapter page (STU-04 S4): title, read-along, word list, prev/next, 404. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";

const mocks = vi.hoisted(() => ({
  getChapter: vi.fn(),
  getStory: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  user: { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" } as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (d: unknown) => d }));
vi.mock("@reading-advantage/domain/stories", () => ({
  getChapterForStudent: mocks.getChapter,
  getStoryForStudent: mocks.getStory,
}));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }),
  };
});
vi.mock("next-intl", async (orig) => {
  const actual = await orig<typeof import("next-intl")>();
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return { ...actual, useTranslations: (ns?: string) => createTranslator({ locale: "en", messages: messages.en, namespace: ns as never }) };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/go-to-top", () => ({ GoToTop: () => null }));
vi.mock("@/components/stories/chapter-questions", () => ({
  ChapterQuestions: ({ chapterId }: { chapterId: string }) => <div data-testid="chapter-questions">{chapterId}</div>,
}));

import { withMessages } from "@/components/__tests__/helpers/render-with-messages";
import ChapterPage from "../page";

const STORY = "11111111-1111-4111-8111-111111111111";
const CHAPTER = "22222222-2222-4222-8222-222222222222";

const chapterData = {
  story: { id: STORY, title: "The Lantern Fox" },
  chapter: {
    id: CHAPTER,
    chapterNumber: 1,
    title: "The Lantern",
    passage: "Alpha beta gamma.",
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
    translatedPassage: { th: ["อัลฟา เบตา แกมมา"] },
    audioKey: "/audios/story/chapter/c1.mp3",
    imageKey: "cl123",
  },
  words: {
    words: [{ vocabulary: "lantern", definition: { en: "a lamp", th: "โคม" }, timeSeconds: 1 }],
    wordsUrl: "/audios/story/words/c1.mp3",
  },
  previousChapterNumber: null,
  nextChapterNumber: 2,
};

const storyData = {
  story: { id: STORY },
  chapters: Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, chapterNumber: i + 1 })),
  finishedChapterIds: [],
  characters: [],
};

/** Renders the chapter page inside the real message tree. */
async function renderPage(chapterNumber: string) {
  const element = (await ChapterPage({
    params: Promise.resolve({ storyId: STORY, chapterNumber }),
  })) as React.ReactElement;
  render(withMessages(element));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" };
  mocks.getChapter.mockResolvedValue(structuredClone(chapterData));
  mocks.getStory.mockResolvedValue(structuredClone(storyData));
});
afterEach(cleanup);

describe("chapter page", () => {
  it("shows the chapter number, the title, the passage, and the player", async () => {
    await renderPage("1");
    expect(screen.getByRole("heading", { level: 1, name: "The Lantern" })).toBeInTheDocument();
    expect(screen.getByText("Chapter 1 of 8")).toBeInTheDocument();
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    const audio = document.querySelector("audio") as HTMLAudioElement;
    expect(audio.getAttribute("src")).toContain("audios/story/chapter/c1.mp3");
    expect(screen.getByRole("button", { name: "Listen and read along" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Chapter picture" })).toHaveAttribute(
      "src",
      expect.stringContaining("images/story/cl123.png"),
    );
  });

  it("shows the word list button and the question section", async () => {
    await renderPage("1");
    expect(screen.getByRole("button", { name: "Word List" })).toBeInTheDocument();
    expect(screen.getByTestId("chapter-questions")).toHaveTextContent(CHAPTER);
  });

  it("links to the next chapter but not the previous on chapter 1", async () => {
    await renderPage("1");
    const nav = screen.getByRole("navigation", { name: "Chapter navigation" });
    expect(nav).toHaveTextContent("Next chapter");
    const next = screen.getByRole("link", { name: /Next chapter/ });
    expect(next).toHaveAttribute("href", `/student/read/stories/${STORY}/2`);
    expect(screen.queryByRole("link", { name: /Chapter 0|Previous/ })).toBeNull();
  });

  it("links to the previous chapter and shows no next on the last chapter", async () => {
    mocks.getChapter.mockResolvedValue({
      ...structuredClone(chapterData),
      chapter: { ...chapterData.chapter, chapterNumber: 8, title: "The Gate" },
      previousChapterNumber: 7,
      nextChapterNumber: null,
    });
    await renderPage("8");
    expect(screen.getByRole("heading", { level: 1, name: "The Gate" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Next chapter/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Chapter 7" })).toHaveAttribute(
      "href",
      `/student/read/stories/${STORY}/7`,
    );
  });

  it("shows 404 outside the level window", async () => {
    const error = new Error(`Story not found: ${STORY}`);
    error.name = "StoryNotFoundError";
    mocks.getChapter.mockRejectedValue(error);
    mocks.getStory.mockRejectedValue(error);
    await expect(renderPage("1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("shows 404 for a bad chapter number", async () => {
    await expect(renderPage("x")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getChapter).not.toHaveBeenCalled();
  });
});
