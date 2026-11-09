// @vitest-environment node
/**
 * The release receipt of the at-home release (plan task 1.3, strategy P1.1, cases R1 to R5).
 *
 * The file reads the shipped source record and the shipped week files of the app. The loader of
 * the app reads the shipped folder. No week fixture file sits under `__tests__`. A broken copy
 * is a deep clone of a shipped week with one change, made inside the test.
 *
 * The pin case fails at the old pin and passes at the release pin. The other cases hold at both
 * pins. Each broken copy case proves that the check of its case detects the change.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadWeek } from "../lib/content";
import { weekSchema } from "../lib/contracts/week";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");

/** The pin of the at-home release of 2026-11-20, after the r3 take of 2026-11-09 (task 3.2). */
const RELEASE_PIN = "953f798ea309cc10abd5538c202e05ff31a2320d";

/** The eight week files that the source record lists, in the order of the week. */
const EXPECTED_FILES = [
  "apps/storytime/content/l2/w01.json",
  "apps/storytime/content/l2/w02.json",
  "apps/storytime/content/l2/w03.json",
  "apps/storytime/content/l2/w04.json",
  "apps/storytime/content/l2/w05.json",
  "apps/storytime/content/l2/w06.json",
  "apps/storytime/content/l2/w07.json",
  "apps/storytime/content/l2/w08.json",
];

/** The weeks that the release holds, from 1 to 8. */
const RELEASE_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The source record of the content folder. */
interface SourceRecord {
  repository?: string;
  commit?: string;
  files?: string[];
  [key: string]: unknown;
}

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftSwitch = process.env.STORYTIME_SHOW_DRAFT_MEDIA;

beforeEach(() => {
  delete process.env.STORYTIME_CONTENT_DIR;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
});

afterEach(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftSwitch === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftSwitch;
});

/**
 * Reads the source record of the content folder.
 * @returns The parsed source record.
 */
function readSourceRecord(): SourceRecord {
  return JSON.parse(readFileSync(resolve(contentDirectory, "source.json"), "utf8")) as SourceRecord;
}

/**
 * Reads a shipped week file.
 * @param week The week of the level.
 * @returns The parsed week.
 */
