// @vitest-environment jsdom
/**
 * Task 7.5, reader level: the word mark after a stop and after a page turn (finding F2 of the 7.2
 * browser check; PM decision 2026-11-14: clear the mark on a mode stop; F1 stays out of scope).
 *
 * The harness runs the real reader on the shipped week 1 with a fake clock. The stub audio sends
 * `pause` and `seeked` as queued tasks after the call, as a browser does: the events come after
 * the reader has set the time to 0 and has reset the mark. That order is the F2 cause.
 *
 * Rows R1 to R3 fail at the base with an assertion (a marked word where none is due). Rows C1 and
 * C2 are the named characterization rows: they pass at the base and keep the mark that follows the
 * voice on a new page, and the mark of a tapped word after a stop.
 *
 * Red retry r2 (the look check of the 7.6 Green failed on the review build): the stub can now
 * send the real browser order after a host stop. `events.timeUpdate` makes every queued `pause`
 * and `seeked` event follow with a `timeupdate` at the same time. `events.delayMs` delays the
 * queued events by more than one frame (16 ms), so one animation frame of the read-along loop
 * runs between the host call and the first late event. Rows R4 and R5 use the full browser order
 * (a frame, then `pause` or `seeked`, then `timeupdate`). R9 is the slow-mode page turn in that
 * order. R6 is the slow-mode page turn with the late `timeupdate` alone. R7 and R8 send the late
 * `timeupdate` alone after the switch to My turn and after a page turn. R6 to R8 pass at the base:
 * the reader state is `idle` or `myTurn` before the late `timeupdate` runs, so its handler marks
 * nothing. The red cause is the frame of the read-along loop that runs before the late `pause`
 * event: the loop sync is not guarded after `reset()`.
 */
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

/** The reader book of a week, with a picture file on every page so the page turn waits for it. */
function readerBook(): StorytimeWeek["books"][number] {
  const copy = structuredClone(shipped);
  const book = copy.books.find((entry) => entry.kind === "readalong")!;
  for (const [index, page] of book.pages.entries()) {
    if (page.image) page.image.file ??= `review/${book.kind}-${index + 1}.jpg`;
  }
  (book.audio as unknown as { wordClips: Record<string, string> }).wordClips = { am: "words/am.mp3" };
  return book;
}

/** Loads the reader with a named assertion when the module is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof labels;
      mediaUrls: Record<string, string>;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client reader").toBeUndefined();
    throw error;
  }
}

/** The order of the events that the stub queues after a host call. */
const events = { delayMs: 0, timeUpdate: false };

/** Queues the events of a host call: the named event, and a `timeupdate` when the row asks. */
function queueEvents(target: HTMLMediaElement, name: "pause" | "seeked"): void {
  setTimeout(() => {
    target.dispatchEvent(new Event(name));
    if (events.timeUpdate) target.dispatchEvent(new Event("timeupdate"));
  }, events.delayMs);
}

/** The clock and the audio element of one rendered reader. */
interface Clock {
  /** The current playback time in seconds. */
  value: number;
  /** The rendered container. */
  container: HTMLElement;
  /** The page audio element. */
  audio: HTMLAudioElement;
}

/** Renders the reader with a controlled clock whose time writes queue a `seeked` event. */
async function renderReader(): Promise<Clock> {
  const Reader = await loadReader();
  const view = render(
    <Reader
      book={readerBook()}
      locale="en"
      labels={labels}
      mediaUrls={{ "words/am.mp3": "https://media.example/words/am.mp3" }}
    />,
  );
  const audio = view.container.querySelector<HTMLAudioElement>("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  const clock: Clock = { value: 0, container: view.container, audio: audio! };
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => clock.value,
    set: (value: number) => {
      clock.value = Number(value);
      queueEvents(audio!, "seeked");
    },
  });
  Object.defineProperty(audio, "readyState", { configurable: true, get: () => 4 });
  return clock;
}

/** Reads the data-word index of the marked word, or null when no word is marked. */
function litWord(container: HTMLElement): number | null {
  const lit = container.querySelector('[data-word][aria-current="true"]');
  return lit ? Number(lit.getAttribute("data-word")) : null;
}

