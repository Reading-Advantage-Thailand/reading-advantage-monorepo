// @vitest-environment jsdom
/**
 * Task 1.5: playing feedback, the filled Next button, and the page count (AC-1.6; plan 1.5).
 *
 * While a sound plays its button carries `aria-pressed="true"` and the label `playerPlaying`
 * ("Playing"); at most one audio button is pressed. Next is the filled main button at 48 px or
 * more, the audio buttons stay outlined, and a page count "1 / N" sits between the arrows and
 * moves with the page. The reader has no `aria-pressed` and no count today, so those cases fail
 * at the base. The rejected-play case is the named characterization: a failed sound must not
 * leave a pressed button.
 */
import "@testing-library/jest-dom/vitest";
// The media of a week now comes from the signed map of the page (login task 2b.6). The mock gives
// a URL for every file, so the pictures and the audio keep a source and the assertions stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const decodableLabels = {
  soundOfWeek: "Sound of the week",
  playSound: "Play the sound",
  trickyWords: "Tricky words",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "The sound could not be played.",
  playing: "Playing",
};

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

const PAGE_ONE = "Hello, I am Pat.";
const PAGE_TWO = "Hello, I am May.";

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
  for (const book of copy.books) {
    for (const [index, page] of book.pages.entries()) {
      if (page.image) page.image.file ??= `review/${book.kind}-${index + 1}.jpg`;
    }
  }
  return copy;
}

/** Loads the decodable component with a named assertion when it is missing. */
async function loadDecodable() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeDecodable as ComponentType<{
      week: StorytimeWeek;
      locale: string;
      labels: typeof decodableLabels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client decodable UI").toBeUndefined();
    throw error;
  }
}

/** Loads the reader component with a named assertion when it is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof readerLabels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client reader").toBeUndefined();
    throw error;
  }
}

/** Renders the decodable for the shipped w01 week. */
async function renderDecodable() {
  const Decodable = await loadDecodable();
  const week = structuredClone(shipped);
  return render(<Decodable week={week} locale="en" labels={decodableLabels} />);
}

/** Renders the reader for the shipped w01 read-along book. */
async function renderReader() {
  const Reader = await loadReader();
  const week = readyWeek();
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  const result = render(<Reader book={book} locale="en" labels={readerLabels} />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the reader must render its audio element").not.toBeNull();
  return { ...result, book, audio: audio as HTMLAudioElement };
}

/** Returns the visible page text. */
function pageText(container: HTMLElement): string {
  return container.querySelector("[data-page-content]")?.textContent ?? "";
}

/** Reads the minimum height of one class list. */
function minHeightPx(className: string): number {
  let best = 0;
  for (const token of className.split(/\s+/)) {
    const scale = /^min-h-(\d+)$/.exec(token) ?? /^h-(\d+)$/.exec(token);
    if (scale) best = Math.max(best, Number(scale[1]) * 4);
    const pixels = /^min-h-\[(\d+)px\]$/.exec(token);
    if (pixels) best = Math.max(best, Number(pixels[1]));
  }
  return best;
}

/** Reports whether a class list carries a fill colour token. */
function hasFillToken(className: string): boolean {
  return className
    .split(/\s+/)
    .some((token) => /^bg-/.test(token) && !/^bg-(white|transparent|none)$/.test(token) && !/^bg-neutral-/.test(token));
}

/** Reports whether a class list carries a text colour token. */
function hasTextColorToken(className: string): boolean {
  return className.split(/\s+/).some((token) =>
    /^text-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})$/.test(
      token,
    ),
  );
}

/** Counts the pressed buttons of one container. */
function pressedCount(container: HTMLElement): number {
  return [...container.querySelectorAll("button")].filter(
    (button) => button.getAttribute("aria-pressed") === "true",
  ).length;
}

/** Turns one page and lets the 3-second hold expire. */
function turnPage(next: HTMLElement): void {
  fireEvent.click(next);
  act(() => {
    vi.advanceTimersByTime(3000);
  });
}

