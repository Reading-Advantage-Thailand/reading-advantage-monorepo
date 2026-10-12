// @vitest-environment jsdom
/** Story page (STU-04 S3): cover, translated summary, chapter list, Characters sign, 404. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";


const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  locale: "en",
  user: { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" } as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (d: unknown) => d }));
vi.mock("@reading-advantage/domain/stories", () => ({ getStoryForStudent: mocks.get }));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
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

import StoryPage from "../page";

const STORY = "11111111-1111-4111-8111-111111111111";
const data = {
  story: {
    id: STORY, title: "The Lantern Fox", summary: "A fox finds a lantern.", translatedSummary: { th: "จิ้งจอกพบโคม" },
    genre: "Fantasy", raLevel: 5, cefrLevel: "A2", imageKey: "cl123",
  },
  chapters: [
    { id: "c1", chapterNumber: 1, title: "The Lantern", summary: "First.", translatedSummary: { th: "หนึ่ง" } },
    { id: "c2", chapterNumber: 2, title: "The Wood", summary: "Second.", translatedSummary: null },
    { id: "c3", chapterNumber: 3, title: "The Gate", summary: null, translatedSummary: null },
  ],
  finishedChapterIds: ["c1"],
  characters: [{ name: "Fox", description: "Quick and kind", background: "Born in the wood" }],
};

/** Renders the story page. */
async function renderPage(searchParams: Record<string, string> = {}) {
  render((await StoryPage({ params: Promise.resolve({ storyId: STORY }), searchParams: Promise.resolve(searchParams) })) as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.user = { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" };
  mocks.get.mockResolvedValue(data);
});
afterEach(cleanup);

describe("story page", () => {
  it("shows the cover, the title, the badges, and the English summary", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "The Lantern Fox" })).toBeInTheDocument();
    expect(screen.getByText("A fox finds a lantern.")).toBeInTheDocument();
    expect(document.querySelector("img[src*=\"images/story\"]")?.getAttribute("src")).toContain("images/story/cl123.png");
    expect(screen.getByText("Level 5")).toBeInTheDocument();
    expect(screen.getByText("3 chapters")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({ input: { storyId: STORY } }));
  });

  it("shows the summary in the student's language, with the English text as the fallback", async () => {
    mocks.locale = "th";
    await renderPage();
    expect(screen.getByText("จิ้งจอกพบโคม")).toBeInTheDocument();
    cleanup();
    mocks.locale = "vi";
    await renderPage();
    expect(screen.getByText("A fox finds a lantern.")).toBeInTheDocument();
  });

  it("lists the chapters as 56 px links with Done on the finished chapters", async () => {
    await renderPage();
    const list = screen.getByRole("list", { name: "Chapters" });
    const rows = within(list).getAllByRole("link");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("href", `/student/read/stories/${STORY}/1`);
    expect(rows[0]!.className).toContain("min-h-14");
    expect(within(rows[0]!).getByText("Done")).toBeInTheDocument();
    expect(within(rows[1]!).queryByText("Done")).not.toBeInTheDocument();
  });

  it("starts at the first chapter that the student did not finish", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Start chapter 2" })).toHaveAttribute("href", `/student/read/stories/${STORY}/2`);
  });

  it("offers Read again from chapter 1 when every chapter is done", async () => {
    mocks.get.mockResolvedValue({ ...data, finishedChapterIds: ["c1", "c2", "c3"] });
    await renderPage();
    expect(screen.getByRole("link", { name: "Read again" })).toHaveAttribute("href", `/student/read/stories/${STORY}/1`);
  });

  it("shows the Chapters sign by default and the characters under the Characters sign", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Chapters" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Quick and kind")).not.toBeInTheDocument();
    cleanup();
    await renderPage({ tab: "characters" });
    const sign = screen.getByRole("link", { name: "Characters" });
    expect(sign).toHaveAttribute("aria-current", "page");
    expect(sign.className).toContain("min-h-12");
    expect(screen.getByText("Fox")).toBeInTheDocument();
    expect(screen.getByText("Quick and kind")).toBeInTheDocument();
    expect(screen.getByText(/Born in the wood/)).toBeInTheDocument();
  });

  it("says so when a story has no characters", async () => {
    mocks.get.mockResolvedValue({ ...data, characters: [] });
    await renderPage({ tab: "characters" });
    expect(screen.getByText("This story has no characters yet.")).toBeInTheDocument();
  });

  it("shows 404 outside the level window, when unpublished, or for a bad id", async () => {
    mocks.get.mockRejectedValue(Object.assign(new Error("x"), { name: "StoryNotFoundError" }));
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    mocks.get.mockRejectedValue(Object.assign(new Error("bad"), { name: "ZodError" }));
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(2);
  });

  it("rethrows an unexpected error", async () => {
    mocks.get.mockRejectedValue(new Error("db down"));
    await expect(renderPage()).rejects.toThrow("db down");
  });

  it("shows 404 with no signed-in user", async () => {
    mocks.user = null;
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
