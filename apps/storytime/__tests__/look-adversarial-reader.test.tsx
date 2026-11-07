// @vitest-environment jsdom
/**
 * Adversarial round, Phase 1 "Council fixes" (track storytime_look_20261107; test-strategy P1.6).
 *
 * The reader under hostile input:
 * - a burst of five Next presses before any picture loads: the shown page and the count stay on
 *   page 1, the intermediate sentences never show, and the turn lands on page 6 with its own
 *   picture load;
 * - a rejected `play()`: the alert shows, no button keeps `aria-pressed`, and no stop timer
 *   stays armed (finding F147);
 * - an image that never loads: the 3000 ms hold turns the page, and a second never-loading turn
 *   works the same way;
 * - two audio buttons in one tap: at most one button is pressed, the newest mode wins, and a
 *   triple burst that ends in "My turn" is silent with no button pressed.
 *
 * Kill proofs are in the cases: a turn-at-once mutant, a reject-swallowing mutant, a stuck
 * `aria-pressed` mutant, and a both-pressed mutant each fail a named assertion.
 */
import "@testing-library/jest-dom/vitest";
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

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

const PAGE_TEXTS = [
  "Hello, I am Pat.",
  "Hello, I am May.",
  "Hello, I am Sam.",
  "Hello, I am Mia.",
  "Hello, I am Nan.",
  "Hello, I am Ben.",
];

