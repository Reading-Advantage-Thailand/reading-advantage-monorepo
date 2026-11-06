// @vitest-environment node
// Phase 2 adversarial guards (role adversarial-testing, 2026-11-02). Every case builds its hostile
// copy as a deep clone of a shipped week inside the test; no week fixture file exists. Each case
// holds at the audited HEAD. A defect that the probes found is a finding, not a test here.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { blendPlanForWord } from "../lib/blend";
import { weekSchema } from "../lib/contracts/week";
import { mediaOf, receiveWeek, weekPath } from "../scripts/receive-weeks";
import {
  buildWordMaps,
  findPosition,
  NO_POSITION,
  seekTimeForSentence,
  seekTimeForWord,
  sentencesOfPage,
  splitDisplayWords,
  wordCutBounds,
} from "../../../packages/read-along/lib";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const root = resolve(app, "../..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");
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

/**
 * Lists every file of the content folder with its text.
 * @returns A map of relative path to text.
 */
function contentSnapshot(): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.set(relative(contentDirectory, path), readFileSync(path, "utf8"));
    }
  };
  walk(contentDirectory);
  return files;
}

describe("the week contract rejects a hostile copy with its field path", () => {
  it("rejects a wrong, a text, and a missing version", () => {
    for (const version of [2, 0, "1", null, undefined]) {
      const week = shipped("w01.json");
      if (version === undefined) delete week.version;
      else week.version = version;
      expect(failPaths(week), `version ${String(version)}`).toContain("version");
    }
  });

  it("rejects a published week with a duplicate book kind or a missing book", () => {
    const duplicate = shipped("w01.json");
    duplicate.books[1].kind = duplicate.books[0].kind;
    expect(failPaths(duplicate)).toContain("books");
    const missing = shipped("w01.json");
    missing.books = missing.books.filter((book: Json) => book.kind !== "decodable");
    expect(failPaths(missing)).toContain("books");
    const extra = shipped("w01.json");
    extra.books.push(structuredClone(extra.books[0]));
    expect(failPaths(extra)).toContain("books");
    const none = shipped("w01.json");
    none.books = [];
    expect(failPaths(none)).toContain("books");
  });

  it("rejects a status other than draft or published, with every spelling", () => {
    for (const status of ["archived", "Published", " published", "published ", "", null, 1, ["published"]]) {
      const week = shipped("w01.json");
      week.meta.status = status;
      expect(failPaths(week), `status ${JSON.stringify(status)}`).toContain("meta.status");
    }
    const absent = shipped("w02.json");
    delete absent.meta.status;
    expect(weekSchema.parse(absent).meta.status).toBe("draft");
  });

  it("rejects a level, a week, a program, and a key out of range", () => {
    const cases: Array<[string, unknown]> = [
      ["meta.level", 0],
      ["meta.level", 5],
      ["meta.level", 2.5],
      ["meta.level", "2"],
      ["meta.week", 0],
      ["meta.week", 33],
      ["meta.week", "1"],
      ["meta.program", "primary"],
      ["meta.key", "st2/1\n"],
      ["meta.key", "st9/1"],
      ["meta.key", "st2/../x"],
    ];
    for (const [field, value] of cases) {
      const week = shipped("w01.json");
      week.meta[field.split(".")[1]] = value;
      expect(failPaths(week), `${field} ${JSON.stringify(value)}`).toContain(field);
    }
  });

  it("rejects a page of 0, a negative page, and a fractional page", () => {
    for (const page of [0, -1, 1.5, "1", Number.NaN]) {
      const week = shipped("w01.json");
      week.books[0].audio.sentences[0].page = page;
      expect(failPaths(week), `page ${String(page)}`).toContain("books.0.audio.sentences.0.page");
    }
  });

  it("rejects a time out of order, a negative time, and a time that is not a number", () => {
    const sentence = shipped("w01.json");
    const first = sentence.books[0].audio.sentences[0];
    [first.startTime, first.endTime] = [9, 1];
    expect(failPaths(sentence)).toContain("books.0.audio.sentences.0.endTime");
    const word = shipped("w01.json");
    const timed = word.books[0].audio.sentences[0].words[0];
    [timed.start, timed.end] = [3, 1];
    expect(failPaths(word)).toContain("books.0.audio.sentences.0.words.0.end");
    for (const value of [-1, -0.001, Number.NaN, Number.NEGATIVE_INFINITY]) {
      const negative = shipped("w01.json");
      negative.books[0].audio.sentences[0].startTime = value;
      expect(failPaths(negative), `startTime ${String(value)}`).toContain(
        "books.0.audio.sentences.0.startTime",
      );
    }
    const slow = shipped("w01.json");
    slow.books[0].audio.slowSentences = [{ sentence: "a", startTime: 5, endTime: 1, words: [] }];
    expect(failPaths(slow)).toContain("books.0.audio.slowSentences.0.endTime");
    const song = shipped("w01.json");
    song.song = {
      title: "t",
      lines: [{ text: "a", part: "verse", gesture: "g" }],
      times: [{ sentence: "a", startTime: 2, endTime: 1 }],
    };
    expect(failPaths(song)).toContain("song.times.0.endTime");
  });

  it("rejects a parent segment, an absolute path, and a backslash in each media field it guards", () => {
    const setters: Array<[string, (week: Json, value: string) => void]> = [
      ["books.0.pages.0.image.file", (w, v) => (w.books[0].pages[0].image = { file: v })],
      ["books.0.cover.file", (w, v) => (w.books[0].cover = { file: v })],
      ["books.0.audio.file", (w, v) => (w.books[0].audio.file = v)],
      ["books.0.audio.slowFile", (w, v) => (w.books[0].audio.slowFile = v)],
      ["song.audio", (w, v) => (w.song = { title: "t", lines: [{ text: "a", part: "verse", gesture: "g" }], audio: v })],
      ["song.poster", (w, v) => (w.song = { title: "t", lines: [{ text: "a", part: "verse", gesture: "g" }], poster: v })],
      ["song.video", (w, v) => (w.song = { title: "t", lines: [{ text: "a", part: "verse", gesture: "g" }], video: v })],
      ["focus.element.audio", (w, v) => (w.focus.element = { id: "a", graphemes: ["a"], sound: "a", audio: v })],
      ["focus.family.words.0.image.file", (w, v) => (w.focus.family = { words: [{ word: "x", image: { file: v } }], max: 8 })],
      ["review.0.cards.0.audio", (w, v) => (w.review = [{ day: 1, cards: [{ kind: "sound", text: "a", week: 1, audio: v }] }])],
    ];
    const hostile = ["../x.png", "a/../../x.png", "..", "/etc/passwd", "a\\b.png", "..\\x.png", "//evil/x", "C:\\x", ""];
    for (const [field, set] of setters) {
      for (const value of hostile) {
        const week = shipped("w02.json");
        set(week, value);
        expect(failPaths(week), `${field} ${JSON.stringify(value)}`).toContain(field);
      }
    }
  });

  it("keeps a parsed unknown key from reaching the global prototype", () => {
    const text = JSON.stringify(shipped("w02.json")).replace(
      '{"version":1',
      '{"__proto__":{"polluted":1},"version":1',
    );
    const parsed = weekSchema.safeParse(JSON.parse(text));
    expect(parsed.success).toBe(true);
    expect(({} as Json).polluted).toBeUndefined();
  });

  it("accepts a draft with a duplicate book kind, because only a published week needs one of each", () => {
    const draft = shipped("w02.json");
    draft.books.push(structuredClone(draft.books[0]));
    expect(failPaths(draft)).toBeNull();
  });
});

