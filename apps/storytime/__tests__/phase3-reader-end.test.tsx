// @vitest-environment jsdom
/**
 * Finding F149 (UX1) and Daniel's finding 1 of task 6.2: the end of the book must leave for the
 * week home page.
 *
 * On the shipped weeks the loops part is draft, so no question screen exists. The old end view
 * showed a copy of the three week tiles, so the child came back to a ghost start page that was
 * different to the first start page (Daniel, 2026-11-13 08:56). The end of the book now leaves for
 * the week home path and shows no copy of the tiles.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekData from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/** The router of the page and the path of the week page. */
const navigation = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  pathname: "/en/st/2/1",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
}));

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

beforeEach(() => {
  navigation.router.push.mockReset();
  navigation.router.replace.mockReset();
});

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

describe("the end of the book leaves for the week home page (finding F149, finding 1 of task 6.2)", () => {
  it("leaves for the week home path and shows no copy of the week tiles", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
    const book = structuredClone(week).books.find((entry) => entry.kind === "readalong")!;
    // No questions and no question labels: the shipped week's loops part is draft, so the
    // question screen does not exist and the end of the book is the only end.
    render(<StorytimeReader book={book} locale="en" labels={labels} tiles={weekTiles()} />);
    for (let index = 0; index < book.pages.length - 1; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    }
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      navigation.router.push,
      "the end of the book must leave for the week home page (finding 1 of task 6.2)",
    ).toHaveBeenCalledTimes(1);
    expect(
      navigation.router.push,
      "the leave must go to the week home path",
    ).toHaveBeenCalledWith("/en/st/2/1");
    expect(screen.getByText(labels.finished), "the end of the book shows the finished line").toBeInTheDocument();
    const links = screen.queryAllByRole("link");
    expect(
      links,
      "the end of the book must show no copy of the week tiles (finding 1 of task 6.2)",
    ).toHaveLength(0);
  });
});