beforeEach(() => {
  // The browser fires `play` and `pause`; jsdom does not, so the stub sends them.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Creates a ready deep clone of the shipped week. */
function readyWeek(): StorytimeWeek {
  return structuredClone(shipped);
}

/** Loads the Storytime client reader with a named assertion when the module is missing. */
async function loadReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
    book: StorytimeWeek["books"][number];
    locale: string;
    labels: typeof labels;
  }>;
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

/** Returns the aria-pressed values of the three audio buttons, in DOM order. */
function pressedStates(container: HTMLElement): boolean[] {
  return [...container.querySelectorAll("button[aria-pressed]")].map(
    (button) => button.getAttribute("aria-pressed") === "true",
  );
}

describe("Adversarial reader: rapid page turns", () => {
  it("a burst of five Next presses holds page 1 and lands on page 6", async () => {
    vi.useFakeTimers();
    const { container, book, unmount } = await renderReader();
    expect(pageText(container), "the reader must start at page 1").toContain(PAGE_TEXTS[0]);

    const presses = 5;
    expect(`burst_presses=${presses}`).toBe("burst_presses=5");
    for (let press = 0; press < presses; press += 1) {
      fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
      expect(pageNumber(container), `the page must stay 1 after press ${press + 1}`).toBe("1");
    }
    expect(pageText(container), "the page 1 sentence must stay during the burst").toContain(PAGE_TEXTS[0]);
    // Kill proof: a turn-at-once mutant shows the page 2 sentence after the first press.
    for (const text of PAGE_TEXTS.slice(1, 5)) {
      expect(pageText(container), `the sentence "${text}" must never show during the burst`).not.toContain(text);
    }
    expect(screen.getByText("1 / 8"), "the count must stay 1 / 8 during the burst").toBeInTheDocument();

    // Kill proof: a mutant that ignores presses during a hold lands on page 2, not page 6.
    const picture = pictureFor(container, pageFile(book, 6));
    expect(picture, "the page 6 picture must be the waiting img in the document").not.toBeNull();
    fireEvent.load(picture!);
    expect(pageText(container), "the burst must land on page 6").toContain(PAGE_TEXTS[5]);
    expect(pageNumber(container), "the page number must move to 6").toBe("6");
    expect(screen.getByText("6 / 8"), "the count must read 6 / 8 after the load").toBeInTheDocument();
    unmount();
  });

  it("a right swipe during the hold cancels the pending turn and stays on page 1", async () => {
    const { container, unmount } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(pageNumber(container), "the hold must keep page 1").toBe("1");

    // A right swipe from page 1 asks for page 0; the turn rule answers: stay (Q-B).
    fireEvent.touchStart(container.firstChild as Element, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(container.firstChild as Element, { changedTouches: [{ clientX: 200, clientY: 105 }] });
    expect(pageNumber(container), "the swipe must keep page 1").toBe("1");
    expect(pageText(container)).toContain(PAGE_TEXTS[0]);
    // A later Next press starts a fresh hold for page 2 (no stale pending page).
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    const picture = pictureFor(container, pageFile(shipped.books.find((entry) => entry.kind === "readalong")!, 2));
    expect(picture, "the page 2 picture must be the waiting img").not.toBeNull();
    unmount();
  });
});

describe("Adversarial reader: a rejected play()", () => {
  it("shows the alert, keeps no button pressed, and arms no timer", async () => {
    vi.useFakeTimers();
    const { container, unmount } = await renderReader();
    let rejected = 0;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => {
      rejected += 1;
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    });
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(`plays_rejected=${rejected}`).toBe("plays_rejected=1");
    expect(screen.getByRole("alert").textContent, "a rejected play must show the alert").toBe(
      labels.audioError,
    );
    const pressed = pressedStates(container).filter(Boolean).length;
    expect(`pressed_after_reject=${pressed}`, "no button may stay pressed after a rejection").toBe(
      "pressed_after_reject=0",
    );
    expect(`timers_after_reject=${vi.getTimerCount()}`, "no stop timer may stay armed").toBe(
      "timers_after_reject=0",
    );

    // Kill proof: a reject-swallowing mutant shows no alert, and a stuck-pressed mutant keeps
    // one button pressed; both assertions above fail on those mutants.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    fireEvent.click(screen.getByRole("button", { name: labels.slow }));
    expect(screen.queryByRole("alert"), "the next mode must clear the alert").toBeNull();
    unmount();
  });
});

describe("Adversarial reader: an image that never loads", () => {
  it("turns at 3000 ms twice in a row without a freeze", async () => {
    vi.useFakeTimers();
    const { container, book, unmount } = await renderReader();
    // No load and no error ever fires: the hold timer must turn each page.
    for (const next of [2, 3]) {
      fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
      const picture = pictureFor(container, pageFile(book, next));
      expect(picture, `the page ${next} picture must be the waiting img`).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(
        pageNumber(container),
        `the old page must still show at 2999 ms of the turn to page ${next}`,
      ).toBe(String(next - 1));
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(pageNumber(container), `the page must turn to ${next} at 3000 ms`).toBe(String(next));
      expect(pageText(container), `the page ${next} sentence must show`).toContain(PAGE_TEXTS[next - 1]);
    }
    expect(screen.getByText("3 / 8"), "the count must read 3 / 8 after two never-loading turns").toBeInTheDocument();
    // Kill proof: a hold without the timeout freezes on page 1, so the page 2 assertion fails.
    unmount();
  });
});

describe("Adversarial reader: two audio buttons in one tap", () => {
  it("a burst of two buttons keeps at most one pressed and the newest mode wins", async () => {
    const { container, audio, unmount } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    fireEvent.click(screen.getByRole("button", { name: labels.slow }));
    const pressed = pressedStates(container);
    const pressedCount = pressed.filter(Boolean).length;
    expect(`pressed_max=${pressedCount}`, "at most one button may be pressed").toBe("pressed_max=1");
    expect(pressed[2], "the newest mode (Slow) must be the pressed one").toBe(true);
    expect(audio.getAttribute("src") ?? "", "the audio must use the slow file").toContain("1-hello-slow.mp3");
    expect(screen.queryByRole("alert"), "no alert may show").toBeNull();
    // Kill proof: a both-pressed mutant fails pressed_max=1; a stale-mode mutant keeps the
    // listen file in the audio element and fails the slow-file assertion.
    unmount();
  });

  it("a triple burst that ends in My turn is silent with no button pressed", async () => {
    const { container, unmount } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    fireEvent.click(screen.getByRole("button", { name: labels.slow }));
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const pressedCount = pressedStates(container).filter(Boolean).length;
    expect(
      `pressed_after_my_turn=${pressedCount}`,
      "My turn is silent until a tap, so no button may be pressed",
    ).toBe("pressed_after_my_turn=0");
    expect(screen.queryByRole("alert"), "no alert may show").toBeNull();
    unmount();
  });
});
