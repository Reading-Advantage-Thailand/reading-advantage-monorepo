// @vitest-environment jsdom
/**
 * Adversarial read-along clock cases for the Storytime P1.6 round.
 * Cases X1-X7 drive the live `useReadAlong` hook through hostile clock shapes:
 * seek back, pause/resume, replay after ended, page turn, unmount, a 1 s frame
 * gap, and a 30 fps clock. Case X8 attacks `lib/highlight-windows.ts` with
 * equal-start, touching, and out-of-order windows.
 *
 * The sentences mirror the reader: word windows pass through
 * `highlightWindows` before the hook sees them (reader.tsx builds
 * `highlightSentences` the same way).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReadAlong } from "@reading-advantage/read-along/hooks/use-read-along";
import type { ReadAlongSentence } from "@reading-advantage/read-along/lib/align";
import { highlightWindows } from "../lib/highlight-windows";

/** Page 1 "Hello, I am Pat." recorded timings (content/l2/w01.json). */
const PAGE_ONE_WORDS = [
  { word: "Hello", start: 0, end: 0.34 },
  { word: "I", start: 0.7, end: 0.86 },
  { word: "am", start: 0.86, end: 0.96 },
  { word: "Pat", start: 0.96, end: 1.706 },
];

/** Page 7 "Hello, I am your teacher." recorded timings. */
const PAGE_SEVEN_WORDS = [
  { word: "Hello", start: 17.741, end: 18.021 },
  { word: "I", start: 18.501, end: 18.721 },
  { word: "am", start: 18.721, end: 18.841 },
  { word: "your", start: 18.841, end: 18.961 },
  { word: "teacher", start: 18.961, end: 19.511 },
];

/**
 * Builds one sentence the way the reader does: recorded words pass through
 * `highlightWindows` so short words keep a visible window.
 * @param words The recorded word timings.
 */
function readerSentence(words: { word: string; start: number; end: number }[]): ReadAlongSentence {
  const windows = highlightWindows(words);
  return {
    sentence: words.map((word) => word.word).join(" "),
    startTime: words[0]!.start,
    endTime: words.at(-1)!.end,
    words: words.map((word, index) => ({ word: word.word, ...windows[index]! })),
  };
}

const PAGE_ONE: ReadAlongSentence[] = [readerSentence(PAGE_ONE_WORDS)];
const PAGE_SEVEN: ReadAlongSentence[] = [readerSentence(PAGE_SEVEN_WORDS)];

/** The controlled audio element plus the frame queue the test owns. */
interface Controlled {
  audio: HTMLAudioElement;
  rafQueue: Map<number, FrameRequestCallback>;
  cancelSpy: ReturnType<typeof vi.fn>;
  now: number;
  setTime(t: number): void;
  emit(name: string): void;
  pump(frameCount: number, stepMs?: number): void;
}

/**
 * Builds a controlled audio element plus a manual rAF loop so the test owns
 * the clock. `readyState` reads 4 so paused syncs run.
 */
function makeControlled(): Controlled {
  let currentTime = 0;
  const listeners: Record<string, Array<() => void>> = {};
  const audio = {
    addEventListener(name: string, cb: () => void) {
      (listeners[name] ??= []).push(cb);
    },
    removeEventListener(name: string, cb: () => void) {
      listeners[name] = (listeners[name] ?? []).filter((fn) => fn !== cb);
    },
  } as unknown as HTMLAudioElement;
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (value: number) => {
      currentTime = Number(value);
    },
  });
  Object.defineProperty(audio, "readyState", { configurable: true, get: () => 4 });

  const rafQueue = new Map<number, FrameRequestCallback>();
  let rafSeq = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafSeq += 1;
    rafQueue.set(rafSeq, cb);
    return rafSeq;
  });
  const cancelSpy = vi.fn((id: number) => {
    rafQueue.delete(id);
  });
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);

  const ctl: Controlled = {
    audio,
    rafQueue,
    cancelSpy,
    now: 0,
    setTime(t: number) {
      currentTime = t;
    },
    emit(name: string) {
      for (const cb of listeners[name] ?? []) cb();
    },
    pump(frameCount: number, stepMs = 16) {
      for (let i = 0; i < frameCount; i++) {
        ctl.now += stepMs;
        const callbacks = [...rafQueue.values()];
        rafQueue.clear();
        for (const cb of callbacks) cb(ctl.now);
      }
    },
  };
  return ctl;
}

