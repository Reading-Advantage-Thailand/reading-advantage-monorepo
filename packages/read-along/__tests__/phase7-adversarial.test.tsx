// @vitest-environment jsdom
/**
 * The Phase 7 adversarial cases of the read-along hook (track storytime_app_rebuild_20261025).
 *
 * The suppression window of `hooks/use-read-along.ts` holds under rapid churn: a play, stop, play,
 * stop sequence with the late browser events and a frame between the reset and the late pause; a
 * `seeked` event that arrives while the suppression is on; an `ended` and a `seeked` after a reset
 * at the media end; and the return of the mark on `play` and on a word tap (`select`). The rows
 * S1 to S4 and C1 to C4 of `phase7-mark-after-stop.test.tsx` hold the single-stop paths; these rows
 * attack the sequences.
 *
 * Every row names the defect it would catch. Each check is proven with a mutant of the hook in a
 * scratch copy inside this folder (the relative imports keep resolving); the mutant run must show
 * the defect. The copies are removed in afterAll. No production file is edited.
 *
 * A4: every row asserts the mark first appears (the input set is not empty), and the labeled
 * counts hold floors.
 */
import { act, renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReadAlongSentence } from "../lib/align";
import { NO_POSITION, type ReadAlongPosition } from "../lib/position";
import { useReadAlong } from "../hooks/use-read-along";

/** Page 1 of the fixture. */
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

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let audio: HTMLAudioElement;

/** The labeled counts of the rows (A4). */
const counts = { rows: 0, mutants_killed: 0 };

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

/** The type of the hook module that a row or a mutant provides. */
type HookModule = typeof import("../hooks/use-read-along");

/**
 * Mounts the hook of one module with the stub audio element.
 * @param mod The hook module.
 * @returns The renderHook result.
 */
function mount(mod: HookModule) {
  const audioRef = { current: audio };
  return renderHook(() => mod.useReadAlong({ audioRef, sentences: pageOne }));
}

/** The folder of this test file; the scratch copies land here flat, so `../lib` keeps resolving. */
const here = dirname(fileURLToPath(import.meta.url));
const HOOK_SOURCE = resolve(here, "../hooks/use-read-along.ts");

/** The scratch copies of this run; removed in afterAll. */
const scratchFiles: string[] = [];

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
  for (const file of scratchFiles) rmSync(file, { force: true });
});

/**
 * Writes a mutant copy of the hook with one-anchor replacements.
 * @param name The file name of the copy.
 * @param replacements The anchored replacements.
 * @returns The imported mutant module.
 */
async function writeHookMutant(name: string, replacements: Array<[string, string]>): Promise<HookModule> {
  let text = readFileSync(HOOK_SOURCE, "utf8");
  for (const [anchor, next] of replacements) {
    const found = text.split(anchor).length - 1;
    expect(found, `the anchor must sit once: ${anchor.slice(0, 60)}`).toBe(1);
    text = text.split(anchor).join(next);
  }
  const target = join(here, name);
  writeFileSync(target, text);
  scratchFiles.push(target);
  return (await import(/* @vite-ignore */ target)) as HookModule;
}

describe("the suppression window holds under rapid churn", () => {
  it("H1 a rapid play, stop, play, stop sequence leaves no mark and stops the loop", () => {
    const { result } = mount({ useReadAlong });
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "the voice must mark the word first").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    // First stop: the time goes to 0, the host resets, a frame runs before the late pause, then
    // the late events arrive.
    setTime(0);
    act(() => result.current.reset());
    runFrame();
    lateStopEvents();
    expect(result.current.position, "the first stop leaves no mark").toEqual(NO_POSITION);
    // Second play: the mark returns.
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(2.5);
    runFrame();
    expect(result.current.position, "the mark returns on play").toEqual({ sentenceIndex: 0, wordIndex: 2 });
    // Second stop.
    setTime(0);
    act(() => result.current.reset());
    runFrame();
    lateStopEvents();
    expect(result.current.position, "the second stop leaves no mark").toEqual(NO_POSITION);
    expect(result.current.isPlaying, "the loop is stopped").toBe(false);
    expect(frames.size, "no pending frame after the last pause").toBe(0);
    counts.rows += 1;
  });

  it("H2 a seeked event during the suppression marks no word, and play restores the mark", () => {
    const { result } = mount({ useReadAlong });
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "the voice must mark the word first").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    setTime(0);
    act(() => result.current.reset());
    // A `seeked` arrives while the suppression is on, at a time that would mark a word.
    setTime(1.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(result.current.position, "a seek during the suppression marks no word").toEqual(NO_POSITION);
    act(() => void audio.dispatchEvent(new Event("play")));
    runFrame();
    expect(result.current.position, "the mark returns on play after the suppressed seek").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    counts.rows += 1;
  });

  it("H3 an ended and a seeked after a reset at the media end leave no mark, twice", () => {
    const { result } = mount({ useReadAlong });
    for (let round = 0; round < 2; round += 1) {
      act(() => void audio.dispatchEvent(new Event("play")));
      setTime(2.9);
      runFrame();
      expect(result.current.position, `round ${round + 1}: the voice marks the last word`).toEqual({
        sentenceIndex: 0,
        wordIndex: 2,
      });
      setTime(0);
      act(() => result.current.reset());
      act(() => void audio.dispatchEvent(new Event("ended")));
      expect(result.current.position, `round ${round + 1}: the late ended marks no word`).toEqual(
        NO_POSITION,
      );
      act(() => void audio.dispatchEvent(new Event("seeked")));
      expect(result.current.position, `round ${round + 1}: the late seeked marks no word`).toEqual(
        NO_POSITION,
      );
    }
    // The mark still follows the voice afterwards.
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(0.5);
    runFrame();
    expect(result.current.position, "the mark returns after the churn").toEqual({
      sentenceIndex: 0,
      wordIndex: 0,
    });
    counts.rows += 1;
  });

  it("H4 a word tap after a stop marks the word and clears the suppression", () => {
    const { result } = mount({ useReadAlong });
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "the voice must mark the word first").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    setTime(0);
    act(() => result.current.reset());
    lateStopEvents();
    expect(result.current.position).toEqual(NO_POSITION);
    const tapped: ReadAlongPosition = { sentenceIndex: 0, wordIndex: 2 };
    act(() => result.current.select(tapped));
    expect(result.current.position, "the tap marks the word").toEqual(tapped);
    // The suppression is cleared: a seek now syncs the mark.
    setTime(1.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(result.current.position, "a seek after the tap moves the mark").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    counts.rows += 1;
  });
});

