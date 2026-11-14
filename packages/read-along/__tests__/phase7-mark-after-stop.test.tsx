// @vitest-environment jsdom
/**
 * Task 7.5, hook level: the word mark after a stop and after a page turn (finding F2 of the 7.2
 * browser check, PM decision 2026-11-14: clear the mark on a mode stop).
 *
 * A browser fires the `pause` and `seeked` events as queued tasks, after the host has set the
 * time to 0 and has called `reset()`. The late events make the hook select the word at the paused
 * time again, so a word stays lit with no voice and survives a page turn.
 *
 * Rows S1 and S2 fail at the base with an assertion (a marked word where none is due). Rows C1 to
 * C3 are the named characterization rows: they pass at the base and keep the shared hook as
 * Primary uses it (a plain pause keeps the mark on the paused word; a seek while paused moves the
 * mark; the mark follows the voice after a reset once playback starts).
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadAlongSentence } from "../lib/align";
import { NO_POSITION } from "../lib/position";
import { useReadAlong } from "../hooks/use-read-along";

/** Page 1 of the fixture: the first word starts at time 0, as in the shipped week. */
const pageOne: ReadAlongSentence[] = [
  {
    sentence: "Hello, I am Pat.",
    startTime: 0,
    endTime: 3,
    words: [
      { word: "Hello", start: 0, end: 1 },
      { word: "I", start: 1, end: 2 },
      { word: "am", start: 2, end: 3 },
    ],
  },
];

/** Page 2 of the fixture: the sentence starts later, as in the shipped week. */
const pageTwo: ReadAlongSentence[] = [
  {
    sentence: "Hello, I am May.",
    startTime: 4,
    endTime: 7,
    words: [
      { word: "Hello", start: 4, end: 5 },
      { word: "I", start: 5, end: 6 },
      { word: "am", start: 6, end: 7 },
    ],
  },
];

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let audio: HTMLAudioElement;

/** Runs the one pending frame callback, if any. */
function runFrame(): void {
  const entry = [...frames.entries()][0];
  if (!entry) return;
  frames.delete(entry[0]);
  act(() => entry[1](0));
}

/** Moves the stubbed playback position. */
function setTime(seconds: number): void {
  Object.defineProperty(audio, "currentTime", { value: seconds, configurable: true });
}

/** Sends the events that a browser queues after a stop at time 0: `pause`, then `seeked`. */
function lateStopEvents(): void {
  act(() => void audio.dispatchEvent(new Event("pause")));
  act(() => void audio.dispatchEvent(new Event("seeked")));
}

beforeEach(() => {
  frames = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(nextId, cb);
    return nextId++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  audio = document.createElement("audio");
  setTime(0);
  Object.defineProperty(audio, "readyState", { value: 4, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders the hook with the stub audio element and a changeable sentence list. */
function setup() {
  const audioRef = { current: audio };
  return renderHook(({ sentences }) => useReadAlong({ audioRef, sentences }), {
    initialProps: { sentences: pageOne },
  });
}

describe("useReadAlong mark after a stop (task 7.5, finding F2)", () => {
  it("S1 a mode stop leaves no mark when the late pause and seeked events arrive", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "the voice must mark the word first").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    // The host stops: the time goes to 0, the host resets, and the browser events come late.
    setTime(0);
    act(() => result.current.reset());
    expect(result.current.position).toEqual(NO_POSITION);
    lateStopEvents();
    expect(result.current.position, "a stop must leave no marked word").toEqual(NO_POSITION);
    expect(result.current.isPlaying).toBe(false);
  });

  it("S2 a page turn leaves no mark on the new page when the late events arrive", () => {
    const { result, rerender } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    setTime(0);
    act(() => result.current.reset());
    // The late events of the stop come while the old page still shows, as in the browser: the
    // next page waits for its picture. The page turns after them.
    lateStopEvents();
    rerender({ sentences: pageTwo });
    expect(result.current.position, "a page turn must leave no marked word").toEqual(NO_POSITION);
    lateStopEvents();
    expect(result.current.position, "a late event on the new page must leave no mark").toEqual(
      NO_POSITION,
    );
  });

  it("C1 a plain pause keeps the mark on the paused word (Primary player behavior)", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(2.5);
    runFrame();
    act(() => void audio.dispatchEvent(new Event("pause")));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.position).toEqual({ sentenceIndex: 0, wordIndex: 2 });
  });

  it("C2 a seek while paused, with no reset, moves the mark", () => {
    const { result } = setup();
    setTime(1.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(result.current.position).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });

  it("C3 the mark follows the voice again when playback starts after a stop", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    setTime(0);
    act(() => result.current.reset());
    lateStopEvents();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.position).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });
});
