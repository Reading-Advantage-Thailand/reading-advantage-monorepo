// @vitest-environment jsdom
// Findings F122 and F123 of the Phase 3 review at e9c1908fd.
//
// F122: the reader seeks through the package helper seekOrWait, so a seek at readyState 0
// applies on the loadedmetadata event. The committed reader contract pins an applied word-cut
// seek at the tap, so the cut start keeps the early attempt and re-applies on loadedmetadata
// after a lost seek.
//
// F123: the word-cut end and the page-end stop run from a timer, so the stop does not wait for
// the next timeupdate event (a browser fires timeupdate about every 250 ms).
//
// F140: the word-cut stop follows the media clock. A wall-clock timer of the remaining time
// fires before currentTime reaches the cut end, because the media clock starts to move tens
// of milliseconds after `playing` (output latency); the stop re-arms while currentTime is
// below the cut end.
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import week from "../content/l2/w01.json";
import { stopAtMediaEnd } from "../lib/audio-seek";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Loads the client reader and makes a missing module an assertion failure. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader;
  } catch (error) {
    expect(error, "Storytime must provide the client reader UI").toBeUndefined();
    throw error;
  }
}

/** Loads the client decodable and makes a missing module an assertion failure. */
async function loadDecodable() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeDecodable;
  } catch (error) {
    expect(error, "Storytime must provide the client decodable UI").toBeUndefined();
    throw error;
  }
}

/** Renders the reader against a deep clone of the shipped week and returns its audio element. */
async function renderReader() {
  const Reader = await loadReader();
  const book = structuredClone(week).books.find((entry) => entry.kind === "readalong")!;
  const result = render(<Reader book={book} locale="en" labels={labels} />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  return { ...result, audio: audio as HTMLAudioElement, book };
}

/** The first timed word of page one of the shipped read-along book. */
function firstWordOfPageOne(book: {
  audio: {
    sentences: Array<{
      page?: number;
      words: Array<{ word: string; start: number; end: number }>;
    }>;
  };
}) {
  const sentence = book.audio.sentences.find((entry) => (entry.page ?? 1) === 1);
  expect(sentence, "page one of the shipped book must hold timed words").toBeTruthy();
  const word = sentence!.words[0];
  expect(word, "the first timed word of page one must exist").toBeTruthy();
  return word!;
}

describe("the reader seek waits for the metadata (F122)", () => {
  it("defers the Listen page-start seek until the metadata loads", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { audio, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    const sentences = book.audio.sentences.filter((entry) => (entry.page ?? 1) === 2);
    expect(sentences, "page two must hold timed sentences").not.toHaveLength(0);
    const target = Math.max(0, sentences[0]!.startTime - 0.05);
    expect(target, "the page-two seek target must sit above zero").toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    expect(audio.currentTime, "the seek waits for the metadata at readyState 0").toBe(0);
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime, "the seek applies on loadedmetadata").toBeCloseTo(target);
  });

});

