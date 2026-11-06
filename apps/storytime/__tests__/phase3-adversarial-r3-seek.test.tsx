// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 3: the cancel contract of `seekOrWait` and `seekAndRun`.
 *
 * The F241 and F260 fixes gave `seekOrWait` an optional `onQueued` callback and `seekAndRun` a
 * cancel function. This case pins the edges of that contract: a caller with no `onQueued` keeps
 * the old behavior, a cancel after the metadata event is a no-op, repeated cancels are safe, and a
 * time beyond the duration neither throws nor leaves the arm pending.
 *
 * The reader of the read-along part calls `seekOrWait` with no `onQueued`, so its listen seek
 * must still apply on the metadata event.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seekAndRun } from "../lib/audio-seek";
import { seekOrWait } from "@reading-advantage/read-along/lib/seek";
import week1 from "../content/l2/w01.json";

/** The labels of the reader controls. */
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
  vi.restoreAllMocks();
});

/**
 * Builds an audio element that records every write of `currentTime`.
 * @param readyState The ready state of the element.
 * @returns The element and the recorded writes.
 */
function fakeAudio(readyState: number): { audio: HTMLAudioElement; writes: number[] } {
  const audio = document.createElement("audio");
  const writes: number[] = [];
  Object.defineProperty(audio, "readyState", { configurable: true, get: () => readyState });
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => (writes.length > 0 ? writes[writes.length - 1]! : 0),
    set: (value: number) => {
      writes.push(value);
    },
  });
  return { audio, writes };
}

describe("Phase 3 adversarial seek cancel contract", () => {
  it("keeps the old behavior for a caller with no onQueued callback", () => {
    const { audio, writes } = fakeAudio(0);
    const queued = seekOrWait(audio, 2.5);
    expect(queued, "the seek waits for the metadata").toBe(false);
    expect(writes, "no write happens before the metadata event").toEqual([]);
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(writes, "the queued seek applies on the metadata event").toEqual([2.5]);
  });

  it("drops the queued seek when the reported cancel runs", () => {
    const { audio, writes } = fakeAudio(0);
    let cancel = (): void => {};
    seekOrWait(audio, 2.5, (queued) => {
      cancel = queued;
    });
    expect(() => cancel(), "the cancel must not throw").not.toThrow();
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(writes, "a cancelled queued seek must not apply on the metadata event").toEqual([]);
  });

  it("makes a cancel after the metadata event a no-op", () => {
    const { audio, writes } = fakeAudio(0);
    const onReady = vi.fn();
    const cancel = seekAndRun(audio, 3.5, onReady);
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(onReady, "the arm runs once on the metadata event").toHaveBeenCalledTimes(1);
    const before = writes.length;
    expect(() => cancel(), "a cancel after the metadata event must not throw").not.toThrow();
    expect(writes.length, "a cancel after the metadata event writes nothing").toBe(before);
    expect(onReady, "a cancel after the metadata event runs the arm again").toHaveBeenCalledTimes(1);
  });

  it("keeps repeated cancels safe and drops the queued seek", () => {
    const { audio, writes } = fakeAudio(0);
    const onReady = vi.fn();
    const cancel = seekAndRun(audio, 3.5, onReady);
    expect(() => {
      cancel();
      cancel();
      cancel();
    }, "repeated cancels must not throw").not.toThrow();
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(onReady, "a cancelled arm never runs").not.toHaveBeenCalled();
    expect(writes, "only the early write of the seek stays").toEqual([3.5]);
  });

  it("seeks a time beyond the duration without throwing and without a pending arm", () => {
    const { audio, writes } = fakeAudio(1);
    const onReady = vi.fn();
    let cancel = (): void => {};
    expect(() => {
      cancel = seekAndRun(audio, 9999, onReady);
    }, "a time beyond the duration must not throw").not.toThrow();
    expect(onReady, "the arm runs at once when the element has metadata").toHaveBeenCalledTimes(1);
    expect(writes, "the seek applies to the element").toEqual([9999]);
    expect(() => cancel(), "the cancel of a finished seek is safe").not.toThrow();
  });

  it("keeps the listen seek of the reader applying on the metadata event", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { StorytimeReader } = await import("../app/[locale]/st/[level]/[week]/reader");
    const book = structuredClone(week1).books.find((entry) => entry.kind === "readalong")!;
    const first = book.audio!.sentences.filter((sentence) => (sentence.page ?? 1) === 1)[0]!;
    expect(first, "page one must hold a timed sentence").toBeTruthy();
    const view = render(<StorytimeReader book={book} locale="en" labels={labels} />);
    const audio = view.container.querySelector("audio") as HTMLAudioElement;
    expect(audio, "the reader must render its page audio element").not.toBeNull();
    const writes: number[] = [];
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      get: () => (writes.length > 0 ? writes[writes.length - 1]! : 0),
      set: (value: number) => {
        writes.push(value);
      },
    });
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    expect(writes, "the listen seek waits for the metadata").toEqual([]);
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(
      writes,
      "the listen seek of the reader applies on the metadata event (no onQueued caller)",
    ).toEqual([Math.max(0, first.startTime - 0.05)]);
  });
});
