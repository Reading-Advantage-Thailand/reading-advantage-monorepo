/**
 * Task 3.1: the week content r3 import test (AC-3.1 to AC-3.5; test strategy P3.1 and P3.2).
 *
 * The test reads the seven shipped week files of the app content folder and the real week
 * contract. It proves five properties of the import: the seven files parse; every word clip key
 * is in the K2 form; every clip path is safe for its own week; the distinct key counts are
 * 22, 23, 20, 24, 28, 22, 24 with a total of 163; and w01 holds a video lead-in of 3 while w02 to
 * w07 stay audio-only with a parsed lead-in of 0.
 *
 * The test reads repository files only. Every path it reads sits under the app content folder.
 * The phase detector of P3.4 checks the file text, and the test adds no value from a source
 * package folder.
 *
 * At the base the shipped files hold no `wordClips`: R2 and R3 fail on their count guards, R4
 * fails on the total, and R5a fails on w01. R1, R5b, R6, and R7 pass as characterization.
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/** The app folder of Storytime. */
const app = resolve(import.meta.dirname, "..");

/** The folder that holds the week files. */
const contentDir = resolve(app, "content/l2");

/** The seven week files of the import. */
const WEEK_FILES = ["w01.json", "w02.json", "w03.json", "w04.json", "w05.json", "w06.json", "w07.json"] as const;

/** One week file name. */
type WeekFile = (typeof WEEK_FILES)[number];

/** The per-week distinct clip key counts of the import (test strategy M43). */
const WEEK_KEY_COUNTS = [22, 23, 20, 24, 28, 22, 24] as const;

/** The distinct clip keys of the seven weeks (test strategy M43). */
const KEY_COUNT_TOTAL = 163;

