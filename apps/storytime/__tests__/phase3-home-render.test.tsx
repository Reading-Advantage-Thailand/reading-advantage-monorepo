// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
// The page signs the media of the week after the session check. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async () => ({}),
}));

import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import week3 from "../content/l2/w03.json";
import type { StorytimeWeek } from "../lib/contracts/week";

const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  // The test renders the home view twice; each message string carries its locale prefix, so the
  // assertions can find the localized tile labels and headings without the message files.
  getTranslations: async ({ locale }: { locale?: string }) =>
    (key: string) => `${locale ?? "th"}:${key}`,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("unexpected notFound"); } }));

vi.mock("../lib/auth", () => ({
  // The login of task 2b.4 needs a session. The page runs with a signed-in family account, so
  // the content assertions of this test stay unchanged.
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";
import { StorytimeDecodable } from "../app/[locale]/st/[level]/[week]/reader";
import { StorytimeSong } from "../app/[locale]/st/[level]/[week]/song";



/** One deep clone of the shipped week 3 for the render fixtures. */
function cloneWeek(): StorytimeWeek {
  return JSON.parse(JSON.stringify(week3)) as StorytimeWeek;
}

/** Renders the home view of a shipped week in one locale and returns the rendered container. */
async function renderHome(locale: "th" | "en") {
  routeMocks.loadVisibleWeek.mockResolvedValue(cloneWeek());
  const previous = document.documentElement.lang;
  document.documentElement.lang = locale;
  try {
    const element = await StorytimeWeekPage({
      params: Promise.resolve({ locale, level: "2", week: "3" }),
      searchParams: Promise.resolve({}),
    });
    return { ...render(element), previous };
  } catch (error) {
    document.documentElement.lang = previous;
    throw error;
  }
}

afterEach(() => {
  cleanup();
  routeMocks.loadVisibleWeek.mockReset();
});

describe("Phase 3 home view language (finding F135)", () => {
  it("binds the tile labels and the headings to the string locale in th", async () => {
    const { container, previous } = await renderHome("th");
    try {
      for (const key of ["tileReadalong", "homeParentHeading", "homeWordsHeading"]) {
        const element = screen.getByText(`th:${key}`);
        expect(
          element.closest("[lang]")?.getAttribute("lang"),
          `the nearest lang of the localized string ${key} must follow the locale`,
        ).toBe("th");
      }
      expect(container).toBeInTheDocument();
    } finally {
      document.documentElement.lang = previous;
    }
  });

  it("binds the tile labels and the headings to the string locale in en", async () => {
    await renderHome("en");
    for (const key of ["tileDecodable", "homeParentHeading", "homeWordsHeading"]) {
      const element = screen.getByText(`en:${key}`);
      expect(
        element.closest("[lang]")?.getAttribute("lang"),
        `the nearest lang of the localized string ${key} must follow the locale`,
      ).toBe("en");
    }
  });
});

describe("Phase 3 rendered alt attributes (finding F138)", () => {
  it("renders every picture with an alt attribute on the home, decodable, and song screens", async () => {
    const clone = cloneWeek();
    for (const book of clone.books) {
      for (const [index, page] of book.pages.entries()) {
        page.image = {
          prompt: page.image?.prompt,
          characters: page.image?.characters ?? [],
          caption: page.image?.caption ?? "",
          file: page.image?.file ?? `review/${book.kind}-${index + 1}.jpg`,
        };
      }
    }
    const home = await renderHome("th");
    const decodable = render(<StorytimeDecodable week={clone} locale="en" />);
    const song = clone.song
      ? render(<StorytimeSong song={clone.song} mediaUrls={{}} labels={{ play: "th:songPlay", pause: "th:songPause" }} />)
      : null;
    try {
      const containers = [home.container, decodable.container, ...(song ? [song.container] : [])];
      let total = 0;
      let missing = 0;
      for (const container of containers) {
        const images = [...container.querySelectorAll("img")];
        total += images.length;
        missing += images.filter((image) => !image.hasAttribute("alt")).length;
      }
      expect(total, "the Phase 3 screens must render pictures for the alt check").toBeGreaterThan(0);
      expect(`img_without_alt_attr=${missing}`).toBe("img_without_alt_attr=0");
    } finally {
      document.documentElement.lang = home.previous;
    }
  });
});
