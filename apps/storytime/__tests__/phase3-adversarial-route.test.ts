// @vitest-environment jsdom
/**
 * Phase 3 adversarial round: hostile URLs and a draft week through `?part=`
 * (test strategy P3.12, the adversarial row).
 *
 * The entry is the same route module that `phase3-entry-route.test.ts` reads:
 * `app/[locale]/st/[level]/[week]/page.tsx`. The tests call its default export
 * with hostile params and query values, so the check is behavior and not a
 * source regex. A hostile segment must answer the not-found path and must
 * never reach the week loader. An unknown or repeated `part` must open the
 * home view and never a part page. A draft week must answer not-found even
 * when the query names a part.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import week1 from "../content/l2/w01.json";

const app = resolve(import.meta.dirname, "..");
const previousContentDir = process.env.STORYTIME_CONTENT_DIR;

const loaderMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
const navMocks = vi.hoisted(() => ({ notFound: vi.fn() }));

vi.mock("../lib/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/content")>();
  // The spy delegates to the real loader, so the draft gate runs live and the
  // test can still assert whether a hostile URL reached the loader at all.
  loaderMocks.loadVisibleWeek.mockImplementation(actual.loadVisibleWeek);
  return { ...actual, loadVisibleWeek: loaderMocks.loadVisibleWeek };
});

vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) =>
    (key: string) => `${locale ?? "th"}:${key}`,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    navMocks.notFound();
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("../lib/auth", () => ({
  // The login of task 2b.4 needs a session. The page runs with a signed-in family account, so
  // the content assertions of this test stay unchanged.
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";

type PageParams = { locale: string; level: string; week: string };
type SearchParams = Record<string, string | string[] | undefined>;

/** Renders the at-home route with the given path and query segments. */
async function renderPage(params: PageParams, searchParams: SearchParams = {}) {
  const element = await StorytimeWeekPage({
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  });
  return render(element);
}

beforeAll(() => {
  process.env.STORYTIME_CONTENT_DIR = resolve(app, "content");
});

afterAll(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
});

beforeEach(() => {
  loaderMocks.loadVisibleWeek.mockClear();
  navMocks.notFound.mockClear();
});

afterEach(() => {
  // No vi.restoreAllMocks here: it would wipe the loader delegation that the
  // module factory installs, and the draft and home cases need the real loader.
  cleanup();
});

describe("Phase 3 adversarial entry route", () => {
  it("keeps the shipped premise: w01 is published", () => {
    expect((week1 as { meta: { status: string } }).meta.status).toBe("published");
  });

  it("answers not-found for hostile level, week, and locale segments", async () => {
    const hostile: PageParams[] = [
      { locale: "th", level: "..", week: "1" },
      { locale: "th", level: "//", week: "1" },
      { locale: "th", level: "%2e%2e", week: "1" },
      { locale: "th", level: "01", week: "1" },
      { locale: "th", level: "99999999999999999999", week: "1" },
      { locale: "th", level: "2", week: "0" },
      { locale: "fr", level: "2", week: "1" },
    ];
    for (const params of hostile) {
      await expect(
        StorytimeWeekPage({
          params: Promise.resolve(params),
          searchParams: Promise.resolve({}),
        }),
        `${JSON.stringify(params)} must answer the not-found path`,
      ).rejects.toThrow("NOT_FOUND");
    }
    expect(navMocks.notFound).toHaveBeenCalledTimes(hostile.length);
    expect(
      loaderMocks.loadVisibleWeek,
      "a hostile URL must never reach the week loader",
    ).not.toHaveBeenCalled();
  });

  it("answers not-found for a draft week reached through part=book", async () => {
    await expect(
      StorytimeWeekPage({
        params: Promise.resolve({ locale: "th", level: "2", week: "2" }),
        searchParams: Promise.resolve({ part: "book" }),
      }),
      "a draft week must stay not-found when the query names a part",
    ).rejects.toThrow("NOT_FOUND");
    expect(loaderMocks.loadVisibleWeek).toHaveBeenCalledWith(2, 2);
    expect(navMocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("opens the home view for an unknown and a repeated part, never a part page", async () => {
    for (const searchParams of [{ part: "home" }, { part: ["book", "song"] }]) {
      const { container } = await renderPage(
        { locale: "th", level: "2", week: "1" },
        searchParams,
      );
      expect(
        container.querySelector("[data-part]"),
        `${JSON.stringify(searchParams)} must open the home view and no part page`,
      ).toBeNull();
      expect(screen.getByText("th:homeChoosePart")).toBeInTheDocument();
      cleanup();
    }
    expect(navMocks.notFound).not.toHaveBeenCalled();
  });

  it("opens the home view on the published week without a part query", async () => {
    const { container } = await renderPage({ locale: "th", level: "2", week: "1" });
    expect(container.querySelector("[data-part]")).toBeNull();
    expect(screen.getByText("th:homeChoosePart")).toBeInTheDocument();
    expect(navMocks.notFound).not.toHaveBeenCalled();
    expect(loaderMocks.loadVisibleWeek).toHaveBeenCalledWith(2, 1);
  });

  it("opens the book part for part=book on the published week", async () => {
    const { container } = await renderPage({ locale: "th", level: "2", week: "1" }, { part: "book" });
    expect(
      container.querySelector('[data-part="book"]'),
      "the published week must open its part page for a valid part",
    ).not.toBeNull();
    expect(navMocks.notFound).not.toHaveBeenCalled();
    expect(loaderMocks.loadVisibleWeek).toHaveBeenCalledWith(2, 1);
  });
});