describe("the receiving step refuses a hostile week and keeps the content folder", () => {
  it("throws with the field path for each hostile copy", () => {
    const week = shipped("w01.json");
    week.version = 2;
    expect(() => receiveWeek(week)).toThrow(/version: Invalid literal value/);
    const traversal = shipped("w01.json");
    traversal.books[0].audio.file = "../../outside.mp3";
    expect(() => receiveWeek(traversal)).toThrow(/books\.0\.audio\.file: a media path holds no parent segment/);
  });

  it("derives the target path from a level and a week that the contract bounds", () => {
    for (const file of WEEK_FILES) {
      const week = shipped(file);
      const received = receiveWeek(week);
      expect(received.path).toBe(weekPath(week.meta.level, week.meta.week));
      expect(received.path).toMatch(/^apps\/storytime\/content\/l[1-4]\/w\d\d\.json$/);
      expect(resolve(root, received.path).startsWith(`${contentDirectory}/`)).toBe(true);
    }
    for (const [level, weekNumber] of [[0, 1], [5, 1], [2, 0], [2, 33], [2.5, 1]]) {
      const week = shipped("w02.json");
      week.meta.level = level;
      week.meta.week = weekNumber;
      expect(() => receiveWeek(week), `level ${level} week ${weekNumber}`).toThrow(/breaks the contract/);
    }
  });

  it("writes the source text unchanged, so the status of the source stays", () => {
    for (const file of WEEK_FILES) {
      const text = readFileSync(resolve(weekDirectory, file), "utf8");
      const received = receiveWeek(JSON.parse(text), { text });
      expect(received.contents).toBe(text);
      expect((JSON.parse(received.contents) as Json).meta.status).toBe(
        (JSON.parse(text) as Json).meta.status,
      );
    }
  });

  it("starts no run on import and exits 64 on a hostile command line before it writes", () => {
    const before = contentSnapshot();
    const tsx = resolve(root, "node_modules/.bin/tsx");
    const script = resolve(app, "scripts/receive-weeks.ts");
    const hostile: string[][] = [
      [],
      ["--commit", "main"],
      ["--commit", "ABCDEF1234567"],
      ["--commit", "abcdef1; touch /tmp/pwned"],
      ["--commit", "abc"],
      ["--commit", "$(id)"],
      ["--commit", `${"a".repeat(41)}`],
      ["--commit", "--level"],
      ["--commit", "abcdef1", "--level", "5"],
      ["--commit", "abcdef1", "--level", "0"],
      ["--commit", "abcdef1", "--level", "x"],
      ["--commit", "abcdef1", "--weeks", "3-1"],
      ["--commit", "abcdef1", "--evil", "x"],
    ];
    for (const args of hostile) {
      let status = 0;
      try {
        execFileSync(tsx, [script, ...args], { encoding: "utf8", stdio: "pipe", timeout: 60_000 });
      } catch (error) {
        status = (error as { status?: number }).status ?? -1;
      }
      expect(status, `exit code of ${JSON.stringify(args)}`).toBe(64);
    }
    const after = contentSnapshot();
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  }, 300_000);
});

