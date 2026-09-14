// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../..");
const read = (rel: string) => readFileSync(resolve(appRoot, rel), "utf-8");

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

describe("audio component contracts (static)", () => {
  it("has no setInterval in audio-button.tsx", () => {
    expect(read("components/audio-button.tsx")).not.toMatch(/setInterval/);
  });

  it("audio-button is a thin button over useAudioSegment", () => {
    expect(read("components/audio-button.tsx")).toMatch(/useAudioSegment/);
  });

  it("the shared hook calls load() when the URL changes", () => {
    expect(read("hooks/useAudioSegment.ts")).toMatch(/\.load\(\)/);
  });

  it("the shared hook pauses on unmount", () => {
    expect(read("hooks/useAudioSegment.ts")).toMatch(/\.pause\(\)/);
  });

  it("holds the highlight timer in a ref in all three readers", () => {
    for (const f of [
      "components/articles/article-content.tsx",
      "components/lesson/task/task-reading.tsx",
    ]) {
      const src = read(f);
      expect(src).toMatch(/highlightTimerRef/);
      expect(src).toMatch(/clearTimeout/);
    }
  });

  it("shares audio field names between flashcard actions and games", () => {
    const actions = read("actions/flashcard.ts");
    expect(actions).toMatch(/\.\.\.mapOrderingSentenceFields\(\{/);
    expect(actions).not.toMatch(/\btranslation\s*:/);
    expect(actions).not.toMatch(/\baudioUrl\s*:/);
  });

  it("pauses audio inside sentence-order cleanup", () => {
    expect(read("components/lesson/games/lesson-sentence-order.tsx")).toMatch(
      /audio\.pause\(\)/,
    );
  });
});
