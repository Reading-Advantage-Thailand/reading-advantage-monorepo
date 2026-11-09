// @vitest-environment node
/**
 * Phase 3 adversarial: K2 edge keys and clip-path traversal (track storytime_look_20261107,
 * strategy P3.7).
 *
 * The K2 rule of the import gate (look-r3-import.test.ts) takes a screen word to its clip key:
 * NFC, curly apostrophes to straight, lower case, and padding characters off both ends. The
 * contract rule of lib/contracts/week.ts is wider: it also takes a hyphen. Strategy M49
 * documents that divergence. These cases attack both rules with keys the shipped weeks never
 * carry, and attack the clip paths with traversal shapes. The shipped weeks must hold only
 * keys and paths that pass both rules.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { weekSchema } from "../lib/contracts/week";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content", "l2");
const WEEK_FILES = [
  "w01.json",
  "w02.json",
  "w03.json",
  "w04.json",
  "w05.json",
  "w06.json",
  "w07.json",
  "w08.json",
];

/** A week as plain JSON. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Reads one shipped week file. */
function loadWeek(file: string): Json {
  return JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8"));
}

/**
 * The K2 form of a screen word, mirroring the import gate: NFC, curly apostrophes to straight,
 * lower case, padding characters off both ends.
 */
function k2Key(word: string): string {
  return word
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/^[^a-z']+|[^a-z']+$/g, "");
}