/** The K2 key rule of the import; a hyphen is not allowed. */
const K2_KEY_PATTERN = /^[a-z]+('[a-z]+)*$/;

/** The lowest accepted number of broken copies in the self-test. */
const MIN_MUTANTS = 13;

/** A raw week, as JSON before the contract applies its defaults. */
type RawWeek = { song?: Record<string, unknown> };

/** One broken copy that a rule must reject. */
interface Mutant {
  /** The label of the copy. */
  id: string;
  /** What is wrong with the copy. */
  note: string;
  /** The rule under test. */
  kind: "key" | "path";
  /** The copy value. */
  value: string;
}

/**
 * Reads one week file as text.
 * @param file The file name under the app content folder.
 * @returns The file text.
 */
function readWeekText(file: WeekFile): string {
  const path = resolve(contentDir, file);
  expect(existsSync(path), `Missing apps/storytime/content/l2/${file}`).toBe(true);
  return readFileSync(path, "utf8");
}

/**
 * Reads one week file and parses it with the week contract.
 * @param file The file name under the app content folder.
 * @returns The parsed week.
 */
function parseWeek(file: WeekFile): StorytimeWeek {
  return weekSchema.parse(JSON.parse(readWeekText(file)));
}

/**
 * Parses the seven week files.
 * @returns The seven parsed weeks, in file order.
 */
function parseWeeks(): StorytimeWeek[] {
  return WEEK_FILES.map((file) => parseWeek(file));
}

/**
 * Reads one week file as raw JSON, before the contract applies its defaults.
 * @param file The file name under the app content folder.
 * @returns The raw week object.
 */
function rawWeek(file: WeekFile): RawWeek {
  return JSON.parse(readWeekText(file)) as RawWeek;
}

/**
 * Makes the K2 form of a clip key: NFC, the curly apostrophes to a straight one, lower case, and
 * the outer characters other than `a-z` and the apostrophe removed.
 * @param key The key to normalize.
 * @returns The K2 form of the key.
 */
function k2Key(key: string): string {
  return key
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .toLowerCase()
    .replace(/^[^a-z']+|[^a-z']+$/g, "");
}

/**
 * Reports whether a clip path has the safe form of its own week.
 * @param path The path, relative to the content folder.
 * @param week The 1-based week number.
 * @returns Whether the path holds no `..`, no leading slash, no backslash, the week media root,
 * and the `.mp3` extension.
 */
function safeClipPath(path: string, week: number): boolean {
  if (path.length === 0) return false;
  if (path.startsWith("/")) return false;
  if (path.includes("\\")) return false;
  if (!path.endsWith(".mp3")) return false;
  if (path.split("/").includes("..")) return false;
  const root = `l2/media/w${String(week).padStart(2, "0")}/`;
  return path.startsWith(root);
}

/**
 * Collects the word clip keys of one week across its books.
 * @param week The parsed week.
 * @returns The keys, in book order.
 */
function collectKeys(week: StorytimeWeek): string[] {
  return week.books.flatMap((book) => Object.keys(book.audio.wordClips));
}

/**
 * Collects the word clip paths of one week with their week number.
 * @param week The parsed week.
 * @param number The 1-based week number.
 * @returns Each path with its week.
 */
function collectPaths(week: StorytimeWeek, number: number): Array<{ path: string; week: number }> {
  return week.books.flatMap((book) =>
    Object.values(book.audio.wordClips).map((path) => ({ path, week: number })),
  );
}

/**
 * Counts the distinct clip keys of one week.
 * @param week The parsed week.
 * @returns The number of distinct keys.
 */
function distinctKeyCount(week: StorytimeWeek): number {
  return new Set(collectKeys(week)).size;
}

/**
 * Requires a labeled count to be a positive integer, so an empty list fails before a loop.
 * @param label The label of the count.
 * @param value The count.
 */
function expectPositive(label: string, value: number): void {
  expect(`${label}=${value}`).toMatch(new RegExp(`^${label}=[1-9][0-9]*$`));
  expect(value, `${label} must be above 0`).toBeGreaterThan(0);
}

describe("Phase 3 week content r3 import (task 3.1)", () => {
  it("R1 parses the seven week files with the week contract", () => {
    const weeks = parseWeeks();
    expect(WEEK_FILES.length, "the import covers seven week files").toBe(7);
    expect(`week_files=${weeks.length}`).toBe("week_files=7");
  });

  it("R2 holds every word clip key in K2 form", () => {
    const keys = parseWeeks().flatMap(collectKeys);
    expectPositive("clip_keys_checked", keys.length);
    for (const key of keys) {
      expect(k2Key(key), `the key ${JSON.stringify(key)} must be in K2 form`).toBe(key);
      expect(K2_KEY_PATTERN.test(key), `the key ${JSON.stringify(key)} must match the K2 rule`).toBe(true);
    }
  });

  it("R3 holds every word clip path in the safe form of its own week", () => {
    const paths = parseWeeks().flatMap((week, index) => collectPaths(week, index + 1));
    expectPositive("clip_paths_checked", paths.length);
    for (const entry of paths) {
      expect(
        safeClipPath(entry.path, entry.week),
        `the clip path ${JSON.stringify(entry.path)} must be safe for week ${entry.week}`,
      ).toBe(true);
    }
  });

  it("R4 holds the per-week distinct clip key counts of the import", () => {
    const counts = parseWeeks().map(distinctKeyCount);
    const total = counts.reduce((sum, count) => sum + count, 0);
    expect(total, `the seven weeks hold ${total} distinct clip keys, expected ${KEY_COUNT_TOTAL}`).toBe(
      KEY_COUNT_TOTAL,
    );
    expect(`clip_keys_total=${total}`).toBe(`clip_keys_total=${KEY_COUNT_TOTAL}`);
    counts.forEach((count, index) => {
      expect(
        count,
        `w0${index + 1} holds ${count} distinct clip keys, expected ${WEEK_KEY_COUNTS[index]}`,
      ).toBe(WEEK_KEY_COUNTS[index]);
    });
  });

  it("R5a gives w01 a video lead-in of 3 in the raw JSON", () => {
    const lead = rawWeek("w01.json").song?.videoLeadInSeconds;
    expect(
      lead,
      lead === undefined
        ? "w01 song.videoLeadInSeconds is absent in the raw JSON, expected 3"
        : `w01 song.videoLeadInSeconds is ${String(lead)}, expected 3`,
    ).toBe(3);
  });

  it("R5b keeps w02 to w07 audio-only with a parsed lead-in of 0", () => {
    const weeks = parseWeeks();
    for (let week = 2; week <= 7; week += 1) {
      const file = `w0${week}.json` as WeekFile;
      const label = `w0${week}`;
      const song = rawWeek(file).song ?? {};
      expect(
        Object.prototype.hasOwnProperty.call(song, "video"),
        `${label} song.video must be absent, and not an empty value`,
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(song, "videoLeadInSeconds"),
        `${label} song.videoLeadInSeconds must be absent, and not the value 0`,
      ).toBe(false);
      expect(weeks[week - 1].song?.videoLeadInSeconds, `${label} parsed videoLeadInSeconds must default to 0`).toBe(0);
    }
  });

  it("R6 rejects the broken copies of the K2 key rule and the path rule", () => {
    const mutants: Mutant[] = [
      { id: "K1", note: "a curly apostrophe U+2019", kind: "key", value: "don\u2019t" },
      { id: "K2", note: "a curly apostrophe U+2018", kind: "key", value: "don\u2018t" },
      { id: "K3", note: "an upper-case letter", kind: "key", value: "Don't" },
      { id: "K4", note: "a space inside the key", kind: "key", value: "don t" },
      { id: "K5", note: "a leading digit", kind: "key", value: "1don" },
      { id: "K6", note: "a trailing apostrophe", kind: "key", value: "don'" },
      { id: "K7", note: "two apostrophes in a row", kind: "key", value: "don''t" },
      { id: "K8", note: "a decomposed accent", kind: "key", value: "cafe\u0301" },
      { id: "P1", note: "a parent segment", kind: "path", value: "l2/media/w01/words/../wa-am.mp3" },
      { id: "P2", note: "a leading slash", kind: "path", value: "/l2/media/w01/words/wa-am.mp3" },
      { id: "P3", note: "a path of another week", kind: "path", value: "l2/media/w02/words/wa-am.mp3" },
      { id: "P4", note: "a text file", kind: "path", value: "l2/media/w01/words/wa-am.txt" },
      { id: "P5", note: "a backslash", kind: "path", value: "l2/media/w01/words\\wa-am.mp3" },
      { id: "P6", note: "an empty path", kind: "path", value: "" },
    ];
    expect(`mutants_checked=${mutants.length}`).toBe("mutants_checked=14");
    expect(mutants.length, `the self-test needs at least ${MIN_MUTANTS} broken copies`).toBeGreaterThanOrEqual(
      MIN_MUTANTS,
    );
    expect(k2Key("don't"), "the key don't must survive K2").toBe("don't");
    expect(K2_KEY_PATTERN.test("don't"), "the key don't must match the K2 rule").toBe(true);
    expect(safeClipPath("l2/media/w01/words/wa-am.mp3", 1), "the w01 clip path must be safe").toBe(true);
    let rejected = 0;
    for (const mutant of mutants) {
      const accepted =
        mutant.kind === "key"
          ? k2Key(mutant.value) === mutant.value && K2_KEY_PATTERN.test(mutant.value)
          : safeClipPath(mutant.value, 1);
      expect(accepted, `${mutant.id} (${mutant.note}) must be rejected`).toBe(false);
      rejected += 1;
    }
    expect(`mutants_rejected=${rejected}/${mutants.length}`).toBe(
      `mutants_rejected=${mutants.length}/${mutants.length}`,
    );
  });

  it("R7 reads repository files only", () => {
    expect(existsSync(contentDir), "the app content folder must exist").toBe(true);
    for (const file of WEEK_FILES) {
      const full = resolve(contentDir, file);
      const inside = relative(contentDir, full);
      expect(inside.startsWith("..") || isAbsolute(inside), `${file} must sit inside the content folder`).toBe(
        false,
      );
      expect(existsSync(full), `Missing apps/storytime/content/l2/${file}`).toBe(true);
    }
  });
});
