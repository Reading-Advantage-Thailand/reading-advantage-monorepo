// @vitest-environment jsdom
/**
 * Task 1.9: the read-along highlight keeps every word (AC-1.11; plan 1.9, strategy P1.2 H1 to H7).
 *
 * The reader moves the highlight only on the browser `timeupdate` (about every 250 ms) and skips
 * short words. The harness runs the real reader against the real week timings with a fake clock:
 * one `requestAnimationFrame` each 16 ms, `timeupdate` at the browser cadence, and 4 phases of the
 * first update. The pure helper `lib/highlight-windows.ts` gives every word a window of at least
 * 0.12 s, borrowed from the next word.
 *
 * At the base H1, H2, H3, H4, and H6 fail with an assertion; H5 and H7 are the named
 * characterization cases (H5: the "My turn" cut keeps the original timings; H7: the loop stops on
 * pause and `ended`).
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const helperPath = resolve(app, "lib/highlight-windows.ts");
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

/** The four unknown phases of the first `timeupdate`, in ms after `play`. */
const PHASES = [0, 80, 160, 240];

/** One word timing with its fields. */
interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/** The reader book of the shipped week. */
function readerBook(source: StorytimeWeek): StorytimeWeek["books"][number] {
  const book = source.books.find((entry) => entry.kind === "readalong");
  expect(book, "the shipped week must hold a read-along book").toBeDefined();
  return book!;
}

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

/** Cuts the read-along book to one page and renumbers that page's sentences to page 1. */
function pageBook(source: StorytimeWeek, page: number): StorytimeWeek["books"][number] {
  const book = readerBook(source);
  book.pages = [book.pages[page - 1]!];
  const audio = book.audio!;
  for (const key of ["sentences", "slowSentences"] as const) {
    const list = audio[key];
    if (!list) continue;
    audio[key] = list
      .filter((sentence) => (sentence.page ?? 1) === page)
      .map((sentence) => ({ ...sentence, page: 1 }));
  }
  return book;
}

/** Returns the styling of the fake timers: frames and the clock. */
function useFrames(): void {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"],
  });
}

/** Loads the reader with a named assertion when the module is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof labels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client reader").toBeUndefined();
    throw error;
  }
}

/** The clock and the audio element of one rendered page. */
interface Clock {
  /** The current playback time in seconds. */
  value: number;
  /** The rendered container. */
  container: HTMLElement;
  /** The page audio element. */
  audio: HTMLAudioElement;
}

/** Renders one page of the reader with a controlled clock and a ready audio element. */
async function renderPage(
  page: number,
  wordClips?: Record<string, string>,
): Promise<{ clock: Clock; unmount: () => void }> {
  const Reader = await loadReader();
  const book = pageBook(readyWeek(), page);
  if (wordClips) (book.audio as unknown as { wordClips: Record<string, string> }).wordClips = wordClips;
  const view = render(<Reader book={book} locale="en" labels={labels} />);
  const audio = view.container.querySelector<HTMLAudioElement>("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  const clock: Clock = { value: 0, container: view.container, audio: audio! };
  Object.defineProperty(clock.audio, "currentTime", {
    configurable: true,
    get: () => clock.value,
    set: (value: number) => {
      clock.value = Number(value);
    },
  });
  Object.defineProperty(clock.audio, "readyState", { configurable: true, get: () => 4 });
  return { clock, unmount: view.unmount };
}

/** Returns the words of one page in reading order. */
function pageWords(source: StorytimeWeek, page: number): WordTiming[] {
  const book = readerBook(source);
  return (book.audio!.sentences ?? [])
    .filter((sentence) => (sentence.page ?? 1) === page)
    .flatMap((sentence) => sentence.words);
}

/** Returns the sentence bounds of one page. */
function pageBounds(source: StorytimeWeek, page: number): { start: number; end: number } {
  const book = readerBook(source);
  const own = (book.audio!.sentences ?? []).filter((sentence) => (sentence.page ?? 1) === page);
  return { start: own[0]!.startTime, end: own.at(-1)!.endTime };
}

/** Reads the lit word index of the current frame. */
function litWord(container: HTMLElement): number | null {
  const lit = container.querySelector('[data-word][aria-current="true"]');
  return lit ? Number(lit.getAttribute("data-word")) : null;
}

/**
 * Runs the fake clock over one page in one mode.
 * @param clock The controlled clock.
 * @param bounds The sentence bounds of the page.
 * @param phaseMs The delay of the first `timeupdate`.
 * @returns The lit sequence (consecutive repeats removed), the frames, and the frames per word.
 */
async function runClock(
  clock: Clock,
  bounds: { start: number; end: number },
  phaseMs: number,
): Promise<{ sequence: number[]; frames: number; framesByWord: Map<number, number> }> {
  const stepMs = 16;
  let time = bounds.start;
  let elapsed = 0;
  let nextUpdate = phaseMs;
  let frames = 0;
  const sequence: number[] = [];
  const framesByWord = new Map<number, number>();
  while (time < bounds.end + 0.1) {
    clock.value = time;
    if (elapsed >= nextUpdate) {
      fireEvent.timeUpdate(clock.audio);
      nextUpdate += 250;
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs);
    });
    const lit = litWord(clock.container);
    if (lit !== null) {
      if (sequence.at(-1) !== lit) sequence.push(lit);
      framesByWord.set(lit, (framesByWord.get(lit) ?? 0) + 1);
    }
    frames += 1;
    time += stepMs / 1000;
    elapsed += stepMs;
  }
  return { sequence, frames, framesByWord };
}

