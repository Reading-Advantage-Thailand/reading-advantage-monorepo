// @vitest-environment jsdom
/**
 * Task 1.4: the reader changes the picture and the sentence together (AC-1.5; plan 1.4).
 *
 * After a press on Next the old sentence must stay until the new picture fires `load` (or the
 * 3-second timeout), so the child never reads a sentence over the wrong picture. The reader
 * changes the page at once today, so every hold case fails at the base with an assertion.
 *
 * The no-picture case is the named characterization: a page without a picture must not freeze.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};

const PAGE_ONE = "Hello, I am Pat.";
const PAGE_TWO = "Hello, I am May.";
const PAGE_THREE = "Hello, I am Sam.";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Creates a ready deep clone of the shipped week. */
function readyWeek(): StorytimeWeek {
  const copy = structuredClone(shipped);
  if (copy.approval) {
    copy.approval.images = { ...copy.approval.images, status: "approved" };
    copy.approval.audio = { ...copy.approval.audio, status: "approved" };
    copy.approval.song = { ...copy.approval.song, status: "approved" };
  }
  for (const book of copy.books) {
    for (const [index, page] of book.pages.entries()) {
      if (page.image) page.image.file ??= `review/${book.kind}-${index + 1}.jpg`;
    }
  }
  return copy;
}

/** Loads the Storytime client reader with a named assertion when the module is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof labels;
    }>;
  } catch (error) {
    expect(error, "Storytime must add the client reader at the documented path").toBeUndefined();
    throw error;
  }
}

/** Renders the reader on a cloned shipped week and returns its container and book. */
async function renderReader(source = readyWeek()) {
  const Reader = await loadReader();
  const book = source.books.find((entry) => entry.kind === "readalong");
  expect(book, "the shipped week must include a read-along book").toBeDefined();
  const result = render(<Reader book={book!} locale="en" labels={labels} />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  return { ...result, book: book!, audio: audio as HTMLAudioElement };
}

/** Returns the text of the visible page. */
function pageText(container: HTMLElement): string {
  return container.querySelector("[data-page-content]")?.textContent ?? "";
}

/** Returns the visible page number. */
function pageNumber(container: HTMLElement): string | null {
  return container.querySelector("[data-page-content]")?.getAttribute("data-page-number") ?? null;
}

/** Finds the picture of one page file in the document. */
function pictureFor(container: HTMLElement, file: string): HTMLImageElement | null {
  return (
    [...container.querySelectorAll<HTMLImageElement>("img")].find((image) =>
      (image.getAttribute("src") ?? "").endsWith(file),
    ) ?? null
  );
}

/** Returns the image file of one page of the book. */
function pageFile(book: StorytimeWeek["books"][number], page: number): string {
  const file = book.pages[page - 1]?.image?.file;
  expect(file, `page ${page} must have a picture file`).toBeTruthy();
  return file!;
}

describe("Task 1.4 reader page turn (AC-1.5)", () => {
  it("keeps the old sentence until the new picture loads, then changes both together", async () => {
    const { container, book } = await renderReader();
    expect(pageText(container), "the reader must start at page 1").toContain(PAGE_ONE);
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));

    const picture = pictureFor(container, pageFile(book, 2));
    expect(picture, "the new picture must be an img in the document (Q8)").not.toBeNull();
    expect(
      pageText(container),
      `the old sentence "${PAGE_ONE}" must stay until the new picture loads`,
    ).toContain(PAGE_ONE);
    expect(pageNumber(container), "the page number must stay 1 until the picture loads").toBe("1");

    fireEvent.load(picture!);
    expect(pageText(container), "the page 2 sentence must show after the load").toContain(PAGE_TWO);
    expect(pageNumber(container), "the page number must move to 2 with the sentence").toBe("2");
  });

  it("holds the old page for 2999 ms and changes at 3000 ms without a load", async () => {
    vi.useFakeTimers();
    const { container } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      `the old sentence "${PAGE_ONE}" must stay inside the hold window`,
    ).toContain(PAGE_ONE);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(
      pageText(container),
      "the old sentence must still show at 2999 ms",
    ).toContain(PAGE_ONE);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pageText(container), "the new sentence must show at 3000 ms").toContain(PAGE_TWO);
  });

  it("lets the page change when the picture reports an error", async () => {
    const { container, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      `the old sentence "${PAGE_ONE}" must stay while the picture loads`,
    ).toContain(PAGE_ONE);

    const picture = pictureFor(container, pageFile(book, 2));
    expect(picture, "the new picture must be an img in the document").not.toBeNull();
    fireEvent.error(picture!);
    expect(
      pageText(container),
      "a failed picture must not freeze the page (at most 3000 ms)",
    ).toContain(PAGE_TWO);
  });

  it("never shows the page 2 sentence during a rapid page 3 turn", async () => {
    const { container, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      `the old sentence "${PAGE_ONE}" must stay after the first Next`,
    ).toContain(PAGE_ONE);

    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      "the page 2 sentence must not stay on screen during the rapid turn",
    ).not.toContain(PAGE_TWO);
    expect(pageNumber(container), "the page number must still read 1").toBe("1");

    const picture = pictureFor(container, pageFile(book, 3));
    expect(picture, "the page 3 picture must be an img in the document").not.toBeNull();
    fireEvent.load(picture!);
    expect(pageText(container), "the rapid turn must end on page 3").toContain(PAGE_THREE);
  });

  it("changes at once when the next page has no picture", async () => {
    // Named characterization: a page with no picture cannot freeze on a `load` that never comes.
    const week = readyWeek();
    const book = week.books.find((entry) => entry.kind === "readalong")!;
    delete (book.pages[1] as unknown as { image?: unknown }).image;
    const { container } = await renderReader(week);
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      "a page with no picture must change at once",
    ).toContain(PAGE_TWO);
    expect(pageNumber(container)).toBe("2");
  });

  it("keeps the shown page's audio inside the hold window", async () => {
    const { container, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(
      pageText(container),
      `the old sentence "${PAGE_ONE}" must stay before the audio tap`,
    ).toContain(PAGE_ONE);

    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    const audio = container.querySelector("audio")!;
    expect(audio.getAttribute("src"), "the audio must use the book recording").toContain(book.audio!.file!);
    expect(
      pageText(container),
      "the audio of the hold must belong to the shown page",
    ).toContain(PAGE_ONE);
  });
});