describe("the audio stops at its end without a timeupdate (F123)", () => {
  it("stops page audio by timer inside the page-end window", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { audio, book } = await renderReader();
    const pageSentences = book.audio.sentences.filter((entry) => (entry.page ?? 1) === 1);
    const last = pageSentences.at(-1)!;
    expect(last.endTime, "the page-one end must sit above zero").toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    vi.useFakeTimers();
    audio.currentTime = last.endTime - 0.2;
    fireEvent.timeUpdate(audio);
    act(() => vi.advanceTimersByTime(250));
    expect(pause, "the page stop runs from the timer, not from a later timeupdate").toHaveBeenCalled();
  });

  it("stops the decodable whole word by timer at its word-cut end", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const Decodable = await loadDecodable();
    const week3 = JSON.parse(readFileSync(resolve(appDir, "content/l2/w03.json"), "utf8")) as {
      books: Array<{
        kind: string;
        audio?: { sentences: Array<{ words: Array<{ word: string; start: number; end: number }> }> };
      }>;
    };
    const decodable = week3.books.find((entry) => entry.kind === "decodable")!;
    const timing = decodable.audio?.sentences
      ?.flatMap((sentence) => sentence.words)
      .find((entry) => entry.word.toLowerCase() === "pan");
    expect(timing, "the shipped w03 timing must hold the word pan").toBeTruthy();
    const view = render(<Decodable week={week3 as never} locale="en" />);
    const phoneme = view.container.querySelectorAll("audio")[0];
    expect(phoneme, "the decodable must render its phoneme audio element").not.toBeNull();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /^pan$/i }));
    // F120: the whole word starts only after the phoneme element ends the last grapheme clip,
    // so the test fires the three clip ends of "pan" before it arms the cut stop.
    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        (phoneme as HTMLAudioElement).dispatchEvent(new Event("ended"));
      });
    }
    const whole = view.container.querySelectorAll("audio")[1];
    expect(whole, "the decodable must render its whole-word audio element").not.toBeNull();
    act(() => (whole as HTMLAudioElement).dispatchEvent(new Event("loadedmetadata")));
    // F140: the media clock reaches the cut end when the timer fires.
    act(() => {
      (whole as HTMLAudioElement).currentTime = timing!.end;
    });
    act(() => vi.advanceTimersByTime((timing!.end - timing!.start) * 1000 + 5));
    expect(pause, "the whole-word cut stop runs from the timer").toHaveBeenCalled();
  });

  it("pauses the whole word only when the media clock reaches the cut end (finding F140)", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const Decodable = await loadDecodable();
    const week3 = JSON.parse(readFileSync(resolve(appDir, "content/l2/w03.json"), "utf8")) as {
      books: Array<{
        kind: string;
        audio?: { sentences: Array<{ words: Array<{ word: string; start: number; end: number }> }> };
      }>;
    };
    const decodable = week3.books.find((entry) => entry.kind === "decodable")!;
    const timing = decodable.audio?.sentences
      ?.flatMap((sentence) => sentence.words)
      .find((entry) => entry.word.toLowerCase() === "pan");
    expect(timing, "the shipped w03 timing must hold the word pan").toBeTruthy();
    const cutMs = (timing!.end - timing!.start) * 1000;
    const latencyMs = 48;
    expect(cutMs, "the pre-play delay must sit well inside the cut").toBeGreaterThan(200);
    const view = render(<Decodable week={week3 as never} locale="en" />);
    const phoneme = view.container.querySelectorAll("audio")[0];
    expect(phoneme, "the decodable must render its phoneme audio element").not.toBeNull();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /^pan$/i }));
    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        (phoneme as HTMLAudioElement).dispatchEvent(new Event("ended"));
      });
    }
    const whole = view.container.querySelectorAll("audio")[1];
    expect(whole, "the decodable must render its whole-word audio element").not.toBeNull();
    act(() => (whole as HTMLAudioElement).dispatchEvent(new Event("loadedmetadata")));
    act(() => {
      (whole as HTMLAudioElement).currentTime = timing!.start + (cutMs - latencyMs) / 1000;
    });
    act(() => vi.advanceTimersByTime(cutMs));
    expect(pause, "the whole-word stop must not pause below the cut end").not.toHaveBeenCalled();
    act(() => {
      (whole as HTMLAudioElement).currentTime = timing!.end;
    });
    act(() => vi.advanceTimersByTime(latencyMs + 5));
    expect(pause, "the whole-word stop pauses when the media clock reaches the cut end").toHaveBeenCalled();
  });
});

describe("a second word tap replaces the first cut stop (finding F146)", () => {
});

describe("stopAtMediaEnd ends when the media stops below the cut end (finding F145)", () => {
  const cases: Array<[string, (audio: HTMLMediaElement) => void]> = [
    ["a pause event", (audio) => audio.dispatchEvent(new Event("pause"))],
    ["an ended event below the cut end", (audio) => audio.dispatchEvent(new Event("ended"))],
    ["an error event", (audio) => audio.dispatchEvent(new Event("error"))],
  ];
  for (const [name, fire] of cases) {
    it(`ends the loop on ${name} with no timer left after 10 s`, () => {
      vi.useFakeTimers();
      const audio = document.createElement("audio");
      audio.currentTime = 0.3; // below the cut end 0.34, so the old loop re-arms forever
      const onStop = vi.fn();
      stopAtMediaEnd(audio, 0.34, onStop);
      expect(vi.getTimerCount(), "the loop arms one timer").toBe(1);
      act(() => fire(audio));
      act(() => vi.advanceTimersByTime(10_000));
      expect(vi.getTimerCount(), `after ${name}, no timer stays pending`).toBe(0);
      expect(
        onStop,
        `after ${name}, the stop ran once so the reader clears the mark`,
      ).toHaveBeenCalledTimes(1);
    });
  }
});

describe("a new loop removes the stale resume listener of a finished loop (finding F153)", () => {
  it("does not re-arm the old loop after the new loop ends", () => {
    vi.useFakeTimers();
    const audio = document.createElement("audio");
    audio.currentTime = 0.1;
    const stopsA = vi.fn();
    stopAtMediaEnd(audio, 0.2, stopsA);
    // Loop A ends on a terminal pause below its end and keeps its one-shot resume listener;
    // it also leaves the active map, so only the helper can remove that listener.
    act(() => audio.dispatchEvent(new Event("pause")));
    expect(stopsA, "the pause ran A's stop").toHaveBeenCalledTimes(1);
    // A new loop starts on the same element without a caller cancel (the finding's case).
    const stopsB = vi.fn();
    stopAtMediaEnd(audio, 0.5, stopsB);
    // The new loop ends at its own cut end.
    audio.currentTime = 0.5;
    act(() => vi.advanceTimersByTime(400));
    expect(stopsB, "the new loop stops at its own end").toHaveBeenCalledTimes(1);
    // A play event below the old end must not re-arm the old loop.
    audio.currentTime = 0.15;
    act(() => audio.dispatchEvent(new Event("play")));
    expect(vi.getTimerCount(), "the stale resume listener of A is gone").toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(stopsA, "the old loop must not run again").toHaveBeenCalledTimes(1);
  });
});