/** Clicks one reader mode button. */
function startMode(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("Task 1.9 read-along highlight (AC-1.11)", () => {
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("H1 listen mode lights every word of every page in order at 4 phases", async () => {
    useFrames();
    const pages = new Set((readerBook(readyWeek()).audio!.sentences ?? []).map((sentence) => sentence.page ?? 1));
    const pagesRun = pages.size;
    const wordsChecked = [...pages].reduce((sum, page) => sum + pageWords(readyWeek(), page).length, 0);
    expect(`pages_run=${pagesRun}`).toBe("pages_run=8");
    expect(`words_checked=${wordsChecked}`).toBe("words_checked=33");
    expect(`phases=${PHASES.length}`).toBe("phases=4");

    const failedPages = new Set<number>();
    const details: string[] = [];
    let framesSeen = 0;
    for (const page of [...pages].sort((a, b) => a - b)) {
      const expected = pageWords(readyWeek(), page).map((_, index) => index);
      const bounds = pageBounds(readyWeek(), page);
      for (const phase of PHASES) {
        const { clock, unmount } = await renderPage(page);
        startMode(labels.readToMe);
        const run = await runClock(clock, bounds, phase);
        unmount();
        framesSeen += run.frames;
        if (run.frames <= 100) details.push(`page ${page}: frames_run=${run.frames} is not above 100`);
        if (JSON.stringify(run.sequence) !== JSON.stringify(expected)) {
          failedPages.add(page);
          details.push(`page ${page} listen: lit words [${run.sequence.join(",")}], expected [${expected.join(",")}]`);
        }
      }
    }
    expect(framesSeen, "frames_run must stay above 100").toBeGreaterThan(100);
    expect(details.slice(0, 3).join("; ") || "none", "the highlight must not skip a word").toBe("none");
    expect(
      `pages_failed_listen=${failedPages.size}`,
      `pages_failed_listen must be 0; first failures: ${details.slice(0, 3).join("; ")}`,
    ).toBe("pages_failed_listen=0");
  });

  it("H2 listen mode keeps every word lit for at least 7 frames", async () => {
    useFrames();
    const pages = [...new Set((readerBook(readyWeek()).audio!.sentences ?? []).map((s) => s.page ?? 1))].sort(
      (a, b) => a - b,
    );
    let litFramesMin = Number.POSITIVE_INFINITY;
    let wordsLit = 0;
    let framesSeen = 0;
    for (const page of pages) {
      const expected = pageWords(readyWeek(), page).map((_, index) => index);
      const { clock, unmount } = await renderPage(page);
      startMode(labels.readToMe);
      const run = await runClock(clock, pageBounds(readyWeek(), page), 0);
      unmount();
      framesSeen += run.frames;
      wordsLit += run.framesByWord.size;
      for (const index of expected) {
        litFramesMin = Math.min(litFramesMin, run.framesByWord.get(index) ?? 0);
      }
    }
    expect(framesSeen, "frames_run must stay above 100").toBeGreaterThan(100);
    expect(wordsLit, "words_lit must stay above 0").toBeGreaterThan(0);
    expect(
      `lit_frames_min=${litFramesMin}`,
      "every word must stay lit for at least 7 frames (112 ms)",
    ).toMatch(/^lit_frames_min=(?:[7-9]|[1-9][0-9]+)$/);
    expect(litFramesMin, "lit_frames_min must be at least 7").toBeGreaterThanOrEqual(7);
  });

  it("H3 slow mode lights every word of every page in order at 4 phases", async () => {
    useFrames();
    const book = readerBook(readyWeek());
    expect(book.audio!.slowFile, "the shipped week must hold a slow recording").toBeTruthy();
    const slow = book.audio!.slowSentences ?? [];
    expect(slow.length, "the shipped week must hold slow sentence timings").toBeGreaterThan(0);
    const pages = [...new Set(slow.map((sentence) => sentence.page ?? 1))].sort((a, b) => a - b);
    const wordsChecked = pages.reduce(
      (sum, page) =>
        sum +
        slow.filter((sentence) => (sentence.page ?? 1) === page).flatMap((sentence) => sentence.words).length,
      0,
    );
    expect(`pages_run=${pages.length}`).toBe("pages_run=8");
    expect(`words_checked=${wordsChecked}`).toBe("words_checked=33");

    const failedPages = new Set<number>();
    const details: string[] = [];
    for (const page of pages) {
      const own = slow.filter((sentence) => (sentence.page ?? 1) === page);
      const expected = own.flatMap((sentence) => sentence.words).map((_, index) => index);
      const bounds = { start: own[0]!.startTime, end: own.at(-1)!.endTime };
      for (const phase of PHASES) {
        const { clock, unmount } = await renderPage(page);
        startMode(labels.slow);
        const run = await runClock(clock, bounds, phase);
        unmount();
        if (JSON.stringify(run.sequence) !== JSON.stringify(expected)) {
          failedPages.add(page);
          details.push(`page ${page} slow: lit words [${run.sequence.join(",")}], expected [${expected.join(",")}]`);
        }
      }
    }
    expect(details.slice(0, 3).join("; ") || "none", "the slow highlight must not skip a word").toBe("none");
    expect(
      `pages_failed_slow=${failedPages.size}`,
      `pages_failed_slow must be 0; first failures: ${details.slice(0, 3).join("; ")}`,
    ).toBe("pages_failed_slow=0");
  });

  it("H4 the helper gives every word a window of at least 0.12 s in order", async () => {
    expect(existsSync(helperPath), "Missing apps/storytime/lib/highlight-windows.ts").toBe(true);
    const modulePath = "../lib/highlight-windows";
    const helper = await import(/* @vite-ignore */ modulePath);
    expect(
      typeof (helper as { highlightWindows?: unknown }).highlightWindows,
      "lib/highlight-windows.ts must export highlightWindows",
    ).toBe("function");
    const highlightWindows = (helper as {
      highlightWindows: (words: WordTiming[], minSeconds?: number) => { start: number; end: number }[];
    }).highlightWindows;
    const min = (helper as { MIN_WORD_WINDOW_S?: number }).MIN_WORD_WINDOW_S;
    expect(min, "MIN_WORD_WINDOW_S must be 0.12").toBe(0.12);
    const minSeconds = 0.12;
    const EPS = 1e-6;

    const shippedPages = [...new Set((readerBook(readyWeek()).audio!.sentences ?? []).map((s) => s.page ?? 1))];
    const shippedLists = shippedPages.map((page) => pageWords(readyWeek(), page));
    const shortWords = shippedLists.flat().filter((word) => word.end - word.start < minSeconds);
    expect(`shipped_short_words=${shortWords.length}`).toBe("shipped_short_words=3");
    expect(shortWords.length, "shipped_short_words must stay at two or more").toBeGreaterThanOrEqual(2);

    const hostile: WordTiming[][] = [
      [
        { word: "zero", start: 1, end: 1 },
        { word: "next", start: 2, end: 2.2 },
      ],
      [
        { word: "a", start: 1, end: 1.5 },
        { word: "b", start: 1, end: 1.6 },
        { word: "c", start: 1.8, end: 2 },
      ],
      Array.from({ length: 5 }, (_, index) => ({
        word: `t${index}`,
        start: index * 0.04,
        end: index * 0.04 + 0.04,
      })),
      [
        { word: "a", start: 0, end: 0.5 },
        { word: "b", start: 0.46, end: 1 },
        { word: "c", start: 1.1, end: 1.4 },
      ],
    ];
    const lists = [...shippedLists, ...hostile];
    expect(`helper_lists=${lists.length}`).toBe("helper_lists=12");
    expect(lists.length, "helper_lists must stay at ten or more").toBeGreaterThanOrEqual(10);

    for (const words of lists) {
      const windows = highlightWindows(words, minSeconds);
      const label = `words [${words.map((word) => `${word.start}-${word.end}`).join(",")}]`;
      expect(windows.length, `P1: ${label} must keep the same length`).toBe(words.length);
      for (let index = 0; index < windows.length; index += 1) {
        expect(
          windows[index]!.end - windows[index]!.start,
          `P2: ${label} window ${index} must be at least 0.12 s`,
        ).toBeGreaterThanOrEqual(minSeconds - EPS);
        expect(
          windows[index]!.start,
          `P4: ${label} window ${index} must not start before its word`,
        ).toBeGreaterThanOrEqual(words[index]!.start - EPS);
        if (index > 0) {
          expect(
            windows[index]!.start,
            `P3: ${label} window ${index} must not overlap the previous window`,
          ).toBeGreaterThanOrEqual(windows[index - 1]!.end - EPS);
          expect(
            windows[index]!.start,
            `P3: ${label} window ${index} must start after the previous start`,
          ).toBeGreaterThan(windows[index - 1]!.start);
        }
      }
    }

    const pageOne = shippedLists[0]!;
    const pageOneWindows = highlightWindows(pageOne, minSeconds);
    // P5: the time comes from the next word, never from the previous one.
    expect(pageOneWindows[0]!.start, "P5: a long first word keeps its start").toBeCloseTo(pageOne[0]!.start, 6);
    expect(pageOneWindows[1]!.start, "P5: a long unpushed word keeps its start").toBeCloseTo(pageOne[1]!.start, 6);
    expect(pageOneWindows[2]!.start, "P5: the short word keeps its own start").toBeCloseTo(pageOne[2]!.start, 6);
    expect(
      pageOneWindows[2]!.end,
      "P5: the short word ends at its own start plus 0.12",
    ).toBeCloseTo(pageOne[2]!.start + minSeconds, 6);
    expect(
      pageOneWindows[3]!.start,
      "P5: the next word starts later by the borrowed time",
    ).toBeGreaterThanOrEqual(pageOneWindows[2]!.end - EPS);

    // P6: words that are long enough and do not overlap come back unchanged.
    const unchangedWords = shippedLists[1]!;
    expect(highlightWindows(unchangedWords, minSeconds), "P6: a clean list must come back unchanged").toEqual(
      unchangedWords.map(({ start, end }) => ({ start, end })),
    );
    // P7: the empty list gives [].
    expect(highlightWindows([], minSeconds), "P7: the empty list must give []").toEqual([]);

    // The helper must reject four broken copies.
    const identity = (words: WordTiming[]) => words.map(({ start, end }) => ({ start, end }));
    expect(
      `identity_p2=${identity(pageOne).some((window) => window.end - window.start < minSeconds - EPS)}`,
      "a helper that returns the input must be rejected by P2",
    ).toBe("identity_p2=true");
    const shifted = (words: WordTiming[]) => words.map(({ start, end }) => ({ start: start + minSeconds, end: end + minSeconds }));
    expect(
      shifted(unchangedWords),
      "a helper that adds 0.12 s to every start must be rejected by P6",
    ).not.toEqual(unchangedWords.map(({ start, end }) => ({ start, end })));
    const dropped = (words: WordTiming[]) => words.filter((word) => word.end - word.start >= minSeconds);
    expect(
      `dropped_length=${dropped(pageOne).length}`,
      "a helper that drops short words must be rejected by P1",
    ).not.toBe(`length=${pageOne.length}`);
    const overlapping = [{ start: 0, end: 0.5 }, { start: 0.4, end: 1 }];
    const overlapViolation = overlapping.some(
      (window, index, all) => index > 0 && window.start < all[index - 1]!.end,
    );
    expect(`overlap_p3=${overlapViolation}`, "a helper that lets windows overlap must be rejected by P3").toBe(
      "overlap_p3=true",
    );
  });

  it("H5b with clips present, Read it to me lights every word of page 1", async () => {
    // Task 1.10 removes the sentence-audio cut, so H5 is replaced by this guard: the clip data
    // must not break the listen highlight. It fails at the base for the task 1.9 skip.
    useFrames();
    const expected = pageWords(readyWeek(), 1).map((_, index) => index);
    const bounds = pageBounds(readyWeek(), 1);
    const clips = { hello: "words/hello.mp3", am: "words/am.mp3", pat: "words/pat.mp3" };
    const { clock, unmount } = await renderPage(1, clips);
    startMode(labels.readToMe);
    const run = await runClock(clock, bounds, 0);
    expect(
      `pages_run=1 lit=[${run.sequence.join(",")}]`,
      "with clips present the listen highlight must light every word in order",
    ).toBe(`pages_run=1 lit=[${expected.join(",")}]`);
    unmount();
  });

  it("H6 replay lights every word of page 1 again", async () => {
    useFrames();
    const expected = pageWords(readyWeek(), 1).map((_, index) => index);
    const bounds = pageBounds(readyWeek(), 1);
    const { clock, unmount } = await renderPage(1);
    startMode(labels.readToMe);
    const first = await runClock(clock, bounds, 0);
    expect(
      `replay_1=[${first.sequence.join(",")}]`,
      "the first run must light every word in order",
    ).toBe(`replay_1=[${expected.join(",")}]`);
    startMode(labels.readToMe);
    const second = await runClock(clock, bounds, 0);
    expect(
      `replay_2=[${second.sequence.join(",")}]`,
      "the replay must light every word in order",
    ).toBe(`replay_2=[${expected.join(",")}]`);
    unmount();
  });

  it("H7 the loop stops on pause, ended, and unmount (characterization)", async () => {
    useFrames();
    const nativeRaf = globalThis.requestAnimationFrame.bind(globalThis);
    const nativeCancel = globalThis.cancelAnimationFrame.bind(globalThis);
    let rafCalls = 0;
    let cancelCalls = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCalls += 1;
      return nativeRaf(callback);
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      cancelCalls += 1;
      return nativeCancel(handle);
    });

    const bounds = pageBounds(readyWeek(), 1);
    const first = await renderPage(1);
    startMode(labels.readToMe);
    // Play a few frames.
    for (let step = 0; step < 20; step += 1) {
      first.clock.value = bounds.start + step * 0.016;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16);
      });
    }
    const rafBeforePause = rafCalls;
    fireEvent(first.clock.audio, new Event("pause"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });
    expect(
      `frames_after_pause=${rafCalls - rafBeforePause}`,
      "no frame may stay queued after pause",
    ).toBe("frames_after_pause=0");
    first.unmount();

    const second = await renderPage(1);
    startMode(labels.readToMe);
    for (let step = 0; step < 20; step += 1) {
      second.clock.value = bounds.start + step * 0.016;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16);
      });
    }
    fireEvent(second.clock.audio, new Event("ended"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });
    expect(litWord(second.clock.container), "no word may stay lit after ended").toBeNull();
    second.unmount();

    const third = await renderPage(1);
    startMode(labels.readToMe);
    const rafAtPlay = rafCalls;
    for (let step = 0; step < 20; step += 1) {
      third.clock.value = bounds.start + step * 0.016;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16);
      });
    }
    const rafDuringPlay = rafCalls - rafAtPlay;
    const cancelBefore = cancelCalls;
    third.unmount();
    const rafBeforeUnmount = rafCalls;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });
    expect(
      `frames_after_unmount=${rafCalls - rafBeforeUnmount}`,
      "no callback may run after unmount",
    ).toBe("frames_after_unmount=0");
    if (rafDuringPlay > 20) {
      expect(
        `cancel_after_unmount=${cancelCalls - cancelBefore}`,
        "a running loop must cancel its frame on unmount",
      ).not.toBe("cancel_after_unmount=0");
    }
  });
});