describe("the churn rows kill a weakened hook copy", () => {
  it("M-H1 a mutant without the suppression check in the paused sync is killed by H2", async () => {
    const mutant = await writeHookMutant("use-read-along.m1.tsx", [
      ["      if (suppressSyncRef.current) return;\n      if (audio.readyState >= 1) sync();", "      if (audio.readyState >= 1) sync();"],
    ]);
    const { result } = mount(mutant);
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "setup: the voice marks the word").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    setTime(0);
    act(() => result.current.reset());
    setTime(1.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(result.current.position, "the defect: the suppressed seek marks a word").toEqual({
      sentenceIndex: 0,
      wordIndex: 1,
    });
    counts.mutants_killed += 1;
  });

  it("M-H2 a mutant whose play does not clear the suppression is killed by H2", async () => {
    const mutant = await writeHookMutant("use-read-along.m2.tsx", [
      ["    const onPlay = () => {\n      suppressSyncRef.current = false;", "    const onPlay = () => {"],
    ]);
    const { result } = mount(mutant);
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    setTime(0);
    act(() => result.current.reset());
    lateStopEvents();
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    expect(result.current.position, "the defect: play keeps the suppression and marks no word").toEqual(
      NO_POSITION,
    );
    counts.mutants_killed += 1;
  });

  it("M-H3 a mutant whose select does not clear the suppression is killed by H4", async () => {
    const mutant = await writeHookMutant("use-read-along.m3.tsx", [
      ["  const select = useCallback((next: ReadAlongPosition) => {\n    suppressSyncRef.current = false;", "  const select = useCallback((next: ReadAlongPosition) => {"],
    ]);
    const { result } = mount(mutant);
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    setTime(0);
    act(() => result.current.reset());
    lateStopEvents();
    act(() => result.current.select({ sentenceIndex: 0, wordIndex: 2 }));
    setTime(1.5);
    act(() => void audio.dispatchEvent(new Event("seeked")));
    expect(
      result.current.position,
      "the defect: the tap keeps the suppression, so the seek does not move the mark",
    ).toEqual({ sentenceIndex: 0, wordIndex: 2 });
    counts.mutants_killed += 1;
  });

  it("M-H4 a mutant without the suppression check in the frame loop is killed by H1", async () => {
    const mutant = await writeHookMutant("use-read-along.m4.tsx", [
      ["      if (!suppressSyncRef.current) sync();", "      sync();"],
    ]);
    const { result } = mount(mutant);
    act(() => void audio.dispatchEvent(new Event("play")));
    setTime(1.5);
    runFrame();
    setTime(0);
    act(() => result.current.reset());
    runFrame();
    expect(
      result.current.position,
      "the defect: the frame between the reset and the late pause marks a word",
    ).toEqual({ sentenceIndex: 0, wordIndex: 0 });
    counts.mutants_killed += 1;
  });
});

describe("labels", () => {
  it("the rows ran and the fixture marks a word before each stop (A4)", () => {
    console.log(`rows=${counts.rows}`);
    console.log(`mutants_killed=${counts.mutants_killed}`);
    expect(pageOne[0]!.words.length, "words of the fixture").toBe(3);
    expect(counts.rows, "rows floor 4").toBeGreaterThanOrEqual(4);
    expect(counts.mutants_killed, "mutants_killed floor 4").toBeGreaterThanOrEqual(4);
  });
});
