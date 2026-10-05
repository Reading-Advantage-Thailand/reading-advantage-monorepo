// @vitest-environment jsdom
/** Read list page (audit S1): one level, clear filter steps with a selected state, 48 px choices. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  fetchArticles: vi.fn(),
  user: { id: "s1", role: "STUDENT", level: 3, cefrLevel: "A1-" } as Record<string, unknown> | null,
}));

vi.mock("@/server/controllers/articleController", () => ({ fetchArticles: mocks.fetchArticles }));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }),
  };
});
vi.mock("@/components/articles/article-select", () => ({
  default: ({ total }: { total: number }) => <div data-testid="article-select">{total}</div>,
}));
vi.mock("@/components/go-to-top", () => ({ GoToTop: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ReadPage from "../page";

const en = testMessages.en;

/**
 * Renders the read page for a set of filters.
 * @param params The type, genre, and subgenre filters.
 */
async function renderPage(params: Record<string, string> = {}) {
  render((await ReadPage({ searchParams: Promise.resolve(params) })) as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchArticles.mockResolvedValue({ articles: [], totalArticles: 7 });
});
afterEach(cleanup);

describe("read list page", () => {
  it("shows one level (CEFR) and the type choices as 48 px links", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: en.ReadList.title })).toBeInTheDocument();
    expect(screen.getByText("Your level: A1-")).toBeInTheDocument();
    expect(screen.queryByText(/Your level is/)).not.toBeInTheDocument();
    const filters = screen.getByRole("navigation", { name: en.ReadList.filters });
    expect(within(filters).getByText(en.ReadList.chooseType)).toBeInTheDocument();
    const fiction = within(filters).getByRole("link", { name: en.Article.types.fiction });
    expect(fiction).toHaveAttribute("href", "/student/read?type=fiction");
    expect(fiction).toHaveClass("min-h-12");
    expect(screen.getByTestId("article-select")).toHaveTextContent("7");
  });

  it("marks the chosen type and offers its genres and a reset", async () => {
    await renderPage({ type: "fiction" });
    const filters = screen.getByRole("navigation", { name: en.ReadList.filters });
    expect(within(filters).getByRole("link", { name: en.Article.types.fiction })).toHaveAttribute("aria-current", "true");
    expect(within(filters).getByText(en.ReadList.chooseGenre)).toBeInTheDocument();
    expect(within(filters).getByRole("link", { name: en.Article.genres.realistic_fiction })).toHaveAttribute(
      "href",
      "/student/read?type=fiction&genre=Realistic%20Fiction",
    );
    expect(within(filters).getByRole("link", { name: en.Components.resetFilter })).toHaveAttribute("href", "/student/read");
  });

  it("passes the filters to the article query", async () => {
    await renderPage({ type: "fiction", genre: "Realistic Fiction" });
    const query = mocks.fetchArticles.mock.calls[0][0] as URLSearchParams;
    expect(query.get("type")).toBe("fiction");
    expect(query.get("genre")).toBe("Realistic Fiction");
  });
});