/** Renders the hook against one controlled audio element and sentence list. */
function renderLoop(ctl: Controlled, sentences: ReadAlongSentence[]) {
  const audioRef = { current: ctl.audio };
  return renderHook(({ list }: { list: ReadAlongSentence[] }) => useReadAlong({ audioRef, sentences: list }), {
    initialProps: { list: sentences },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adversarial read-along clock (X1-X7)", () => {
  it("X1 a seek back during play re-aligns to the earlier word on seeked", () => {
    const ctl = makeControlled();
    const { result } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(1.2);
      ctl.emit("play");
    });
    act(() => ctl.pump(5));
    expect(result.current.position.wordIndex, "Pat must be lit at 1.2 s").toBe(3);

    act(() => {
      ctl.setTime(0.1); // the child drags the slider back
      ctl.emit("seeked");
    });
    act(() => ctl.pump(3));
    expect(result.current.position.wordIndex, "Hello must be lit after the seek back").toBe(0);
  });

  it("X2 pause holds the lit word and resume keeps it", () => {
    const ctl = makeControlled();
    const { result } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(0.9);
      ctl.emit("play");
    });
    act(() => ctl.pump(3));
    expect(result.current.position.wordIndex, "am must be lit at 0.9 s").toBe(2);

    act(() => ctl.emit("pause"));
    act(() => ctl.pump(3));
    expect(result.current.isPlaying, "pause must clear the playing flag").toBe(false);
    expect(result.current.position.wordIndex, "pause must hold the lit word").toBe(2);

    act(() => ctl.emit("play"));
    act(() => ctl.pump(3));
    expect(result.current.isPlaying, "resume must set the playing flag").toBe(true);
    expect(result.current.position.wordIndex, "resume must keep the lit word").toBe(2);
  });

  it("X3 ended clears the lit word and queues no further frame", () => {
    const ctl = makeControlled();
    const { result } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(1.5);
      ctl.emit("play");
    });
    act(() => ctl.pump(3));
    expect(result.current.position.wordIndex).toBe(3);

    act(() => ctl.emit("ended"));
    expect(result.current.position.wordIndex, "no word may stay lit after ended").toBe(-1);
    expect(result.current.isPlaying, "ended must clear the playing flag").toBe(false);
    const queuedAfterEnded = ctl.rafQueue.size;
    act(() => ctl.pump(5));
    expect(ctl.rafQueue.size, "the loop must not re-arm after ended").toBe(queuedAfterEnded);
  });

  it("X4 a page turn clears the old page word and the new page listens clean", () => {
    const ctl = makeControlled();
    const { result, rerender } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(0.9);
      ctl.emit("play");
    });
    act(() => ctl.pump(3));
    expect(result.current.position.wordIndex, "am of page 1 must be lit").toBe(2);

    rerender({ list: PAGE_SEVEN });
    act(() => ctl.emit("pause")); // the reader pauses playback on a page turn
    expect(result.current.position.wordIndex, "no page-1 word may leak onto page 7").toBe(-1);

    act(() => {
      ctl.setTime(18.0);
      ctl.emit("play");
    });
    act(() => ctl.pump(3));
    expect(result.current.position.wordIndex, "Hello of page 7 must light at 18.0 s").toBe(0);
    expect(result.current.position.sentenceIndex, "the page-7 sentence must own the position").toBe(0);
  });

  it("X5 unmount during play cancels the pending frame and stops the loop", () => {
    const ctl = makeControlled();
    const { unmount } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(0.5);
      ctl.emit("play");
    });
    act(() => ctl.pump(3));
    expect(ctl.rafQueue.size, "a frame must be pending during play").toBeGreaterThan(0);
    unmount();
    expect(ctl.cancelSpy, "unmount must cancel the pending frame").toHaveBeenCalled();
    const queuedAtUnmount = ctl.rafQueue.size;
    act(() => ctl.pump(5));
    expect(ctl.rafQueue.size, "no callback may run after unmount").toBe(queuedAtUnmount);
  });

  it("X6 a 1 s frame gap still lights the word under the jumped time", () => {
    const ctl = makeControlled();
    const { result } = renderLoop(ctl, PAGE_ONE);
    act(() => {
      ctl.setTime(0);
      ctl.emit("play");
    });
    act(() => ctl.pump(2));
    expect(result.current.position.wordIndex, "Hello must be lit at the start").toBe(0);
    act(() => {
      ctl.setTime(1.0); // the main thread stalled for a second
    });
    act(() => ctl.pump(1, 1000));
    expect(result.current.position.wordIndex, "the lit word must follow the jumped time").toBe(3);
  });

  it("X7 a 30 fps clock lights the full ordered sequence of page one", () => {
    const ctl = makeControlled();
    const { result } = renderLoop(ctl, PAGE_ONE);
    const litOrder: number[] = [];
    let time = 0;
    act(() => {
      ctl.emit("play");
    });
    for (let frame = 0; frame < 60; frame++) {
      time += 1 / 30;
      act(() => {
        ctl.setTime(time);
        ctl.pump(1, 33);
      });
      const lit = result.current.position.wordIndex;
      if (lit >= 0 && litOrder.at(-1) !== lit) litOrder.push(lit);
    }
    expect(litOrder, "every word of page 1 must light in order at 30 fps").toEqual([0, 1, 2, 3]);
    expect(result.current.position.wordIndex, "Pat stays lit at the page end").toBe(3);
  });
});

