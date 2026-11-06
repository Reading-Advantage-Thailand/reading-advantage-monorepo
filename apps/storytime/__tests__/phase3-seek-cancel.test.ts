// @vitest-environment jsdom
/**
 * Finding F260 (Review B): a cancelled queued seek must not apply on a later load.
 *
 * `seekAndRun` queues its stop arm on `loadedmetadata` when the element has no metadata, and
 * `seekOrWait` queues its own `applySeek` listener on the same event. The F241 cancel removed
 * only the stop arm, so the queued seek stayed and a later load jumped to the old cut start.
 * The cancel now removes both listeners.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { seekAndRun } from "../lib/audio-seek";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a cancelled queued seek (finding F260)", () => {
  it("does not apply the old cut start on a later loadedmetadata event", () => {
    const audio = document.createElement("audio");
    Object.defineProperty(audio, "readyState", { configurable: true, get: () => 0 });
    const writes: number[] = [];
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      get: () => 0,
      set: (value: number) => {
        writes.push(value);
      },
    });
    const onReady = vi.fn();
    const cancel = seekAndRun(audio, 3.5, onReady);
    expect(onReady, "the arm waits for metadata").not.toHaveBeenCalled();
    cancel();
    // The early seek attempt of `seekAndRun` writes the time before the cancel; only the
    // queued write of a later load is the defect.
    writes.length = 0;
    audio.dispatchEvent(new Event("loadedmetadata"));
    expect(onReady, "the cancelled stop arm must not run").not.toHaveBeenCalled();
    expect(writes, "a later load must not seek to the old cut start").toEqual([]);
  });
});
