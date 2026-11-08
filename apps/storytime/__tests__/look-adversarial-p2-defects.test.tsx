// @vitest-environment jsdom
/**
 * The two failing adversarial cases of the look of Phase 2 (track storytime_look_20261107).
 *
 * These cases fail on the audited code head be5b22394398e0c0c7117a5e347674f64e9721dd. They are
 * the Red proof for Green, and they leave the commit of the passing cases.
 *
 *   K2a a rapid mode-switch storm shows a false sound-error alert. The reader writes a new src
 *        to the sentence audio on every mode switch, so the browser aborts the pending play with
 *        an AbortError, and the reader treats every rejected play as a failure.
 *        The defect sits in apps/storytime/app/[locale]/st/[level]/[week]/reader.tsx lines
 *        243-256. The decodable holds the guard at decodable.tsx lines 244-274 (finding F120).
 *   S4b a one-page book never records its finish. The done write needs book.pages.length > 1.
 *        The defect sits in apps/storytime/app/[locale]/st/[level]/[week]/reader.tsx line 202.
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

/** The reader labels of the test. */
const readerLabels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};

/** The localStorage key of the per-device completion record. */
const DONE_KEY = "storytime:done";

/**
 * Reads the read-along book of one week.
 * @param week The week.
 * @returns The read-along book.
 */
function readerBook(week: StorytimeWeek): StorytimeWeek["books"][number] {
  return week.books.find((entry) => entry.kind === "readalong")!;
}

/**
 * Builds a book with a count of pages that hold no picture.
 * @param week The week.
 * @param count The number of pages.
 * @returns The book.
 */
function bookWithPages(week: StorytimeWeek, count: number): StorytimeWeek["books"][number] {
  const book = structuredClone(readerBook(week));
  const first = book.pages[0]!;
  book.pages = Array.from({ length: count }, () => {
    const page = structuredClone(first);
    page.image = undefined;
    return page;
  });
  return book;
}

/**
 * Builds the signed-URL map of one week.
 * @param week The week.
 * @returns The map.
 */
function mediaUrlsOf(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const book of week.books) {
    if (book.audio?.file) urls[book.audio.file] = `https://media.example/${book.audio.file}`;
    if (book.audio?.slowFile) urls[book.audio.slowFile] = `https://media.example/${book.audio.slowFile}`;
  }
  return urls;
}

/**
 * Loads the client reader with a named assertion when the module is missing.
 * @returns The reader component.
 */
async function loadReader(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeReader: ComponentType<Record<string, unknown>>;
  };
  return loaded.StorytimeReader;
}

/**
 * Builds the DOMException of an aborted play, as a browser raises it when a new load starts.
 * @returns The abort error.
 */
function abortError(): DOMException {
  return new DOMException("The play() request was interrupted by a new load request.", "AbortError");
}

/** The pending play promises of the current test. */
let pending: Array<{ element: HTMLMediaElement; reject: (reason: unknown) => void }> = [];

beforeEach(() => {
  window.localStorage.clear();
  pending = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    // A new load on the same element aborts the pending play of that element, as a browser does.
    for (const entry of pending) {
      if (entry.element === this) entry.reject(abortError());
    }
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    pending.push({ element: this, reject });
    // The browser fires the play event in a later task, so the click handler has finished.
    queueMicrotask(() => this.dispatchEvent(new Event("play")));
    return promise;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the failing adversarial cases of the look of Phase 2", () => {
  it("K2a a rapid mode-switch storm raises no false error", async () => {
    const week = structuredClone(shipped);
    const Reader = await loadReader();
    const { container, unmount } = render(
      <Reader
        book={readerBook(week)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
      />,
    );
    const readToMe = screen.getByRole("button", { name: readerLabels.readToMe });
    const slow = screen.getByRole("button", { name: readerLabels.slow });
    for (let turn = 0; turn < 6; turn += 1) {
      fireEvent.click(readToMe);
      await act(async () => {
        await Promise.resolve();
      });
      fireEvent.click(slow);
      await act(async () => {
        await Promise.resolve();
      });
    }
    const pressed = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
    expect(pressed.length, "one mode button must stay pressed after the storm").toBe(1);
    expect(
      screen.queryByRole("alert"),
      "a mode switch must not show the sound error (the browser aborts the pending play)",
    ).toBeNull();
    unmount();
  });

  it("S4b a one-page book records its own finish", async () => {
    const Reader = await loadReader();
    const week = structuredClone(shipped);
    const { unmount } = render(
      <Reader
        book={bookWithPages(week, 1)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
        doneKey="2:1:book"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const record = JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "{}") as Record<string, boolean>;
    expect(`one_page_record=${JSON.stringify(record)}`, "a one-page book must record its finish").toBe(
      'one_page_record={"2:1:book":true}',
    );
    unmount();
  });
});
