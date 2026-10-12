// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadAlongSentence } from "@/lib/read-along/align";
import { useReadAlong } from "../use-read-along";

const sentences: ReadAlongSentence[] = [
  {
    sentence: "Alpha beta gamma.",
    startTime: 0,
    endTime: 3,
    words: [
      { word: "Alpha", start: 0, end: 1 },
      { word: "beta", start: 1, end: 2 },
      { word: "gamma.", start: 2, end: 3 },
    ],
  },
  { sentence: "Delta.", startTime: 4, endTime: 5, words: [{ word: "Delta.", start: 4, end: 5 }] },
];

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let cancelSpy: ReturnType<typeof vi.fn>;
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

beforeEach(() => {
  frames = new Map();
  nextId = 1;
  cancelSpy = vi.fn((id: number) => frames.delete(id));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(nextId, cb);
    return nextId++;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);
  audio = document.createElement("audio");
  setTime(0);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders the hook with the stub audio element. */
function setup() {
  const audioRef = { current: audio };
  return renderHook(() => useReadAlong({ audioRef, sentences }));
}

describe("useReadAlong", () => {
  it("asks for no frame before the audio plays", () => {
    setup();
    expect(frames.size).toBe(0);
  });

  it("asks for one frame at a time while the audio plays", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(result.current.isPlaying).toBe(true);
    expect(frames.size).toBe(1);
    setTime(1.5);
    runFrame();
    expect(result.current.position).toEqual({ sentenceIndex: 0, wordIndex: 1 });
    expect(frames.size).toBe(1);
    setTime(4.2);
    runFrame();
    expect(result.current.position).toEqual({ sentenceIndex: 1, wordIndex: 0 });
    expect(frames.size).toBe(1);
  });

  it("stops the loop on pause and keeps the mark on the last word", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(2.5);
    runFrame();
    act(() => void audio.dispatchEvent(new Event("pause")));
    expect(frames.size).toBe(0);
    expect(cancelSpy).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.position).toEqual({ sentenceIndex: 0, wordIndex: 2 });
  });

  it("moves the mark on a seek while paused, with no frame", () => {
    const { result } = setup();
    setTime(4.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(result.current.position).toEqual({ sentenceIndex: 1, wordIndex: 0 });
    expect(frames.size).toBe(0);
  });

  it("clears the position and the loop when the audio ends", () => {
    const { result } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(4.5);
    runFrame();
    act(() => void audio.dispatchEvent(new Event("ended")));
    expect(frames.size).toBe(0);
    expect(result.current.position).toEqual({ sentenceIndex: -1, wordIndex: -1 });
    expect(result.current.isPlaying).toBe(false);
  });

  it("select and reset set the position", () => {
    const { result } = setup();
    act(() => result.current.select({ sentenceIndex: 1, wordIndex: 0 }));
    expect(result.current.position).toEqual({ sentenceIndex: 1, wordIndex: 0 });
    act(() => result.current.reset());
    expect(result.current.position).toEqual({ sentenceIndex: -1, wordIndex: -1 });
  });

  it("leaves no frame and no listener after unmount", () => {
    const { unmount } = setup();
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(0);
  });
});
