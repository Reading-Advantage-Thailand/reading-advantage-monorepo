// @vitest-environment node
// Finding F13 of the Phase 3 test strategy (plan task 3.8): the media list must cover every
// media path of a shipped week. The test reads the shipped week files and clones them.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as contract from "../lib/contracts/week";
import * as receiver from "../scripts/receive-weeks";

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

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** One media path of a week, with the field path that holds it. */
interface WeekMediaPath {
  path: string;
  file: string;
}

/**
 * The field paths that the media list does not hold, each with its reason.
 *
 * The print part holds the files of the printed book, and the benchmark holds the files of the
 * one-to-one sitting. The app serves neither. Each entry names a field path of the week, and a
 * `*` stands for one list index.
 */
const ALLOWED_MEDIA_PATHS: Array<{ path: string; reason: string }> = [
  { path: "print", reason: "print" },
  { path: "benchmark.oneToOne.soundAudio.*", reason: "benchmark" },
  { path: "benchmark.oneToOne.blend.*.audio.*", reason: "benchmark" },
];

/**
 * Reads an export of the receiving script.
 *
 * The test reads the export by name, so a missing export fails with a clear message and not
 * with a load error.
 * @param name The name of the export.
 * @returns The export.
 */
function exportOf<T>(name: string): T {
  const value = (receiver as unknown as Record<string, unknown>)[name];
  expect(value, `The receiving script has no export ${name}`).toBeDefined();
  return value as T;
}

/**
 * Reads a shipped week file and parses it with the contract.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): Json {
  const source = JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json;
  const parsed = contract.weekSchema.safeParse(source);
  expect(
    parsed.success,
    `The contract rejects the shipped ${file}: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
  ).toBe(true);
  return (parsed.success ? parsed.data : source) as Json;
}

/**
 * Tells whether a field path sits under an allowed path.
 *
 * A `*` in the allowed path stands for one list index. A path that starts with the allowed path
 * and a dot sits under it.
 * @param path The field path of a media path.
 * @param allowed The allowed field path.
 * @returns Whether the path is allowed.
 */
function isAllowed(path: string, allowed: string): boolean {
  if (path === allowed) return true;
  if (path.startsWith(`${allowed}.`)) return true;
  const allowedParts = allowed.split(".");
  const pathParts = path.split(".");
  if (allowedParts.length > pathParts.length) return false;
  return allowedParts.every((part, index) => part === "*" || part === pathParts[index]);
}

/**
 * Lists the media paths of a week that the media list does not hold.
 * @param week The parsed week.
 * @returns The field path and the file of every uncovered media path.
 */
function uncoveredOf(week: Json): WeekMediaPath[] {
  const listed = new Set(receiver.mediaOf(week).map((item) => item.file));
  const paths = exportOf<(week: unknown) => WeekMediaPath[]>("mediaPathsOf")(week);
  return paths.filter(
    (entry) =>
      !listed.has(entry.file) &&
      !ALLOWED_MEDIA_PATHS.some((allowed) => isAllowed(entry.path, allowed.path)),
  );
}

describe("F13 the media list covers every media path of a shipped week", () => {
  it("covers every media path of every shipped week", () => {
    const weeks = WEEK_FILES.map((file) => readWeek(file));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    const uncovered: string[] = [];
    for (const week of weeks) {
      for (const entry of uncoveredOf(week)) {
        uncovered.push(`${entry.path} -> ${entry.file}`);
      }
    }
    expect(uncovered, `The media list misses a media path: ${uncovered.join(" | ")}`).toEqual([]);
  });

  it("finds the media paths of a shipped week", () => {
    const week = readWeek("w01.json");
    const paths = exportOf<(week: unknown) => WeekMediaPath[]>("mediaPathsOf")(week);
    expect(paths.length, "The scan must find the media paths of a shipped week (A4)").toBeGreaterThan(0);
    for (const entry of paths) {
      expect(entry.path, `The scan names no field path for ${entry.file}`).not.toBe("");
      expect(entry.file, `The scan names no file for ${entry.path}`).not.toBe("");
    }
  });

  it("fails a week with a media path that the media list does not hold", () => {
    const week = readWeek("w01.json");
    week.focus.element.extraAudio = "l2/media/w01/new-clip.mp3";
    const uncovered = uncoveredOf(week);
    expect(uncovered.length, "The coverage check misses a new media path").toBeGreaterThan(0);
    expect(
      uncovered.some((entry) => entry.path.includes("extraAudio")),
      `The coverage check names no field path: ${uncovered.map((entry) => entry.path).join(" | ")}`,
    ).toBe(true);
  });

  it("covers the clips of a new blend drill", () => {
    const week = readWeek("w01.json");
    week.scripts[0].steps[0].blendDrill = {
      words: [
        {
          word: "net",
          sounds: ["/n/", "/e/", "/t/"],
          audio: ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
        },
      ],
      model: { en: "Listen.", th: "ฟัง" },
      lead: { en: "Say it with me.", th: "พูดพร้อมครู" },
      test: { en: "Your turn.", th: "ตาเด็กพูด" },
      repeats: 3,
      correction: { en: "Listen again.", th: "ฟังอีกครั้ง" },
    };
    const uncovered = uncoveredOf(week);
    expect(uncovered.length, "The coverage check misses the clips of a new drill").toBe(0);
  });
});

describe("the allow list of the coverage check", () => {
  it("gives a reason for every allowed path", () => {
    expect(ALLOWED_MEDIA_PATHS.length, "The allow list must not be empty (A4)").toBeGreaterThan(0);
    for (const allowed of ALLOWED_MEDIA_PATHS) {
      expect(allowed.reason, `The allowed path ${allowed.path} has no reason`).not.toBe("");
      expect(["print", "benchmark"], `The allowed path ${allowed.path} has another reason`).toContain(
        allowed.reason,
      );
    }
  });

  it("names a field path of the week and not a word", () => {
    const top = new Set<string>();
    for (const file of WEEK_FILES) {
      for (const key of Object.keys(readWeek(file))) top.add(key);
    }
    expect(top.size, "The shipped weeks hold no field (A4)").toBeGreaterThan(0);
    for (const allowed of ALLOWED_MEDIA_PATHS) {
      const first = allowed.path.split(".")[0];
      expect([...top], `The allowed path ${allowed.path} names no field of the week`).toContain(first);
    }
  });
});
