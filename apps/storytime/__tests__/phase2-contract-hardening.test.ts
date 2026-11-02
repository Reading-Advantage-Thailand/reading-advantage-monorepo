// @vitest-environment node
// Phase 2 round 6 (Green, 2026-11-02): the adversarial findings F23, F24, F25, and the key rule
// of F22. Every hostile copy is a deep clone of a shipped week built inside the test.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { weekSchema } from "../lib/contracts/week";

const weekDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..", "content", "l2");
const WEEK_FILES = readdirSync(weekDirectory).filter((name) => /^w\d\d\.json$/.test(name)).sort();

/** A week as plain JSON, for a hostile edit. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads a shipped week and clones it.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns A deep clone that a test may break.
 */
function shipped(file: string): Json {
  return structuredClone(JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json);
}

/**
 * Parses a hostile copy and gives the field paths of its issues.
 * @param week The hostile week.
 * @returns The issue paths as dotted text, or null when the copy parses.
 */
function failPaths(week: unknown): string[] | null {
  const result = weekSchema.safeParse(week);
  return result.success ? null : result.error.issues.map((issue) => issue.path.join("."));
}

describe("F23 opening.audio uses the media path rule", () => {
  it("rejects a parent segment, an absolute path, a URL, and a NUL byte in each item", () => {
    for (const value of ["../../../etc/passwd", "/abs/x.mp3", "https://evil/x", "a\u0000b", ""]) {
      const week = shipped("w02.json");
      week.opening.audio[0] = [value];
      expect(failPaths(week), JSON.stringify(value)).toContain("opening.audio.0.0");
    }
  });

  it("keeps the opening audio of every shipped week", () => {
    for (const file of WEEK_FILES) expect(failPaths(shipped(file)), file).toBeNull();
  });
});

describe("F24 the media path is an allowlist", () => {
  const hostile = [
    "https://evil.example/x.png",
    "file:///etc/passwd",
    "data:text/plain;base64,AAAA",
    "a\u0000b.png",
    "a\nb.png",
    "./x.png",
    ".",
    "a//b.png",
    "a/",
    "a/./b.png",
    "C:/x.png",
    "~/x.png",
    "%2e%2e/x.png",
    "..%2fx.png",
    "\uff0e\uff0e/x.png",
    "a b.png",
    `${"a".repeat(201)}.png`,
    "a/".repeat(5000) + "a",
    "a".repeat(100_000),
  ];

  it("rejects a URL, a control byte, a dot segment, an empty segment, a drive, and a long name", () => {
    for (const value of hostile) {
      const week = shipped("w02.json");
      week.books[0].audio.file = value;
      expect(failPaths(week), JSON.stringify(value.slice(0, 40))).toContain("books.0.audio.file");
    }
  });

  it("accepts a normal nested file name", () => {
    const week = shipped("w02.json");
    week.books[0].audio.file = "l2/media/w02/books/1-tap.v2_final.mp3";
    expect(failPaths(week)).toBeNull();
  });
});

describe("F22 the key follows the level and the week", () => {
  it("rejects a key that names another level or week, at meta.key", () => {
    for (const key of ["st2/1", "st4/9", "st3/2", "st2/02"]) {
      const week = shipped("w02.json");
      week.meta.key = key;
      expect(failPaths(week), key).toContain("meta.key");
    }
  });

  it("accepts the key st<level>/<week> of each shipped week", () => {
    for (const file of WEEK_FILES) {
      const week = shipped(file);
      expect(week.meta.key).toBe(`st${week.meta.level}/${week.meta.week}`);
      expect(failPaths(week), file).toBeNull();
    }
  });
});

