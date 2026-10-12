// @vitest-environment jsdom
/** Stories tab list (STU-04): the shelf, the filters, the page turn, and the empty state. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  user: { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" } as Record<string, unknown> | null,
}));

vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (d: unknown) => d }));
vi.mock("@reading-advantage/domain/stories", () => ({ listPrimaryStories: mocks.list }));
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

import StoriesPage from "../page";

const en = testMessages.en;
const story = (n: number) => ({ id: `st-${n}`, title: `Story ${n}`, genre: "Fantasy", raLevel: 5, cefrLevel: "A2", imageKey: `key${n}` });

/** Renders the stories page for a set of filters. */
async function renderPage(params: Record<string, string> = {}) {
  render((await StoriesPage({ searchParams: Promise.resolve(params) })) as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" };
  mocks.list.mockResolvedValue({ stories: [story(1), story(2)], total: 25, page: 1, pageSize: 10, genres: ["Fantasy", "Sports"] });
});
afterEach(cleanup);

describe("stories page", () => {
  it("shows the tab sign with Stories selected, the level window, and a book link for each story", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Stories" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Your level: A2 · Stories of level 4 to 6")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Story 1/ });
    expect(link).toHaveAttribute("href", "/student/read/stories/st-1");
    expect(link.querySelector("img")?.getAttribute("src")).toContain("images/story/key1.png");
  });

  it("passes the filters to the domain query", async () => {
    await renderPage({ genre: "Fantasy", q: "fox", page: "2" });
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ input: { genre: "Fantasy", search: "fox", page: 2 } }),
    );
  });

  it("shows genre signs as 48 px links and a selected genre", async () => {
    await renderPage({ genre: "Sports" });
    const nav = screen.getByRole("navigation", { name: en.Stories.genres });
    const sports = within(nav).getByRole("link", { name: "Sports" });
    expect(sports).toHaveAttribute("aria-current", "true");
    expect(sports).toHaveAttribute("href", "/student/read/stories?genre=Sports");
    for (const a of within(nav).getAllByRole("link")) expect(a.className).toContain("min-h-12");
  });

  it("shows the page turn with Back disabled on page 1 and Turn the page as a link", async () => {
    await renderPage();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Back/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Turn the page/ })).toHaveAttribute("href", "/student/read/stories?page=2");
  });

  it("shows the empty state with a way to clear the filters", async () => {
    mocks.list.mockResolvedValue({ stories: [], total: 0, page: 1, pageSize: 10, genres: [] });
    await renderPage({ q: "dragonfly" });
    expect(screen.getByText(en.Stories.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.Stories.clearFilters })).toHaveAttribute("href", "/student/read/stories");
  });

  it("shows staff the list with no level window text", async () => {
    mocks.user = { id: "t1", role: "TEACHER", level: 1, cefrLevel: "A1", schoolId: "sch" };
    await renderPage();
    expect(screen.queryByText(/Stories of level/)).not.toBeInTheDocument();
  });
});