describe("the media list keeps a picture with a file next to a picture without one", () => {
  it("lists a page picture with a file by name and a page picture without one as missing", () => {
    const week = shipped("w01.json");
    week.books[0].pages[0].image = { prompt: "p" };
    week.books[0].pages[1].image = { file: "pages/two.png" };
    week.books[0].pages[2].image = {};
    const media = mediaOf(weekSchema.parse(week));
    const missing = media.filter((item) => item.missing);
    const kind = week.books[0].kind as string;
    expect(missing.map((item) => item.missing)).toContain(`page 1 of the ${kind} book`);
    expect(missing.map((item) => item.missing)).toContain(`page 3 of the ${kind} book`);
    expect(missing.map((item) => item.missing)).not.toContain(`page 2 of the ${kind} book`);
    const named = media.find((item) => item.file === "pages/two.png");
    expect(named).toMatchObject({ kind: "book-page-picture", rule: "9.1" });
    expect(named?.missing).toBeUndefined();
  });

  it("counts a file that two pages share once, and lists every other page", () => {
    const week = shipped("w01.json");
    week.books[0].pages[0].image = { file: "same.png" };
    week.books[0].pages[1].image = { file: "same.png" };
    const media = mediaOf(weekSchema.parse(week));
    expect(media.filter((item) => item.file === "same.png")).toHaveLength(1);
    const pictureCount = week.books[0].pages.filter((page: Json) => page.image).length;
    const rows = media.filter(
      (item) => item.kind === "book-page-picture" && item.file.startsWith("books.0.pages."),
    );
    expect(rows.length).toBe(
      week.books[0].pages.filter((page: Json) => page.image && !page.image.file).length,
    );
    expect(pictureCount).toBeGreaterThan(2);
  });

  it("lists the missing pages of two books once each, with the book kind", () => {
    const week = shipped("w02.json");
    // The release pin ships page pictures for w02, so the clone drops the page files to make the
    // missing rows this case checks.
    for (const book of week.books) for (const page of book.pages) if (page.image) delete page.image.file;
    const media = mediaOf(weekSchema.parse(week));
    const readalong = media.filter((item) => item.missing?.endsWith("of the readalong book"));
    const decodable = media.filter((item) => item.missing?.endsWith("of the decodable book"));
    expect(readalong.length).toBeGreaterThan(0);
    expect(decodable.length).toBeGreaterThan(0);
    expect(new Set(media.map((item) => item.file)).size).toBe(media.length);
  });

  it("lists the opening audio of the shipped week by name", () => {
    const week = shipped("w02.json");
    const media = mediaOf(weekSchema.parse(week));
    expect(media.some((item) => item.kind === "phoneme" && item.file.startsWith("phonemes/"))).toBe(true);
  });
});