function readShippedWeek(week: number): Json {
  const path = resolve(weekDirectory, `w${String(week).padStart(2, "0")}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

/**
 * Loads a shipped week with the loader of the app.
 * @param week The week of the level.
 * @returns The load result of the loader.
 */
async function loadShippedWeek(week: number): Promise<Awaited<ReturnType<typeof loadWeek>>> {
  process.env.STORYTIME_CONTENT_DIR = contentDirectory;
  return loadWeek(2, week);
}

/**
 * Reports whether a source record holds a full commit id.
 * @param record The source record.
 * @returns Whether the commit is a 40 digit lower case hex id.
 */
function holdsFullPin(record: SourceRecord): boolean {
  return typeof record.commit === "string" && /^[0-9a-f]{40}$/.test(record.commit);
}

/**
 * Lists the keys of a source record that name a hash.
 * @param record The source record.
 * @returns The names of the hash keys.
 */
function hashKeys(record: SourceRecord): string[] {
  return Object.keys(record).filter((key) => /hash|sha256|checksum|digest/i.test(key));
}

/**
 * Reports whether a file list holds the eight week files of the release.
 * @param files The file list of a source record.
 * @returns Whether the list holds the eight week files and nothing else.
 */
function listsTheEightWeeks(files: string[]): boolean {
  if (files.length !== EXPECTED_FILES.length) return false;
  const sorted = [...files].sort();
  return sorted.every((file, index) => file === EXPECTED_FILES[index]);
}

/**
 * Gives the field paths of the issues of a failed parse.
 * @param issues The issues of the parse.
 * @returns The joined field paths.
 */
function issuePaths(issues: ReadonlyArray<{ path: ReadonlyArray<string | number> }>): string {
  return issues.map((issue) => issue.path.join(".")).join(" | ");
}

describe("AC-1.5 the source record names the release pin", () => {
  it("records the release pin in the source record", () => {
    const record = readSourceRecord();
    expect(holdsFullPin(record), "The source record must hold a full commit id (A15)").toBe(true);
    expect(record.commit, "The source record names another pin").toBe(RELEASE_PIN);
  });

  it("rejects a source record that holds the short pin id", () => {
    expect(
      holdsFullPin({ commit: "82f88853" }),
      "The short pin id must fail the check of a full commit id",
    ).toBe(false);
    expect(
      holdsFullPin({ commit: RELEASE_PIN }),
      "The full pin id must pass the check of a full commit id",
    ).toBe(true);
  });
});

describe("AC-1.5 the source record lists the eight week files", () => {
  it("lists the eight week files of the release", () => {
    const record = readSourceRecord();
    const files = record.files ?? [];
    expect(files.length, "The file list of the source record is empty (A4)").toBeGreaterThan(0);
    expect(`weeks_listed=${files.length}`, "The source record must list eight week files").toBe(
      "weeks_listed=8",
    );
    expect(
      listsTheEightWeeks(files),
      "The source record must list the eight week files of the release",
    ).toBe(true);
  });

  it("rejects a file list that is short and a file list that names another week", () => {
    expect(
      listsTheEightWeeks(EXPECTED_FILES.slice(0, 7)),
      "A list of seven week files must fail the check of the eight week files",
    ).toBe(false);
    expect(
      listsTheEightWeeks([...EXPECTED_FILES, "apps/storytime/content/l2/w09.json"]),
      "A list that names w09.json must fail the check of the eight week files",
    ).toBe(false);
  });
});

describe("AC-1.2 the contract reads every shipped week of the release", () => {
  it("parses every shipped week and counts eight", async () => {
    const results = [];
    for (const week of RELEASE_WEEKS) {
      const result = await loadShippedWeek(week);
      expect(result.kind, `The shipped week ${week} must parse`).toBe("ok");
      results.push(result);
    }
    const parsed = results.filter((result) => result.kind === "ok").length;
    expect(parsed, "The loader must parse at least one shipped week (A4)").toBeGreaterThan(0);
    expect(`weeks_parsed=${parsed}`, "The loader must parse the eight shipped weeks").toBe(
      "weeks_parsed=8",
    );
  });

  it("rejects a clone whose status is not a value of the contract", () => {
    const clone = structuredClone(readShippedWeek(2));
    clone.meta.status = "approved";
    const result = weekSchema.safeParse(clone);
    expect(result.success, "The contract must reject a week with the status approved").toBe(false);
    const paths = result.success ? [] : issuePaths(result.error.issues);
    expect(paths, "The failure must name the field meta.status").toContain("meta.status");
  });
});

describe("AC-1.5 the source record holds no hash", () => {
  it("holds no hash key in the source record", () => {
    const record = readSourceRecord();
    expect(hashKeys(record), "The source record holds a hash key (A15)").toEqual([]);
  });

  it("names the hash key of a record that holds one", () => {
    const record = { commit: RELEASE_PIN, sha256: "0".repeat(64) };
    expect(hashKeys(record).length, "The check must name the hash key of a record that holds one").toBe(
      1,
    );
  });
});

describe("AC-1.2 every shipped week names its level and its week", () => {
  it("gives every shipped week its own key and its own week number", () => {
    const weeks = RELEASE_WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    weeks.forEach((week, index) => {
      const number = index + 1;
      expect(week.meta.key, `The shipped week ${number} has the wrong key`).toBe(`st2/${number}`);
      expect(week.meta.week, `The shipped week ${number} has the wrong week number`).toBe(number);
    });
  });

  it("rejects a clone whose key names another week", () => {
    const clone = structuredClone(readShippedWeek(2));
    clone.meta.key = "st2/3";
    const result = weekSchema.safeParse(clone);
    expect(result.success, "The contract must reject a week with the key of another week").toBe(false);
    const paths = result.success ? [] : issuePaths(result.error.issues);
    expect(paths, "The failure must name the field meta.key").toContain("meta.key");
  });
});