/** Lets the queued browser events and the frame loop run for a number of milliseconds. */
async function settle(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Clicks one reader control. */
function press(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Starts "Read it to me" and moves the clock to a time inside page 1; the voice marks a word. */
async function listenOnPageOne(clock: Clock, time: number): Promise<void> {
  press(labels.readToMe);
  clock.value = time;
  await settle(32);
  expect(litWord(clock.container), "the voice must mark a word before the stop").not.toBeNull();
}

/** Presses Next and loads the hidden picture of the next page, so the page turns. */
async function turnPage(clock: Clock): Promise<void> {
  press(labels.nextPage);
  await settle(50);
  const hidden = clock.container.querySelector<HTMLImageElement>("img[hidden]");
  expect(hidden, "the page turn must wait for the next picture").not.toBeNull();
  fireEvent.load(hidden!);
  await settle(50);
  expect(screen.getByText("2 / 8"), "the reader must show page 2").toBeDefined();
}

/**
 * Plays page 1 in the slow mode, turns the page, and checks that no word is marked.
 * @param timeUpdate True when each late event is followed by a `timeupdate`.
 * @param delayMs The delay of the late events; 20 ms lets one frame run before them.
 */
async function slowTurn(timeUpdate: boolean, delayMs: number): Promise<void> {
  events.timeUpdate = timeUpdate;
  events.delayMs = delayMs;
  const clock = await renderReader();
  const first = readerBook().audio!.slowSentences!.find((sentence) => (sentence.page ?? 1) === 1)!;
  press(labels.slow);
  clock.value = first.startTime + 0.2;
  await settle(32);
  expect(litWord(clock.container), "the slow voice must mark a word before the turn").not.toBeNull();
  await turnPage(clock);
  await settle(1000);
  expect(litWord(clock.container), "the slow-mode page turn must leave no marked word").toBeNull();
}

describe("Task 7.5 word mark after a stop (finding F2)", () => {
  beforeEach(() => {
    events.delayMs = 0;
    events.timeUpdate = false;
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"],
    });
    // The browser fires `play` and, later, `pause`; jsdom fires neither, so the stub sends them.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
      queueEvents(this, "pause");
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("R1 a page turn leaves no marked word on the new page", async () => {
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.3);
    await turnPage(clock);
    expect(litWord(clock.container), "no word of page 2 may be marked before playback starts").toBeNull();
  });

  it("R2 the switch to My turn leaves no marked word", async () => {
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.3);
    press(labels.myTurn);
    await settle(50);
    expect(litWord(clock.container), "a stop to My turn must leave no marked word").toBeNull();
  });

  it("R3 the stop at the end of the page leaves no marked word", async () => {
    const clock = await renderReader();
    await listenOnPageOne(clock, 1.5);
    // The recorded sentence of page 1 ends at 1.706 s; the reader pauses at that time.
    clock.value = 1.71;
    fireEvent.timeUpdate(clock.audio);
    await settle(50);
    expect(litWord(clock.container), "the page-end stop must leave no marked word").toBeNull();
  });

  it("R4 the browser order after the switch to My turn leaves no marked word", async () => {
    events.delayMs = 20;
    events.timeUpdate = true;
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.5);
    press(labels.myTurn);
    await settle(1000);
    expect(litWord(clock.container), "a frame before the late events must not mark a word").toBeNull();
  });

  it("R5 the browser order after a page turn leaves no mark on page 2", async () => {
    events.delayMs = 20;
    events.timeUpdate = true;
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.5);
    await turnPage(clock);
    await settle(1000);
    expect(litWord(clock.container), "no word of page 2 may be marked after the late events").toBeNull();
  });

  it("R6 the slow-mode page turn with a late timeupdate leaves no marked word (characterization)", async () => {
    await slowTurn(true, 0);
  });

  it("R9 the browser order after a slow-mode page turn leaves no mark on page 2", async () => {
    await slowTurn(true, 20);
  });

  it("R7 a late timeupdate alone leaves no mark after the switch to My turn (characterization)", async () => {
    events.timeUpdate = true;
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.5);
    press(labels.myTurn);
    await settle(1000);
    expect(litWord(clock.container), "a timeupdate at the paused time must not mark a word").toBeNull();
  });

  it("R8 a late timeupdate alone leaves no mark on page 2 after a page turn (characterization)", async () => {
    events.timeUpdate = true;
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.5);
    await turnPage(clock);
    await settle(1000);
    expect(litWord(clock.container), "no word of page 2 may be marked after the late events").toBeNull();
  });

  it("C1 the voice marks the words of the new page after a page turn", async () => {
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.3);
    await turnPage(clock);
    press(labels.readToMe);
    // Page 2 starts at 2.906 s; the word "I" starts at 3.706 s (the shipped timings).
    clock.value = 3.8;
    await settle(32);
    expect(litWord(clock.container), "the voice must mark the word I of page 2").toBe(1);
  });

  it("C2 a word tap after a stop marks the tapped word while its clip plays", async () => {
    const clock = await renderReader();
    await listenOnPageOne(clock, 0.3);
    press(labels.myTurn);
    await settle(50);
    const word = clock.container.querySelector<HTMLElement>('[data-word="2"]');
    expect(word?.textContent, "the third word of page 1 is the word am").toBe("am");
    fireEvent.click(word!);
    await settle(50);
    expect(litWord(clock.container), "the tapped word must stay marked while its clip plays").toBe(2);
  });
});
