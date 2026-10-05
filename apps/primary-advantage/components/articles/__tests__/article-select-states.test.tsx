// @vitest-environment jsdom
/** Read list states (FR-5): empty with a next step, load-more error with retry, loading text. */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({ useSearchParams: () => nav.params }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/student/read",
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ArticleSelect from "../article-select";

const en = testMessages.en.ReadList;
const articles = [{ id: "a1", title: "River Crossing", type: "fiction", genre: "Fantasy" }];
const callbacks: IntersectionObserverCallback[] = [];

/** Fires the latest observer as if the sentinel scrolled into view. */
function intersect() {
  act(() => callbacks.at(-1)?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
}

beforeEach(() => {
  callbacks.length = 0;
  nav.params = new URLSearchParams();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ArticleSelect states", () => {
  it("shows an empty state with a way back to all stories when a filter has no stories", () => {
    nav.params = new URLSearchParams("type=fiction&genre=Fantasy");
    renderWithMessages(<ArticleSelect initialArticles={[]} total={0} />);
    expect(screen.getByText(en.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: testMessages.en.Components.resetFilter })).toHaveAttribute("href", "/student/read");
  });

  it("shows an error with a retry when loading more stories fails, and the retry loads again", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articles: [{ id: "a2", title: "Moon Walk", type: "fiction", genre: "Fantasy" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithMessages(<ArticleSelect initialArticles={articles} total={2} />);
    intersect();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en.loadMoreError);
    fireEvent.click(screen.getByRole("button", { name: testMessages.en.Error.retry }));
    expect(await screen.findByRole("link", { name: "Moon Walk" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("announces the loading of more stories", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    renderWithMessages(<ArticleSelect initialArticles={articles} total={2} />);
    intersect();
    expect(await screen.findByText(en.loadingMore)).toBeInTheDocument();
    expect(screen.getByText(en.loadingMore).closest("[aria-live]")).not.toBeNull();
  });
});
