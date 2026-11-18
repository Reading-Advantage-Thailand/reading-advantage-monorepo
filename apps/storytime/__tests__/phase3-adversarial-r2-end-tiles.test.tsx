// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: the end-of-book way back with hostile tiles (finding F149).
 *
 * The end view used to render `WeekTileLinks` with the tiles of the caller. The end of the book
 * now leaves for the week home page and shows no tile copy (Daniel's finding 1 of task 6.2). This
 * case runs the two edges: no tile at all, and a tile set where one tile carries a picture file
 * and the next carries none. The finished line must always show, and no tile of the set may reach
 * the end of the book.
 */
import "@testing-library/jest-dom/vitest";
// The media of a week now comes from the signed map of the page. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import weekData from "../content/l2/w01.json";
import type { QuestionTile } from "../app/[locale]/st/[level]/[week]/questions";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/** The shipped w01 week through the contract (the r3 take of 2026-11-09 adds `wordClips`). */
const week: StorytimeWeek = weekSchema.parse(weekData);



const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Renders the shipped read-along book to its end view.
 * @param tiles The tiles of the end view.
 * @returns The rendered container.
 */
async function renderEnd(tiles?: QuestionTile[]) {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
  const book = structuredClone(week).books.find((entry) => entry.kind === "readalong")!;
  const view = render(<StorytimeReader book={book} locale="en" labels={labels} tiles={tiles} />);
  for (let index = 0; index < book.pages.length; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
  }
  expect(screen.getByText(labels.finished), "the end view must show").toBeInTheDocument();
  return view;
}

describe("Phase 3 adversarial end-of-book way back", () => {
  it("shows the finished line and no copy of the week tiles at the end of the book", async () => {
    const empty = await renderEnd([]);
    expect(
      empty.container.querySelectorAll("a"),
      "without tiles the end offers no link and must not crash",
    ).toHaveLength(0);
    cleanup();

    const tiles: QuestionTile[] = [
      {
        id: "book",
        href: "?part=book",
        label: "Read the book",
        pictureFile: "review/book-1.jpg",
        pictureAlt: "cover",
      },
      { id: "decodable", href: "?part=decodable", label: "Decodable", pictureAlt: "cover" },
      { id: "song", href: "?part=song", label: "Song", pictureAlt: "cover" },
    ];
    const withPicture = await renderEnd(tiles);
    expect(
      withPicture.container.querySelectorAll("a"),
      "the end of the book must show no tile link (finding 1 of task 6.2)",
    ).toHaveLength(0);
    expect(
      withPicture.container.querySelectorAll("img"),
      "the end of the book must show no tile picture (finding 1 of task 6.2)",
    ).toHaveLength(0);
  });
});
