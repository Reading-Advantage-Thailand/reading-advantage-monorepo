// @vitest-environment jsdom
/**
 * Task 6.2, Daniel's finding 1 (Tasks id TjVXNWl3OHVYalhReGVIZg, 2026-11-13 08:56): "When I
 * finish the read to me pages, the system returns to a ghost start page that is different to the
 * first start page."
 *
 * The end of the read-along book stays on `?part=book` and renders its own end view
 * (`data-reader-end`) with a copy of the tiles. The end of the question screen shows a tile copy
 * too. Both ends must leave for the week home path (the home view of page.tsx, no `?part`).
 * The book part is done on the device before the leave.
 *
 * The test mocks `next/navigation`. A leave is one call of `router.push` or `router.replace`.
 * The target resolves against the current URL, so a relative or an absolute path both count.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekData from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/** The router and the path of the mock; `vi.hoisted` makes them visible to the mock factory. */
const navigation = vi.hoisted(() => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
  return { router, pathname: "/en/st/2/1", search: "part=book" };
});

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  notFound: () => {
    throw new Error("unexpected notFound");
  },
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

const questionLabels = {
  skip: "Skip",
  right: "Yes",
  gentle: "Try again",
  picture: "Picture {n}",
};

/** The done key of the book part, as page.tsx builds it. */
const DONE_KEY = "2:1:book";

const week: StorytimeWeek = weekSchema.parse(weekData);

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", `${navigation.pathname}?${navigation.search}`);
  navigation.router.push.mockReset();
  navigation.router.replace.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

/** The read-along book of the shipped week, as a deep copy. */
function readalong() {
  return structuredClone(week).books.find((entry) => entry.kind === "readalong")!;
}

/** Lists the target of every leave call, in call order. */
function leaves(): unknown[] {
  return [
    ...navigation.router.push.mock.calls.map((call) => call[0]),
    ...navigation.router.replace.mock.calls.map((call) => call[0]),
  ];
}

/**
 * Asserts that one target is the week home path: the pathname of the week page and no `part`.
 * @param target The first argument of a leave call.
 */
function expectWeekHome(target: unknown): void {
  const url = new URL(String(target), `http://localhost${navigation.pathname}?${navigation.search}`);
  expect(url.pathname, "the leave goes to the week home path").toBe(navigation.pathname);
  expect(url.searchParams.has("part"), "the week home path holds no ?part").toBe(false);
}

/** Opens the reader on the last page and presses Next once more. */
async function renderToEnd(options: { questions?: boolean } = {}) {
  const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
  const book = readalong();
  const view = render(
    <StorytimeReader
      book={book}
      locale="en"
      labels={labels}
      tiles={weekTiles()}
      doneKey={DONE_KEY}
      {...(options.questions
        ? { questions: book.questions ?? [], questionLabels }
        : {})}
    />,
  );
  for (let index = 0; index < book.pages.length - 1; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
  }
  return { ...view, book };
}

describe("the end of read to me returns to the week home (finding 1)", () => {
  it("does not leave the book on a page before the last (characterization)", async () => {
    await renderToEnd();
    expect(leaves(), "no leave before the end").toHaveLength(0);
  });

  it("leaves for the week home path once after the last page", async () => {
    await renderToEnd();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    await waitFor(() => expect(leaves()).toHaveLength(1));
    expectWeekHome(leaves()[0]);
  });

  it("renders no copy of the week tiles at the end of the book", async () => {
    const { container } = await renderToEnd();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    await waitFor(() => expect(leaves()).toHaveLength(1));
    expect(container.querySelector("[data-reader-end]"), "no ghost end view").toBeNull();
    const tileLinks = screen
      .queryAllByRole("link")
      .filter((link) => (link.getAttribute("href") ?? "").startsWith("?part="));
    expect(tileLinks, "no copy of the tiles of WeekTileLinks").toHaveLength(0);
  });

  it("writes the done record of the book before the leave", async () => {
    let recordAtLeave: Record<string, boolean> | null = null;
    navigation.router.push.mockImplementation(() => {
      recordAtLeave = JSON.parse(window.localStorage.getItem("storytime:done") ?? "{}");
    });
    navigation.router.replace.mockImplementation(() => {
      recordAtLeave = JSON.parse(window.localStorage.getItem("storytime:done") ?? "{}");
    });
    await renderToEnd();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    await waitFor(() => expect(leaves()).toHaveLength(1));
    expect(recordAtLeave, "the leave reads a record").not.toBeNull();
    expect(recordAtLeave![DONE_KEY], `the record holds ${DONE_KEY} at the leave`).toBe(true);
  });

  it("leaves at a swipe past the last page too", async () => {
    const { container } = await renderToEnd();
    const root = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(root, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    await waitFor(() => expect(leaves()).toHaveLength(1));
    expectWeekHome(leaves()[0]);
    expect(container.querySelector("[data-reader-end]")).toBeNull();
  });
});

describe("the end of the question screen returns to the week home (finding 1)", () => {
  it("shows the question screen first and does not leave yet", async () => {
    const { container, book } = await renderToEnd({ questions: true });
    expect(book.questions?.length ?? 0, "the shipped book holds questions").toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(container.querySelector("[data-question-screen]"), "the question screen shows").not.toBeNull();
    expect(leaves(), "no leave while the questions show").toHaveLength(0);
  });

  it("leaves for the week home path when the child skips the questions", async () => {
    const { container } = await renderToEnd({ questions: true });
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    fireEvent.click(screen.getByRole("button", { name: questionLabels.skip }));
    await waitFor(() => expect(leaves()).toHaveLength(1));
    expectWeekHome(leaves()[0]);
    expect(container.querySelector("[data-question-end]"), "no tile copy at the question end").toBeNull();
  });

  it("leaves for the week home path when the last question is right", async () => {
    vi.useFakeTimers();
    const { StorytimeQuestions } = await import("../app/[locale]/st/[level]/[week]/questions");
    const book = readalong();
    const questions = [book.questions![0]!];
    const { container } = render(
      <StorytimeQuestions
        questions={questions}
        pages={book.pages}
        tiles={weekTiles()}
        locale="en"
        labels={questionLabels}
        mediaUrls={{}}
      />,
    );
    const right = container.querySelector<HTMLElement>(
      `[data-choice-page="${questions[0]!.answer.page}"]`,
    );
    expect(right, "the right choice renders").not.toBeNull();
    fireEvent.click(right!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(leaves(), "one leave after the last right answer").toHaveLength(1);
    expectWeekHome(leaves()[0]);
    expect(container.querySelector("[data-question-end]"), "no tile copy at the question end").toBeNull();
  });
});