describe("adversarial highlight windows helper (X8)", () => {
  it("X8a equal start times keep one window per word and never overlap", () => {
    const words = [
      { word: "ab", start: 1, end: 1.2 },
      { word: "cd", start: 1, end: 1.4 },
      { word: "ef", start: 1.4, end: 2 },
    ];
    const windows = highlightWindows(words);
    expect(windows, "one window per word, none dropped").toHaveLength(3);
    for (let index = 0; index < windows.length; index++) {
      expect(windows[index]!.start, `window ${index} must not start before its word`).toBeGreaterThanOrEqual(
        words[index]!.start - 1e-6,
      );
      expect(windows[index]!.end - windows[index]!.start, `window ${index} must last at least 0.12 s`).toBeGreaterThanOrEqual(
        0.12 - 1e-6,
      );
      if (index > 0) {
        expect(
          windows[index]!.start,
          `window ${index} must not overlap the previous window (kills the identity mutant)`,
        ).toBeGreaterThanOrEqual(windows[index - 1]!.end - 1e-6);
      }
    }
  });

  it("X8b touching windows give the boundary time exactly one owner", () => {
    const windows = highlightWindows([
      { word: "ab", start: 0, end: 0.5 },
      { word: "cd", start: 0.5, end: 1 },
    ]);
    const owners = windows.filter((window) => 0.5 >= window.start && 0.5 < window.end);
    expect(owners, "the boundary time must light exactly one word").toHaveLength(1);
    expect(owners[0]!.start, "the second word owns its own start").toBe(0.5);
  });

  it("X8c out-of-order input keeps one window per word with monotone starts", () => {
    const words = [
      { word: "b", start: 2, end: 3 },
      { word: "a", start: 0, end: 1 },
      { word: "c", start: 1, end: 2 },
    ];
    const windows = highlightWindows(words);
    expect(windows.length, "the output never exceeds the input length").toBe(words.length);
    for (let index = 1; index < windows.length; index++) {
      expect(windows[index]!.start, "window starts must stay monotone").toBeGreaterThanOrEqual(
        windows[index - 1]!.start,
      );
    }
  });

  it("X8d the empty list gives an empty list and does not throw", () => {
    expect(highlightWindows([])).toEqual([]);
  });
});
