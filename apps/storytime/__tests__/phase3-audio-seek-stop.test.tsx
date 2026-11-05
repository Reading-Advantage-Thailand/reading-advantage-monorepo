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

  it("re-applies the word-cut seek when the metadata loads after the tap", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { audio, book } = await renderReader();
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    const sentence = book.audio.sentences.find((entry) => (entry.page ?? 1) === 2)!;
    const word = sentence.words[0]!;
    expect(Math.max(0, word.start - 0.03), "the page-two cut target must sit above zero").toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(screen.getByText(new RegExp(`^${word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)));
    const target = Math.max(0, word.start - 0.03);
    expect(audio.currentTime, "the committed contract pins the applied seek at the tap").toBeCloseTo(target);
    audio.currentTime = 0; // the browser lost the early seek before the metadata
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime, "the seek re-applies on loadedmetadata").toBeCloseTo(target);
  });
});

describe("the audio stops at its end without a timeupdate (F123)", () => {
  it("stops the word cut by timer at the cut end", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { audio, book } = await renderReader();
    const word = firstWordOfPageOne(book);
    const cutMs = (word.end - Math.max(0, word.start - 0.03)) * 1000;
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    pause.mockClear(); // the mode click pauses once; the test measures the cut stop only
    vi.useFakeTimers();
    fireEvent.click(screen.getByText(new RegExp(`^${word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    // F140: the media clock reaches the cut end when the timer fires.
    act(() => {
      audio.currentTime = word.end;
    });
    act(() => vi.advanceTimersByTime(cutMs + 5));
    expect(pause, "the cut stop runs from the timer, not from a timeupdate").toHaveBeenCalled();
  });

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

  it("pauses the word cut only when the media clock reaches the cut end (finding F140)", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { audio, book } = await renderReader();
    const word = firstWordOfPageOne(book);
    const cutStart = Math.max(0, word.start - 0.03);
    const cutMs = (word.end - cutStart) * 1000;
    // The review measured about 48 ms of output latency: the media clock lags the wall clock.
    const latencyMs = 48;
    expect(cutMs, "the pre-play delay must sit well inside the cut").toBeGreaterThan(200);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    pause.mockClear();
    vi.useFakeTimers();
    fireEvent.click(screen.getByText(new RegExp(`^${word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime, "the seek applies before playback").toBeCloseTo(cutStart);
    // The wall timer fires while the media clock still lags it by 48 ms; the stop must
    // re-arm instead of pausing, or the child loses the end of the word.
    act(() => {
      audio.currentTime = cutStart + (cutMs - latencyMs) / 1000;
    });
    act(() => vi.advanceTimersByTime(cutMs));
    expect(pause, "the stop must not pause while the media clock is below the cut end").not.toHaveBeenCalled();
    act(() => {
      audio.currentTime = word.end;
    });
    act(() => vi.advanceTimersByTime(latencyMs + 5));
    expect(pause, "the stop pauses when the media clock reaches the cut end").toHaveBeenCalled();
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
  it("keeps one pending stop and does not pause the second cut at the first cut end", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { container, audio, book } = await renderReader();
    const sentence = book.audio.sentences.find((entry) => (entry.page ?? 1) === 1)!;
    const wordA = sentence.words[0]!;
    const wordB = sentence.words[1]!;
    expect(wordB.end, "the second word must end after the first word").toBeGreaterThan(wordA.end);
    const spans = [...container.querySelectorAll<HTMLElement>("[data-word]")];
    const spanFor = (word: { word: string }) =>
      spans.find((span) => (span.textContent ?? "").toLowerCase() === word.word.toLowerCase());
    expect(spanFor(wordA), "page one must render the first word span").toBeTruthy();
    expect(spanFor(wordB), "page one must render the second word span").toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    pause.mockClear();
    vi.useFakeTimers();

    // First tap: the cut stop of word A arms when the metadata seek is in place.
    fireEvent.click(spanFor(wordA)!);
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    // Second tap BEFORE the first stop fires: the new stop must replace the old one
    // (the strategy line 498 floor: a word tap plays to its measured end).
    fireEvent.click(spanFor(wordB)!);
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime, "the second seek applies").toBeCloseTo(wordB.start - 0.03);

    // The media clock crosses the FIRST word's end while the second cut still plays.
    act(() => {
      audio.currentTime = wordA.end;
    });
    expect(audio.currentTime, "the second cut is still running").toBeLessThan(wordB.end);
    act(() => vi.advanceTimersByTime((wordA.end - Math.max(0, wordA.start - 0.03)) * 1000 + 10));

    // The first stop must be gone: one pending stop (the second cut), no pause, and the
    // second word keeps its mark.
    expect(vi.getTimerCount(), "only the second cut's stop stays armed").toBe(1);
    expect(pause, "the first word's stale stop must not pause the second cut").not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-word][aria-current="true"]'),
      "the second word's mark must stay while its cut plays",
    ).not.toBeNull();
  });
});
