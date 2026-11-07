// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 3: the tile list of a week whose parts are missing (finding F242).
 *
 * The F242 fix gave the home view a tile only for a part the week has, and gave a part screen
 * whose part the week lacks a link back to the week tiles. This case feeds the new tile list the
 * edges: a week with only the read-along book, a week with no song, and the published week one
 * with both books and a song.
 *
 * The home list must hold only the parts the week has, the end of the book must offer the same
 * tiles, and a part screen without its content must offer the way back to the week tiles.
 */
import "@testing-library/jest-dom/vitest";
// The page signs the media of the week after the session check. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async () => ({}),
}));

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import shippedWeek from "../content/l2/w01.json";

const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) => (key: string) => `${locale ?? "en"}:${key}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));

vi.mock("../lib/auth", () => ({
  // The login of task 2b.4 needs a session. The page runs with a signed-in family account, so
  // the content assertions of this test stay unchanged.
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";



afterEach(() => {
  cleanup();
  routeMocks.loadVisibleWeek.mockReset();
});

/**
 * Builds a week that holds only the read-along book of the published week.
 * @returns The week fixture.
 */
function bookOnlyWeek(): StorytimeWeek {
  const week = structuredClone(shippedWeek) as unknown as StorytimeWeek;
  week.books = week.books.filter((entry) => entry.kind === "readalong");
  delete week.song;
  return week;
}

/**
 * Renders the week page of one week.
 * @param week The week the loader returns.
 * @param part The part query value.
 * @returns The rendered container.
 */
async function renderWeek(week: StorytimeWeek, part?: string) {
  routeMocks.loadVisibleWeek.mockResolvedValue(week);
  const element = await StorytimeWeekPage({
    params: Promise.resolve({ locale: "en", level: "2", week: "1" }),
    searchParams: Promise.resolve(part ? { part } : {}),
  });
  return render(element);
}

describe("Phase 3 adversarial week tile list", () => {
  it("holds a tile only for a part the week has", async () => {
    const home = await renderWeek(bookOnlyWeek());
    const list = home.container.querySelector<HTMLElement>("[data-week-tiles]");
    expect(list, "the home view must render the tile list").toBeTruthy();
    expect(
      list!.querySelectorAll("li"),
      "a week with only the read-along book must hold one tile (F242)",
    ).toHaveLength(1);
    expect(
      list!.textContent,
      "the one tile must be the read-along tile",
    ).toContain("en:tileReadalong");
    expect(list!.textContent, "the tile list must not hold the decodable tile").not.toContain(
      "en:tileDecodable",
    );
    expect(list!.textContent, "the tile list must not hold the song tile").not.toContain(
      "en:tileSong",
    );
    cleanup();

    const published = await renderWeek(shippedWeek as unknown as StorytimeWeek);
    const publishedList = published.container.querySelector<HTMLElement>("[data-week-tiles]");
    expect(publishedList, "the published week must render the tile list").toBeTruthy();
    expect(
      publishedList!.querySelectorAll("li"),
      "the published week holds a read-along, a decodable, and a song tile",
    ).toHaveLength(3);
  });

  it("gives a part screen without its content the way back to the week tiles", async () => {
    const decodable = await renderWeek(bookOnlyWeek(), "decodable");
    const back = decodable.container.querySelector<HTMLAnchorElement>('[data-part="decodable"] a');
    expect(
      back,
      "the decodable part of a week without a decodable must offer the way back (F242)",
    ).not.toBeNull();
    expect(back, "the way back must point at the week tiles").toHaveAttribute("href", "/en/st/2/1");
    cleanup();

    const song = await renderWeek(bookOnlyWeek(), "song");
    const songBack = song.container.querySelector<HTMLAnchorElement>('[data-part="song"] a');
    expect(
      songBack,
      "the song part of a week without a song must offer the way back (F242)",
    ).not.toBeNull();
    expect(songBack, "the way back must point at the week tiles").toHaveAttribute(
      "href",
      "/en/st/2/1",
    );
  });

  it("offers the end of the book only the tiles of the parts the week has", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const week = bookOnlyWeek();
    const view = await renderWeek(week, "book");
    const book = week.books[0]!;
    for (let index = 0; index < book.pages.length; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "en:playerNextPage" }));
    }
    const end = view.container.querySelector<HTMLElement>("[data-reader-end]");
    expect(end, "the reader must reach its end view").toBeTruthy();
    expect(
      end!.querySelectorAll("a"),
      "the end of a book-only week must offer its one tile (F242)",
    ).toHaveLength(1);
    expect(end!.querySelector("a"), "the tile must link to the read-along part").toHaveAttribute(
      "href",
      "?part=book",
    );
  });
});
