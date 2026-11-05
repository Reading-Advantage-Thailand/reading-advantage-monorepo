// @vitest-environment jsdom
/**
 * Phase 3 adversarial round: rapid taps, double taps, and the two open stop-loop
 * gaps from the round-5 reviews (test strategy P3.12, the adversarial row).
 *
 * The tap cases prove that three rapid word taps leave one pending stop and that
 * no stale stop pauses before the last cut end, that a word tap during a pending
 * page stop replaces it, and that three rapid decodable taps arm one whole-word
 * stop. The two `it.fails` pins hold the open review gaps: C6-1 (a rejected
 * `play()` leaves the stop loop with no terminal event) and A6-1 (an external
 * pause ends the loop, and a resume below the cut end runs past the cut end).
 * A pin passes while the defect exists and turns red when Green fixes it.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import week1 from "../content/l2/w01.json";
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

/** One timed word of a book sentence. */
interface TimedWord {
  word: string;
  start: number;
  end: number;
}

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
  const book = structuredClone(week1).books.find((entry) => entry.kind === "readalong")!;
  const result = render(<Reader book={book} locale="en" labels={labels} />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  return { ...result, audio: audio as HTMLAudioElement, book };
}

/**
 * Picks three distinct page-one words with strictly increasing cut ends.
 * @param book The read-along book.
 * @returns The three words, in tap order.
 */
function pickedWords(book: {
  audio: { sentences: Array<{ page?: number; words: TimedWord[] }> };
}): TimedWord[] {
  const pageOne = book.audio.sentences.filter((entry) => (entry.page ?? 1) === 1);
  const all = pageOne.flatMap((sentence) => sentence.words);
  const picked: TimedWord[] = [];
  const seen = new Set<string>();
  for (const word of all) {
    const key = word.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); // each text is considered once, at its first occurrence
    if (picked.length > 0 && word.end <= picked[picked.length - 1]!.end) continue;
    picked.push(word);
    if (picked.length === 3) break;
  }
  expect(picked.length, "page one must hold three distinct words with rising ends").toBe(3);
  return picked;
}

/**
 * Finds the rendered span of one word.
 * @param container The rendered reader.
 * @param word The word.
 * @returns The span element.
 */
function spanFor(container: HTMLElement, word: TimedWord): HTMLElement {
  const spans = [...container.querySelectorAll<HTMLElement>("[data-word]")];
  const span = spans.find(
    (entry) => (entry.textContent ?? "").toLowerCase() === word.word.toLowerCase(),
  );
  expect(span, `page one must render the word ${word.word}`).toBeTruthy();
  return span!;
}

