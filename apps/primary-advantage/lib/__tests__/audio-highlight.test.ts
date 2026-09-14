// @vitest-environment node
// The pure-function describes below already test runtime behavior. The seven
// static source-grep cases formerly in this file converted to behavioral
// tests: AudioButton interval-freedom lives in
// components/__tests__/audio-button-behavior.test.tsx, hook load/pause in
// hooks/__tests__/use-audio-segment.test.tsx, hook-driven play/pause in
// components/__tests__/aria-labels-i18n.test.tsx, reader highlight timers in
// the article-content/task-reading highlight behavior tests, flashcard field
// mapping in actions/__tests__/flashcard-ordering-fields.behavior.test.ts,
// and sentence-order cleanup in
// components/lesson/games/__tests__/sentence-order-unmount.behavior.test.tsx.
import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT_CLASSES,
  getWordSegment,
  mapOrderingSentenceFields,
  needsSeek,
  resolveClozeSegment,
  resolveSegmentEnd,
  shouldStopSegment,
} from "@/lib/audio-highlight";

describe("resolveSegmentEnd", () => {
  it("treats a missing end timestamp as play-to-end", () => {
    expect(resolveSegmentEnd(undefined, 42)).toBe(42);
  });

  it("treats a zero end timestamp as play-to-end", () => {
    expect(resolveSegmentEnd(0, 42)).toBe(42);
  });

  it("keeps a real end timestamp", () => {
    expect(resolveSegmentEnd(12.5, 42)).toBe(12.5);
  });
});

describe("shouldStopSegment", () => {
  it("never stops at once for a missing end timestamp", () => {
    expect(shouldStopSegment(0, undefined)).toBe(false);
    expect(shouldStopSegment(999, undefined)).toBe(false);
  });

  it("never stops at once for a zero end timestamp", () => {
    expect(shouldStopSegment(0, 0)).toBe(false);
    expect(shouldStopSegment(999, 0)).toBe(false);
  });

  it("stops within tolerance of a real end timestamp", () => {
    expect(shouldStopSegment(9.6, 10)).toBe(true);
    expect(shouldStopSegment(5, 10)).toBe(false);
  });
});

describe("needsSeek", () => {
  it("skips the seeked wait when already at the target time", () => {
    expect(needsSeek(0, 0)).toBe(false);
    expect(needsSeek(3.0, 3.01)).toBe(false);
  });

  it("seeks when away from the target time", () => {
    expect(needsSeek(5, 0)).toBe(true);
  });
});

describe("mapOrderingSentenceFields", () => {
  it("aligns server snake_case fields to client camelCase fields", () => {
    expect(
      mapOrderingSentenceFields({
        audio_url: "u",
        start_time: 1,
        end_time: 2,
        translationMap: { th: "t" },
      }),
    ).toEqual({
      audioUrl: "u",
      startTime: 1,
      endTime: 2,
      translation: { th: "t" },
    });
  });
});

describe("resolveClozeSegment", () => {
  it("serves real segment times from the matched sentence", () => {
    expect(
      resolveClozeSegment(
        [{ sentence: "a", startTime: 4, endTime: 9 }],
        "a",
        "audio",
      ),
    ).toEqual({ url: "audio", start: 4, end: 9 });
  });

  it("falls back to zero times when no sentence matches", () => {
    expect(resolveClozeSegment([], "missing", "audio")).toEqual({
      url: "audio",
      start: 0,
      end: 0,
    });
  });
});

describe("getWordSegment", () => {
  const words = [
    { text: "a", startTime: 1 },
    { text: "b", startTime: 2 },
    { text: "c", startTime: 3 },
  ];

  it("indexes words with the word index", () => {
    expect(getWordSegment(words, 2)?.text).toBe("c");
  });

  it("returns undefined outside the word range", () => {
    expect(getWordSegment(words, 7)).toBeUndefined();
  });
});

describe("HIGHLIGHT_CLASSES", () => {
  it("gives playing, hover, and selected three distinct hues", () => {
    const { playingSentence, hoverWord, currentWord } = HIGHLIGHT_CLASSES;
    expect(new Set([playingSentence, hoverWord, currentWord]).size).toBe(3);
    expect(playingSentence).toMatch(/amber/);
    expect(hoverWord).toMatch(/emerald/);
    expect(currentWord).toMatch(/blue/);
  });

  it("covers both themes", () => {
    for (const cls of Object.values(HIGHLIGHT_CLASSES)) {
      expect(cls).toMatch(/dark:/);
    }
  });
});
