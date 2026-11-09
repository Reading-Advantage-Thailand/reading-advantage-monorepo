// @vitest-environment jsdom
/**
 * Finding F149 (UX1): the end of the book must always offer a way back.
 *
 * On the shipped weeks the loops part is draft, so no question screen exists. The old end
 * view showed only the line "the book is finished": the book, the page controls, the three
 * week tiles, and every link back disappeared, and the child had no control to go on. The
 * end now shows the three week tiles, as the end of the question screen does.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import weekData from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
};

/** The shipped w01 week through the contract (the r3 take of 2026-11-09 adds `wordClips`). */
const week: StorytimeWeek = weekSchema.parse(weekData);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Builds the three entry tiles of the week page, as page.tsx builds them. */
function weekTiles() {
  return [
    { id: "book", href: "?part=book", label: "Read the book", pictureAlt: "" },
    { id: "decodable", href: "?part=decodable", label: "Decodable", pictureAlt: "" },
    { id: "song", href: "?part=song", label: "Song", pictureAlt: "" },
  ];
}

describe("the end of the book offers a way back (finding F149)", () => {
  it("shows the three week tiles when the loops part is draft", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
    const book = structuredClone(week).books.find((entry) => entry.kind === "readalong")!;
    // No questions and no question labels: the shipped week's loops part is draft, so the
    // question screen does not exist and the end of the book is the only end view.
    render(<StorytimeReader book={book} locale="en" labels={labels} tiles={weekTiles()} />);
    for (let index = 0; index < book.pages.length - 1; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    }
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(screen.getByText(labels.finished), "the end view shows").toBeInTheDocument();
    const links = screen.queryAllByRole("link");
    expect(links, "the end must show the three week tiles (finding F149)").toHaveLength(3);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "?part=book",
      "?part=decodable",
      "?part=song",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Read the book",
      "Decodable",
      "Song",
    ]);
  });
});