describe("Task 1.5 feedback and Next (AC-1.6)", () => {
  it("shows the playing label and aria-pressed on the decodable sound while it plays", async () => {
    const { container } = await renderDecodable();
    const button = screen.getByRole("button", { name: decodableLabels.playSound });
    const phoneme = container.querySelectorAll("audio")[0]!;
    expect(phoneme, "the decodable must render its phoneme audio element").toBeTruthy();

    fireEvent.click(button);
    fireEvent.play(phoneme);
    expect(
      button.getAttribute("aria-pressed"),
      "the decodable sound button must read aria-pressed=true while its sound plays",
    ).toBe("true");
    expect(button.textContent, "the decodable sound button must show the playing label").toBe(
      decodableLabels.playing,
    );

    fireEvent.ended(phoneme);
    expect(button.getAttribute("aria-pressed"), "the ended sound must release the button").not.toBe("true");
    expect(button.textContent, "the ended sound must show the play label again").toBe(
      decodableLabels.playSound,
    );
  });

  it("presses only the reader audio button of the mode that plays", async () => {
    const { container, audio } = await renderReader();
    const readButton = screen.getByRole("button", { name: readerLabels.readToMe });
    const slowButton = screen.getByRole("button", { name: readerLabels.slow });
    const myTurnButton = screen.getByRole("button", { name: readerLabels.myTurn });

    fireEvent.click(readButton);
    fireEvent.play(audio);
    expect(readButton.getAttribute("aria-pressed"), "read-to-me must be pressed while it plays").toBe("true");
    expect(readButton.textContent, "read-to-me must show the playing label").toBe(readerLabels.playing);
    expect(pressedCount(container), "at most one audio button may be pressed").toBeLessThanOrEqual(1);

    fireEvent.click(slowButton);
    fireEvent.play(audio);
    expect(slowButton.getAttribute("aria-pressed"), "slow must be pressed while it plays").toBe("true");
    expect(readButton.getAttribute("aria-pressed"), "read-to-me must release the button").not.toBe("true");
    expect(pressedCount(container), "pressed_max must stay 1").toBeLessThanOrEqual(1);

    fireEvent.click(myTurnButton);
    const word = container.querySelector<HTMLElement>("[data-word]");
    expect(word, "the reader must render a tappable word").not.toBeNull();
    fireEvent.click(word!);
    fireEvent.play(audio);
    expect(myTurnButton.getAttribute("aria-pressed"), "my-turn must be pressed during its word cut").toBe("true");
    expect(pressedCount(container), "pressed_max must stay 1 across the modes").toBeLessThanOrEqual(1);
    expect(`pressed_max=${pressedCount(container)}`).toBe("pressed_max=1");
  });

  it("makes Next the filled main button and keeps the audio buttons outlined", async () => {
    const { container } = await renderReader();
    const next = screen.getByRole("button", { name: readerLabels.nextPage });
    const nextClass = next.className;
    expect(hasFillToken(nextClass), "Next must be the filled main button").toBe(true);
    expect(minHeightPx(nextClass), "Next must be 48 px high or more").toBeGreaterThanOrEqual(48);
    expect(hasTextColorToken(nextClass), "Next must carry a text colour token").toBe(true);

    for (const name of [readerLabels.readToMe, readerLabels.myTurn, readerLabels.slow]) {
      const button = screen.getByRole("button", { name });
      expect(button.className.split(/\s+/), `${name} must keep its outline`).toContain("border");
      expect(hasFillToken(button.className), `${name} must stay outlined and unfilled`).toBe(false);
    }
    expect(container).toBeInTheDocument();
  });

  it("shows the page count between the arrows and moves it on every turn", async () => {
    vi.useFakeTimers();
    const { container, book } = await renderReader();
    const pages = book.pages.length;
    expect(pages, "pages_n must be greater than one").toBeGreaterThan(1);
    expect(`pages_n=${pages}`).toBe("pages_n=8");

    const first = screen.queryByText("1 / 8");
    expect(first, "the reader must show the page count 1 / 8").not.toBeNull();
    const previous = screen.getByRole("button", { name: readerLabels.previousPage });
    const next = screen.getByRole("button", { name: readerLabels.nextPage });
    expect(
      previous.compareDocumentPosition(first!) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the count must sit after the Previous arrow",
    ).toBeTruthy();
    expect(
      first!.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the count must sit before the Next arrow",
    ).toBeTruthy();

    turnPage(next);
    expect(screen.queryByText("2 / 8"), "the count must read 2 / 8 after one turn").not.toBeNull();
    fireEvent.click(previous);
    expect(screen.queryByText("1 / 8"), "the count must read 1 / 8 after Previous").not.toBeNull();

    for (let index = 1; index < pages; index += 1) turnPage(next);
    expect(screen.queryByText("8 / 8"), "the count must read 8 / 8 on the last page").not.toBeNull();
    expect(screen.getByRole("button", { name: readerLabels.nextPage }), "Next must stop at page 8").toBeDisabled();
    expect(container).toBeInTheDocument();
  });

  it("never runs the count ahead of the sentence", async () => {
    vi.useFakeTimers();
    const { container, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: readerLabels.nextPage }));
    expect(
      pageText(container),
      `the page 1 sentence "${PAGE_ONE}" must stay while the turn waits`,
    ).toContain(PAGE_ONE);
    expect(screen.queryByText("2 / 8"), "the count must not read 2 / 8 on page 1").toBeNull();

    const picture = [...container.querySelectorAll<HTMLImageElement>("img")].find((image) =>
      (image.getAttribute("src") ?? "").endsWith(book.pages[1]!.image!.file!),
    );
    expect(picture, "the page 2 picture must be an img in the document").not.toBeNull();
    fireEvent.load(picture!);
    expect(pageText(container), "the sentence must move with the count").toContain(PAGE_TWO);
    expect(screen.queryByText("2 / 8"), "the count must read 2 / 8 with the page 2 sentence").not.toBeNull();
  });

  it("leaves no button pressed after a rejected play", async () => {
    // Named characterization: the base already shows the alert and no pressed state.
    const { container } = await renderDecodable();
    const button = screen.getByRole("button", { name: decodableLabels.playSound });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("The play request was rejected.", "NotAllowedError"),
    );
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole("alert"), "a rejected play must show the alert").not.toBeNull());
    expect(button.getAttribute("aria-pressed"), "a rejected play must not leave aria-pressed=true").not.toBe(
      "true",
    );
    expect(pressedCount(container), "a rejected play must leave no pressed button").toBe(0);
  });
});
