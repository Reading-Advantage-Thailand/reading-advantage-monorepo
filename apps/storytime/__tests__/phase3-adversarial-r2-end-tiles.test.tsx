// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: the end-of-book way back with hostile tiles (finding F149).
 *
 * The end view renders `WeekTileLinks` only when the caller passes tiles. This case runs the
 * two edges: no tile at all, and a tile set where one tile carries a picture file and the next
 * carries none. The finished line must always show, a tile picture must land on the media base,
 * and a tile without a picture must render no `img`.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import week from "../content/l2/w01.json";
import type { QuestionTile } from "../app/[locale]/st/[level]/[week]/questions";

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
  it("shows the finished line with no tiles and renders a picture tile only when it has a file", async () => {
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
    const images = [...withPicture.container.querySelectorAll("img")];
    expect(images, "the first tile carries the picture of the tile set").toHaveLength(1);
    expect(images[0], "the tile picture must land on the media base").toHaveAttribute(
      "src",
      "/media/review/book-1.jpg",
    );
    expect(images[0], "the tile picture must keep its alt text").toHaveAttribute(
      "alt",
      "cover",
    );
    expect(
      withPicture.container.querySelectorAll("a"),
      "every tile must stay a link",
    ).toHaveLength(3);
  });
});