describe("Phase 3 adversarial rapid taps", () => {
  it("three rapid word taps leave one stop and pause only at the last cut end", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { container, audio, book } = await renderReader();
    const [wordA, wordB, wordC] = pickedWords(book);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    pause.mockClear();
    vi.useFakeTimers();

    // Three taps with no clock between them: well under 50 ms of fake time.
    fireEvent.click(spanFor(container, wordA!));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    fireEvent.click(spanFor(container, wordB!));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    fireEvent.click(spanFor(container, wordC!));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(vi.getTimerCount(), "three rapid taps must leave one pending stop").toBe(1);

    // The media clock crosses the first two cut ends while the third cut plays.
    act(() => {
      audio.currentTime = wordA!.end;
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(pause, "no stale stop may pause before the last cut end").not.toHaveBeenCalled();
    expect(vi.getTimerCount(), "the one stop must re-arm below the last cut end").toBe(1);

    act(() => {
      audio.currentTime = wordC!.end;
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(pause, "the last cut end must pause the audio").toHaveBeenCalledTimes(1);
  });

  it("a word tap during a pending page stop replaces the page stop", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { container, audio, book } = await renderReader();
    const word = pickedWords(book)[0]!;
    const pageSentences = book.audio.sentences.filter((entry) => (entry.page ?? 1) === 1);
    const last = pageSentences.at(-1)!;
    expect(last.endTime, "the page-one end must sit above zero").toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    vi.useFakeTimers();
    act(() => {
      audio.currentTime = last.endTime - 0.2;
    });
    fireEvent.timeUpdate(audio);
    expect(vi.getTimerCount(), "the page stop arms inside the page-end window").toBe(1);

    // The tap arrives while the page stop is pending: the mode change clears it
    // and the word cut arms its own stop.
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    pause.mockClear(); // the mode click pauses once; the test measures the two stops only
    fireEvent.click(spanFor(container, word));
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(vi.getTimerCount(), "only the word-cut stop stays armed").toBe(1);

    // The old page-stop deadline passes; the cancelled page stop must not pause.
    act(() => vi.advanceTimersByTime(210));
    expect(pause, "the cancelled page stop must not pause the word cut").not.toHaveBeenCalled();

    act(() => {
      audio.currentTime = word.end;
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(pause, "the word-cut end must pause the audio").toHaveBeenCalledTimes(1);
  });

  it("three rapid decodable taps arm one whole-word stop", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const Decodable = await loadDecodable();
    const week3 = JSON.parse(readFileSync(resolve(appDir, "content/l2/w03.json"), "utf8")) as {
      books: Array<{
        kind: string;
        audio?: { sentences: Array<{ words: TimedWord[] }> };
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

    // Three taps with no clock between them: only the last blend generation
    // reaches the whole-word play, and it replaces any earlier stop.
    fireEvent.click(screen.getByRole("button", { name: /^pan$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pan$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pan$/i }));
    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        (phoneme as HTMLAudioElement).dispatchEvent(new Event("ended"));
      });
    }
    const whole = view.container.querySelectorAll("audio")[1];
    expect(whole, "the decodable must render its whole-word audio element").not.toBeNull();
    act(() => (whole as HTMLAudioElement).dispatchEvent(new Event("loadedmetadata")));
    expect(vi.getTimerCount(), "three rapid taps must leave one pending stop").toBe(1);

    const cutMs = (timing!.end - timing!.start) * 1000;
    expect(cutMs, "the whole-word cut must be longer than 40 ms").toBeGreaterThan(40);
    act(() => {
      (whole as HTMLAudioElement).currentTime = timing!.end - 0.04;
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(pause, "no stop may pause before the whole-word cut end").not.toHaveBeenCalled();

    act(() => {
      (whole as HTMLAudioElement).currentTime = timing!.end;
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(pause, "the whole-word cut end must pause the audio").toHaveBeenCalledTimes(1);
  });
});

describe("Phase 3 adversarial pins for the open review gaps", () => {
  it.fails("a rejected play leaves no stop loop armed below the cut end (C6-1)", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("blocked", "NotAllowedError"),
    );
    const { container, audio, book } = await renderReader();
    const word = pickedWords(book)[0]!;
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    vi.useFakeTimers();
    fireEvent.click(spanFor(container, word));
    // The metadata event runs the queued arm; the rejected play lands after it,
    // exactly as a NotAllowedError does in a browser.
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(vi.getTimerCount(), "the cut stop arms on the metadata event").toBe(1);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(
      vi.getTimerCount(),
      "a rejected play must cancel the stop loop below the cut end (C6-1)",
    ).toBe(0);
  });

  it.fails("a resume below the cut end re-arms the stop loop (A6-1)", () => {
    vi.useFakeTimers();
    const audio = document.createElement("audio");
    audio.currentTime = 0.1;
    const onStop = vi.fn();
    stopAtMediaEnd(audio, 0.5, onStop);
    expect(vi.getTimerCount(), "the loop arms one timer").toBe(1);
    // The external pause (OS controls, audio focus) ends the loop: finding F145.
    act(() => audio.dispatchEvent(new Event("pause")));
    expect(vi.getTimerCount(), "the pause event ends the loop").toBe(0);
    expect(onStop, "the pause event runs the stop once").toHaveBeenCalledTimes(1);
    // Playback resumes below the cut end; the loop must come back, or the audio
    // runs past the measured cut end (A6-1).
    audio.currentTime = 0.2;
    act(() => audio.dispatchEvent(new Event("play")));
    expect(
      vi.getTimerCount(),
      "a resume below the cut end must re-arm the stop loop (A6-1)",
    ).toBe(1);
  });
});