/** The K2 key pattern: lower-case letters with single apostrophes between them. */
const K2_KEY_PATTERN = /^[a-z]+('[a-z]+)*$/;

/** The clip path that the R3 rule expects for one key of one week. */
function clipPath(weekFile: string, key: string): string {
  return `l2/media/w${weekFile.slice(1, 3)}/words/wa-${key}.mp3`;
}

/** Parses a copy of the week with a new wordClips map on the first book. */
function parseWithClips(week: Json, clips: Record<string, string>) {
  const clone = JSON.parse(JSON.stringify(week)) as Json;
  (clone.books[0].audio as Json).wordClips = clips;
  return weekSchema.safeParse(clone);
}

/** Every word clip of one week, as book, key, and path. */
function clipEntries(week: Json): Array<{ kind: string; key: string; path: string }> {
  const entries: Array<{ kind: string; key: string; path: string }> = [];
  for (const book of (week.books ?? []) as Json[]) {
    const clips = ((book.audio as Json | undefined)?.wordClips ?? {}) as Record<string, string>;
    for (const [key, path] of Object.entries(clips)) {
      entries.push({ kind: book.kind as string, key, path });
    }
  }
  return entries;
}

/** Every timed word of one book, normal and slow. */
function timedWords(book: Json): string[] {
  const words: string[] = [];
  const audio = (book.audio ?? {}) as Json;
  for (const list of [audio.sentences ?? [], audio.slowSentences ?? []] as Json[][]) {
    for (const sentence of list) {
      for (const word of (sentence.words ?? []) as Json[]) words.push(word.word as string);
    }
  }
  return words;
}

describe("K2 edge keys", () => {
  const goodPath = "l2/media/w02/words/wa-and.mp3";
  const cases: Array<{ name: string; key: string; k2: string; k2Valid: boolean; contract: boolean }> = [
    { name: "straight apostrophe", key: "don't", k2: "don't", k2Valid: true, contract: true },
    { name: "right single quote", key: "don’t", k2: "don't", k2Valid: true, contract: false },
    { name: "left single quote", key: "‘tis", k2: "'tis", k2Valid: false, contract: false },
    { name: "upper case", key: "Hello", k2: "hello", k2Valid: true, contract: false },
    { name: "NFD accent", key: "élève", k2: "lève", k2Valid: false, contract: false },
    { name: "leading digit", key: "9lives", k2: "lives", k2Valid: true, contract: false },
    { name: "trailing apostrophe", key: "cats'", k2: "cats'", k2Valid: false, contract: false },
    { name: "two apostrophes", key: "it''s", k2: "it''s", k2Valid: false, contract: false },
    { name: "hyphen (M49 divergence)", key: "twenty-one", k2: "twenty-one", k2Valid: false, contract: true },
  ];

  it.each(cases)("the K2 form of $name is $k2", ({ key, k2, k2Valid }) => {
    const form = k2Key(key);
    expect(form, "the K2 normalizer output").toBe(k2);
    expect(form, "the K2 form is stable").toBe(k2Key(form));
    expect(K2_KEY_PATTERN.test(form), "the K2 pattern verdict").toBe(k2Valid);
  });

  it.each(cases)("the contract verdict on $name", ({ key, contract }) => {
    const week = loadWeek("w02.json");
    expect(parseWithClips(week, { [key]: goodPath }).success, "weekSchema verdict").toBe(contract);
  });

  it("rejects the empty key on both rules", () => {
    expect(k2Key("")).toBe("");
    expect(K2_KEY_PATTERN.test("")).toBe(false);
    expect(parseWithClips(loadWeek("w02.json"), { "": goodPath }).success).toBe(false);
  });
});

describe("clip path traversal", () => {
  const week = loadWeek("w02.json");
  const attackPaths: Array<{ name: string; path: string; contract: boolean }> = [
    { name: "parent segment", path: "l2/media/../w01/words/wa-a.mp3", contract: false },
    { name: "dot segment", path: "l2/./media/w02/words/wa-a.mp3", contract: false },
    { name: "leading slash", path: "/l2/media/w02/words/wa-a.mp3", contract: false },
    { name: "backslash", path: "l2\\media\\w02\\words\\wa-a.mp3", contract: false },
    { name: "drive letter", path: "C:\\media\\wa-a.mp3", contract: false },
    { name: "url", path: "https://example.invalid/wa-a.mp3", contract: false },
    { name: "control byte", path: "l2/media/w02/words/wa-a\u0000.mp3", contract: false },
    { name: "empty segment", path: "l2//media/w02/words/wa-a.mp3", contract: false },
    // The contract path rule is generic; the R3 basename rule rejects this shape.
    { name: "other week folder", path: "l2/media/w01/words/wa-a.mp3", contract: true },
  ];

  it.each(attackPaths)("the contract verdict on a path with a $name", ({ path, contract }) => {
    expect(parseWithClips(week, { attack: path }).success, "weekSchema verdict").toBe(contract);
  });

  it.each(attackPaths)("the R3 rule rejects a path with a $name", ({ path }) => {
    expect(path === clipPath("w02.json", "attack"), "the R3 rule must reject").toBe(false);
  });

  it("the R3 rule rejects a clip path with a wrong extension", () => {
    const path = "l2/media/w02/words/wa-a.txt";
    expect(path === clipPath("w02.json", "a"), "the R3 rule must reject").toBe(false);
    expect(path === clipPath("w02.json", "a.txt"), "a key cannot smuggle an extension").toBe(false);
  });
});

describe("the shipped weeks", () => {
  it("every clip key passes the K2 pattern", () => {
    let checked = 0;
    for (const file of WEEK_FILES) {
      for (const entry of clipEntries(loadWeek(file))) {
        checked += 1;
        expect(K2_KEY_PATTERN.test(entry.key), `${file} ${entry.kind} key ${entry.key}`).toBe(true);
      }
    }
    console.log(`clip_entries_checked=${checked}`);
    expect(checked, "clip_entries_checked").toBe(173);
  });

  it("every clip path matches the R3 form of its week and key", () => {
    let checked = 0;
    for (const file of WEEK_FILES) {
      for (const entry of clipEntries(loadWeek(file))) {
        checked += 1;
        expect(entry.path, `${file} ${entry.kind} path of ${entry.key}`).toBe(clipPath(file, entry.key));
      }
    }
    console.log(`clip_paths_checked=${checked}`);
    expect(checked, "clip_paths_checked").toBe(173);
  });

  it("every timed word of a book maps to a clip key", () => {
    let checked = 0;
    for (const file of WEEK_FILES) {
      const week = loadWeek(file);
      for (const book of (week.books ?? []) as Json[]) {
        const clips = ((book.audio as Json | undefined)?.wordClips ?? {}) as Record<string, string>;
        for (const word of timedWords(book)) {
          checked += 1;
          expect(Object.hasOwn(clips, k2Key(word)), `${file} K2 form of ${word}`).toBe(true);
          // The reader tap normalizes with toLowerCase only; the shipped words need nothing more.
          expect(Object.hasOwn(clips, word.toLowerCase()), `${file} lower of ${word}`).toBe(true);
        }
      }
    }
    console.log(`timed_words_checked=${checked}`);
    expect(checked, "timed_words_checked").toBeGreaterThan(0);
  });

  it("a key that both books of one week hold maps to one path", () => {
    const expected: Record<string, string[]> = {
      "w01.json": ["nan"],
      "w02.json": [],
      "w03.json": [],
      "w04.json": ["is", "this"],
      "w05.json": [],
      "w06.json": ["a", "can", "pip", "see"],
      "w07.json": ["a", "is", "pip"],
    };
    for (const file of WEEK_FILES.slice(0, 7)) {
      const entries = clipEntries(loadWeek(file));
      const byKey = new Map<string, string[]>();
      for (const entry of entries) {
        byKey.set(entry.key, [...(byKey.get(entry.key) ?? []), entry.path]);
      }
      const shared = [...byKey.entries()].filter(([, paths]) => paths.length > 1);
      expect(shared.map(([key]) => key).sort(), `${file} shared keys`).toEqual(expected[file]);
      for (const [key, paths] of shared) {
        expect(new Set(paths).size, `${file} key ${key} must name one path`).toBe(1);
      }
    }
  });

  it("a week with no clip still parses and holds no entry", () => {
    const week = loadWeek("w08.json");
    expect(weekSchema.safeParse(week).success, "w08 parses as a draft week").toBe(true);
    expect((week.books as Json[]).length, "w08 holds no book").toBe(0);
    expect(clipEntries(week), "w08 holds no clip").toEqual([]);
  });
});