describe("F25 the timings hold the order that the player assumes", () => {
  it("rejects a time that is not finite", () => {
    for (const value of [Infinity, -Infinity, NaN]) {
      const week = shipped("w01.json");
      week.books[0].audio.sentences[0].startTime = value;
      expect(failPaths(week), String(value)).toContain("books.0.audio.sentences.0.startTime");
      const word = shipped("w01.json");
      word.books[0].audio.sentences[0].words[0].end = value;
      expect(failPaths(word), String(value)).toContain("books.0.audio.sentences.0.words.0.end");
    }
  });

  it("rejects a sentence that starts before the sentence before it", () => {
    const week = shipped("w01.json");
    const sentences = week.books[0].audio.sentences as Json[];
    expect(sentences.length).toBeGreaterThan(2);
    const [first, second] = [sentences[0], sentences[1]];
    sentences[0] = second;
    sentences[1] = first;
    expect(failPaths(week)).toContain("books.0.audio.sentences.1.startTime");
  });

  it("rejects a word outside the time range of its sentence", () => {
    const week = shipped("w01.json");
    const sentence = week.books[0].audio.sentences.find((entry: Json) => entry.words.length > 0);
    sentence.words[0].start = sentence.startTime - 1;
    expect(failPaths(week)).toContain(
      `books.0.audio.sentences.${week.books[0].audio.sentences.indexOf(sentence)}.words.0.start`,
    );
    const late = shipped("w01.json");
    const target = late.books[0].audio.sentences.find((entry: Json) => entry.words.length > 0);
    target.words[0].end = target.endTime + 5;
    expect(failPaths(late)).toContain(
      `books.0.audio.sentences.${late.books[0].audio.sentences.indexOf(target)}.words.0.end`,
    );
  });

  it("rejects a page beyond the page count of its book", () => {
    const week = shipped("w01.json");
    const book = week.books[0];
    book.audio.sentences[0].page = book.pages.length + 1;
    expect(failPaths(week)).toContain("books.0.audio.sentences.0.page");
    const slow = shipped("w01.json");
    const slowBook = slow.books[0];
    if (slowBook.audio.slowSentences.length > 0) {
      slowBook.audio.slowSentences[0].page = slowBook.pages.length + 1;
      expect(failPaths(slow)).toContain("books.0.audio.slowSentences.0.page");
    }
  });

  it("keeps the shipped weeks", () => {
    for (const file of WEEK_FILES) expect(failPaths(shipped(file)), file).toBeNull();
  });
});

describe("F30 and F25 the remaining timing cases", () => {
  it("rejects words that start out of order inside a sentence, for a book, a slow reading, and a song", () => {
    const week = shipped("w01.json");
    const swap = (words: Json[]): void => {
      [words[0], words[1]] = [words[1], words[0]];
    };
    const sentence = (week.books[0].audio.sentences as Json[]).find((entry) => entry.words.length > 1)!;
    const index = week.books[0].audio.sentences.indexOf(sentence);
    swap(sentence.words);
    expect(failPaths(week)).toContain(`books.0.audio.sentences.${index}.words.1.start`);

    const slow = shipped("w01.json");
    const slowSentence = (slow.books[0].audio.slowSentences as Json[]).find((entry) => entry.words.length > 1)!;
    swap(slowSentence.words);
    expect(failPaths(slow)).toContain(
      `books.0.audio.slowSentences.${slow.books[0].audio.slowSentences.indexOf(slowSentence)}.words.1.start`,
    );

    const song = shipped("w01.json");
    const line = (song.song.times as Json[]).find((entry) => entry.words.length > 1)!;
    swap(line.words);
    expect(failPaths(song)).toContain(`song.times.${song.song.times.indexOf(line)}.words.1.start`);
  });

  it("rejects a sentence that starts before the sentence before it ends", () => {
    const week = shipped("w01.json");
    const sentences = week.books[0].audio.sentences as Json[];
    sentences[1].startTime = sentences[0].endTime - 0.5;
    expect(failPaths(week)).toContain("books.0.audio.sentences.1.startTime");
  });

  it("rejects a paged book that has a page with no sentence", () => {
    for (const key of ["sentences", "slowSentences"]) {
      const week = shipped("w01.json");
      const book = week.books[0];
      book.audio[key] = (book.audio[key] as Json[]).filter((entry) => entry.page !== 3);
      expect(book.audio[key].length, key).toBeGreaterThan(0);
      expect(failPaths(week), key).toContain(`books.0.audio.${key}`);
    }
  });

  it("keeps the shipped weeks", () => {
    for (const file of WEEK_FILES) expect(failPaths(shipped(file)), file).toBeNull();
  });
});
