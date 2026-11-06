// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: the order of a play rejection and the metadata event
 * (finding F147).
 *
 * The F147 fix cancels the pending stop when `play()` rejects, because a rejected play fires
 * no media event. This case runs the opposite order of the round-1 pin: the rejection lands
 * first, in a microtask, and the `loadedmetadata` event arrives after it. `seekAndRun` queues
 * the arm on that event, so the arm runs after the rejection cleared the stop. Playback never
 * starts, and the stop loop below the cut end must stay unarmed.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import week1 from "../content/l2/w01.json";

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

describe("Phase 3 adversarial rejected play order", () => {
  // F241: the rejection lands before the queued `loadedmetadata` arm, so the arm runs after
  // the F147 clear and a stop stays armed for playback that never starts.
  it.fails("leaves no stop armed when the rejection lands before loadedmetadata", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("blocked", "NotAllowedError"),
    );
    const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
    const book = structuredClone(week1).books.find((entry) => entry.kind === "readalong")!;
    const pageOne = book.audio!.sentences.filter((entry) => (entry.page ?? 1) === 1);
    const word = pageOne.flatMap((sentence) => sentence.words)[0]!;
    expect(word, "page one must hold a timed word").toBeTruthy();
    const view = render(<StorytimeReader book={book} locale="en" labels={labels} />);
    const audio = view.container.querySelector("audio") as HTMLAudioElement;
    expect(audio, "the reader must render its page audio element").not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    vi.useFakeTimers();

    fireEvent.click(
      [...view.container.querySelectorAll<HTMLElement>("[data-word]")].find(
        (entry) => (entry.textContent ?? "").toLowerCase() === word.word.toLowerCase(),
      )!,
    );
    // The element has no metadata yet, so `seekAndRun` queues its arm on `loadedmetadata`.
    expect(vi.getTimerCount(), "nothing is armed before the metadata event").toBe(0);
    // The rejection lands first, as a NotAllowedError does on a fresh load.
    await act(async () => {
      await Promise.resolve();
    });
    // The queued arm now runs for playback that never started.
    act(() => audio.dispatchEvent(new Event("loadedmetadata")));
    expect(
      vi.getTimerCount(),
      "playback that never starts must not keep a stop armed below the cut end (F147)",
    ).toBe(0);
  });
});