describe("the shipped timings hold the order that the player assumes", () => {
  it("holds sentences in start order, words inside their sentence, and pages inside the book", () => {
    for (const file of WEEK_FILES) {
      const week = shipped(file);
      for (const [bookIndex, book] of week.books.entries()) {
        for (const key of ["sentences", "slowSentences"] as const) {
          const sentences: Json[] = book.audio?.[key] ?? [];
          let previous = -1;
          for (const [index, sentence] of sentences.entries()) {
            const where = `${file} books.${bookIndex}.${key}.${index}`;
            expect(sentence.startTime, `${where} starts before the sentence before it`).toBeGreaterThanOrEqual(previous);
            previous = sentence.startTime;
            if (sentence.page !== undefined) {
              expect(sentence.page, `${where} page`).toBeLessThanOrEqual(book.pages.length);
            }
            let previousWord = -1;
            for (const word of sentence.words ?? []) {
              expect(word.start, `${where} word starts before the word before it`).toBeGreaterThanOrEqual(previousWord);
              previousWord = word.start;
              expect(word.start, `${where} word starts before its sentence`).toBeGreaterThanOrEqual(sentence.startTime - 0.001);
              expect(word.end, `${where} word ends after its sentence`).toBeLessThanOrEqual(sentence.endTime + 0.001);
            }
          }
        }
      }
    }
  });

  it("gives every page of a book with timings at least one sentence", () => {
    for (const file of WEEK_FILES) {
      const week = shipped(file);
      for (const book of week.books) {
        const sentences: Json[] = book.audio?.sentences ?? [];
        if (sentences.length === 0) continue;
        for (let page = 1; page <= book.pages.length; page += 1) {
          expect(sentencesOfPage(sentences as never, page).length, `${file} ${book.kind} page ${page}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("the blend function survives hostile words and hostile week data", () => {
  const week = weekSchema.parse(shipped("w02.json"));

  it("plays an empty word, edge punctuation, and a zero-width character whole with no grapheme", () => {
    for (const word of ["", "...", "\u200b", "—", "🙂", "?!"]) {
      expect(blendPlanForWord(word, week)).toEqual({ mode: "whole", graphemes: [] });
    }
  });

  it("keeps the graphemes of a blended word equal to the word and all taught", () => {
    for (const file of WEEK_FILES) {
      const parsed = weekSchema.parse(shipped(file));
      for (const book of parsed.books) {
        for (const page of book.pages) {
          for (const token of page.text.split(/\s+/)) {
            const plan = blendPlanForWord(token, parsed);
            const bare = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
            expect(plan.graphemes.join(""), `${file} ${token} ${plan.mode}`).toBe(bare);
          }
        }
      }
    }
  });

  it("plays whole a word that the week does not teach, and a word that mixes taught and untaught letters", () => {
    expect(blendPlanForWord("zzz", week).mode).toBe("whole");
    expect(blendPlanForWord("nax", week).mode).toBe("whole");
    expect(blendPlanForWord("nan", week).mode).toBe("blend");
  });

  it("plays whole in a sound book, for a tricky word, and for a listed name", () => {
    const sound = structuredClone(week);
    const decodable = sound.books.find((book) => book.kind === "decodable")!;
    decodable.soundBook = true;
    expect(blendPlanForWord("nan", sound).mode).toBe("whole");
    const tricky = structuredClone(week);
    tricky.focus.trickyWords = ["nan"];
    expect(blendPlanForWord("nan", tricky).mode).toBe("whole");
    const named = structuredClone(week);
    named.books.find((book) => book.kind === "decodable")!.names = ["Nan"];
    expect(blendPlanForWord("nan", named).mode).toBe("whole");
  });

  it("plays a week with no tags, no focus, and no book whole, with no throw", () => {
    const bare = { ...structuredClone(week), tags: undefined, focus: undefined, books: undefined } as never;
    expect(blendPlanForWord("cat", bare)).toEqual({ mode: "whole", graphemes: ["c", "a", "t"] });
  });

  it("does not take a taught grapheme from a tag with an empty grapheme", () => {
    const odd = structuredClone(week);
    odd.focus.element = undefined;
    odd.tags = { graphVersion: "", taught: ["english.phonics.gpc..x", "english.phonics.gpc."], reviewed: [] };
    expect(blendPlanForWord("cat", odd).mode).toBe("whole");
  });

  it("blends a one-million-letter word in linear time", () => {
    const start = Date.now();
    const plan = blendPlanForWord("n".repeat(1_000_000), week);
    expect(plan.mode).toBe("blend");
    expect(Date.now() - start).toBeLessThan(5_000);
  });
});

describe("the timing functions survive hostile timings", () => {
  const sentence = (
    startTime: number,
    endTime: number,
    words: Array<{ word: string; start: number; end: number }> = [],
    extra: { page?: number } = {},
  ) => ({ sentence: "x", startTime, endTime, words, ...extra });

  it("gives no position for an empty list, a time before the first sentence, and NaN", () => {
    expect(findPosition([], 5, NO_POSITION)).toEqual(NO_POSITION);
    expect(findPosition([sentence(2, 3)], 0, NO_POSITION)).toEqual(NO_POSITION);
    expect(findPosition([sentence(0, 1)], Number.NaN, NO_POSITION)).toEqual(NO_POSITION);
    expect(findPosition([sentence(0, 1)], -5, NO_POSITION)).toEqual(NO_POSITION);
  });

  it("keeps the sentence and gives no word for a sentence with no words", () => {
    expect(findPosition([sentence(0, 2)], 1, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: -1 });
  });

  it("finds a zero-length word and keeps the last word in a gap", () => {
    const zero = [sentence(0, 3, [{ word: "a", start: 1, end: 1 }, { word: "b", start: 2, end: 2.5 }])];
    expect(findPosition(zero, 1, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 0 });
    expect(findPosition(zero, 1.5, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 0 });
    expect(findPosition(zero, 2.2, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });

  it("returns the previous object when nothing changed", () => {
    const list = [sentence(0, 2, [{ word: "a", start: 0, end: 1 }])];
    const first = findPosition(list, 0.5, NO_POSITION);
    expect(findPosition(list, 0.6, first)).toBe(first);
  });

  it("seeks to the sentence start when the audio word is missing, and never below 0", () => {
    const one = sentence(3, 4, [{ word: "a", start: 3, end: 4 }]);
    expect(seekTimeForWord(one, -1)).toBeCloseTo(2.95);
    expect(seekTimeForWord(one, 5)).toBeCloseTo(2.95);
    expect(seekTimeForSentence(sentence(0.01, 1))).toBe(0);
    expect(seekTimeForWord(sentence(0, 1, [{ word: "a", start: 0, end: 1 }]), 0)).toBe(0);
  });

  it("cuts a word 30 ms before its start, never before 0, and ends at the measured end", () => {
    expect(wordCutBounds({ start: 1, end: 1.5 })).toEqual({ start: 0.97, end: 1.5 });
    expect(wordCutBounds({ start: 0, end: 0 })).toEqual({ start: 0, end: 0 });
    expect(wordCutBounds({ start: 0.01, end: 0.2 }).start).toBe(0);
  });

  it("takes a sentence without a page for page 1 and nothing for a page that has no sentence", () => {
    const list = [sentence(0, 1), sentence(1, 2, [], { page: 2 }), sentence(2, 3, [], { page: 1 })];
    expect(sentencesOfPage(list, 1)).toHaveLength(2);
    expect(sentencesOfPage(list, 2)).toHaveLength(1);
    expect(sentencesOfPage(list, 3)).toHaveLength(0);
    expect(sentencesOfPage(list, 0)).toHaveLength(0);
    expect(sentencesOfPage([], 1)).toEqual([]);
  });

  it("maps no word for an empty side and keeps both maps in order for a mismatch", () => {
    expect(buildWordMaps([], [])).toEqual({ audioToDisplay: [], displayToAudio: [] });
    expect(buildWordMaps(["a", "b"], []).displayToAudio).toEqual([-1, -1]);
    expect(buildWordMaps([], ["a"]).audioToDisplay).toEqual([-1]);
    expect(buildWordMaps(["a"], ["...", "—"])).toEqual({ audioToDisplay: [-1, -1], displayToAudio: [-1] });
    const mismatch = buildWordMaps(["cat", "sat"], ["dog", "ran", "far"]);
    for (const map of [mismatch.audioToDisplay, mismatch.displayToAudio]) {
      for (let index = 1; index < map.length; index += 1) expect(map[index]).toBeGreaterThanOrEqual(map[index - 1]);
    }
  });

  it("splits empty text and punctuation-only text into no word", () => {
    expect(splitDisplayWords("")).toEqual({ words: [], tail: "" });
    expect(splitDisplayWords("...?!")).toEqual({ words: [], tail: "...?!" });
  });
});
