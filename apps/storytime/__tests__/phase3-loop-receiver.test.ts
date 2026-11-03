// @vitest-environment node
// AC-13.4 and the receipt rows of AC-13.1 of the Phase 3 test strategy (plan task 3.8).
// The tests build a fake Workbooks repository and a fake repository root in the system temp
// folder. They never write to the real content folder.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import * as contract from "../lib/contracts/week";
import * as receiver from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shippedDirectory = resolve(app, "content", "l2");
const WEEK_FILES = readdirSync(shippedDirectory)
  .filter((name) => /^w\d\d\.json$/.test(name))
  .sort();

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

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

const work = mkdtempSync(join(tmpdir(), "loop-receiver-"));
const source = join(work, "workbooks");
let baseCommit = "";

afterAll(() => rmSync(work, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

/**
 * Runs git in the fake Workbooks repository.
 * @param args The git arguments.
 * @returns The stdout.
 */
function git(...args: string[]): string {
  return execFileSync("git", ["-C", source, ...args], { encoding: "utf8" });
}

/**
 * Reads a shipped week text.
 * @param file The file name.
 * @returns The text.
 */
function shippedText(file: string): string {
  return readFileSync(resolve(shippedDirectory, file), "utf8");
}

/**
 * Writes the files of a fake Workbooks commit.
 * @param edits Replacement texts by file name; every other week keeps its shipped text.
 * @returns The full commit id.
 */
function commitWeeks(edits: Record<string, string> = {}): string {
  mkdirSync(join(source, "content/storytime/l2"), { recursive: true });
  for (const file of WEEK_FILES) {
    writeFileSync(join(source, "content/storytime/l2", file), edits[file] ?? shippedText(file));
  }
  git("add", "-A");
  git("commit", "--quiet", "--allow-empty", "--message", "weeks");
  return git("rev-parse", "HEAD").trim();
}

/**
 * Makes an empty fake repository root with a content folder.
 * @param name The folder name.
 * @returns The root.
 */
function freshRoot(name: string): string {
  const root = join(work, name);
  mkdirSync(join(root, "apps/storytime/content"), { recursive: true });
  return root;
}

/**
 * Lists every file of a folder with its text.
 * @param directory The folder.
 * @returns A map of relative path to text.
 */
function snapshot(directory: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.set(path.slice(directory.length), readFileSync(path, "utf8"));
    }
  };
  if (existsSync(directory)) walk(directory);
  return files;
}

/**
 * Runs the receiving step quietly.
 * @param root The fake repository root.
 * @param args The command line.
 * @returns The exit code.
 */
function run(root: string, ...args: string[]): number {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return receiver.receiveMain(["--source", source, ...args], root);
}

/**
 * Gives a week with the loop fields of the A-42 pin.
 * @param clips The recordings of the drill word.
 * @param recallClip The recording of the recall card.
 * @returns The week.
 */
function loopWeek(clips: string[], recallClip: string): Json {
  const week = JSON.parse(shippedText("w01.json")) as Json;
  const step = week.scripts[0].steps[0];
  step.blendDrill = {
    words: [
      { word: "net", sounds: ["/n/", "/e/", "/t/"], audio: clips },
      { word: "nut", sounds: ["/n/", "/u/", "/t/"], audio: clips },
      { word: "pen", sounds: ["/p/", "/e/", "/n/"], audio: clips },
    ],
    model: { en: "Listen.", th: "ฟัง" },
    lead: { en: "Say it with me.", th: "พูดพร้อมครู" },
    test: { en: "Your turn.", th: "ตาเด็กพูด" },
    repeats: 3,
    correction: { en: "Listen again.", th: "ฟังอีกครั้ง" },
  };
  week.scripts[0].recall = {
    items: [
      { kind: "sound", text: "n", week: 1, audio: recallClip },
      { kind: "tricky", text: "a", week: 2 },
      { kind: "frame", text: "I see a", week: 1 },
      { kind: "word", text: "net", week: 1 },
      { kind: "sound", text: "t", week: 3, audio: "phonemes/daniel/02-t.mp3" },
    ],
    ask: { en: "Show the five cards.", th: "ชูบัตรห้าใบ" },
  };
  return week;
}

/**
 * Gives the text of a week file.
 * @param week The week.
 * @returns The text of the file.
 */
function weekText(week: Json): string {
  return `${JSON.stringify(week, null, 2)}\n`;
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", source]);
  git("config", "user.email", "maker@example.invalid");
  git("config", "user.name", "Maker");
  baseCommit = commitWeeks();
});

describe("AC-13.4 the clip pattern of the phoneme bank", () => {
  it("is one constant next to the media path rule", () => {
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").source).toBe("^phonemes/daniel/[0-9]{2}-[a-z]+(-[a-z]+)*\\.mp3$");
  });

  it("accepts the two names of the bank and refuses the other forms", () => {
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").test("phonemes/daniel/04-n.mp3")).toBe(true);
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").test("phonemes/daniel/26-a-short.mp3")).toBe(true);
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").test("../x.mp3")).toBe(false);
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").test("phonemes/daniel/4-n.mp3")).toBe(false);
    expect(exportOf<RegExp>("PHONEME_CLIP_PATTERN").test("phonemes/daniel/04-N.mp3")).toBe(false);
  });

  it("lists every drill clip and every recall clip as a phoneme of the bank", () => {
    const week = loopWeek(
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "phonemes/daniel/04-n.mp3",
    );
    const media = receiver.mediaOf(week);
    const clips = media.filter((item) => item.file.startsWith("phonemes/daniel/"));
    expect(clips.length, "The media list must hold the drill and recall clips (A4)").toBeGreaterThan(0);
    for (const clip of clips) {
      expect(clip.kind, `The clip ${clip.file} has another kind`).toBe("phoneme");
      expect(clip.rule, `The clip ${clip.file} has another rule`).toBe(exportOf<Record<string, string>>("MEDIA_RULES").phoneme);
    }
    expect(
      clips.some((clip) => clip.file === "phonemes/daniel/04-n.mp3"),
      "The media list misses the drill clip",
    ).toBe(true);
  });

  it("fails the receiver run on a clip outside the bank", () => {
    const root = freshRoot("bad-clip");
    const week = loopWeek(
      ["l2/media/w01/other.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "phonemes/daniel/04-n.mp3",
    );
    const commit = commitWeeks({ "w01.json": weekText(week) });
    expect(run(root, "--commit", commit)).toBe(1);
    expect(snapshot(join(root, "apps/storytime/content")).size, "The run wrote a file").toBe(0);
  });

  it("fails the receiver run on a recall clip outside the bank", () => {
    const root = freshRoot("bad-recall-clip");
    const week = loopWeek(
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "l2/media/w01/other.mp3",
    );
    const commit = commitWeeks({ "w01.json": weekText(week) });
    expect(run(root, "--commit", commit)).toBe(1);
    expect(snapshot(join(root, "apps/storytime/content")).size, "The run wrote a file").toBe(0);
  });
});

describe("AC-13.1 the receipt at the pin", () => {
  it("writes every week and keeps the source bytes", () => {
    const root = freshRoot("receipt");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const content = join(root, "apps/storytime/content");
    for (const file of WEEK_FILES) {
      const written = readFileSync(join(content, "l2", file), "utf8");
      expect(written, `The written ${file} differs from the source bytes`).toBe(shippedText(file));
    }
  });

  it("never changes the status or the approval of a week", () => {
    const root = freshRoot("receipt-approval");
    const week = loopWeek(
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "phonemes/daniel/04-n.mp3",
    );
    week.approval = { ...(week.approval ?? {}), loops: { status: "draft" } };
    const commit = commitWeeks({ "w01.json": weekText(week) });
    expect(run(root, "--commit", commit)).toBe(0);
    const written = JSON.parse(
      readFileSync(join(root, "apps/storytime/content", "l2", "w01.json"), "utf8"),
    ) as Json;
    expect(written.meta.status, "The receiver changed the status of the week").toBe(
      week.meta.status,
    );
    expect(written.approval.loops.status, "The receiver changed the approval of the week").toBe(
      "draft",
    );
  });

  it("makes no difference on a second run at the same commit", () => {
    const root = freshRoot("receipt-idempotent");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const content = join(root, "apps/storytime/content");
    const before = snapshot(content);
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const after = snapshot(content);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  });

  it("keeps a draft week with a recall of four cards", () => {
    const root = freshRoot("receipt-draft-recall");
    const week = loopWeek(
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "phonemes/daniel/04-n.mp3",
    );
    week.approval = { ...(week.approval ?? {}), loops: { status: "draft" } };
    week.scripts[0].recall.items = (week.scripts[0].recall.items as Json[]).slice(0, 4);
    const commit = commitWeeks({ "w01.json": weekText(week) });
    expect(run(root, "--commit", commit)).toBe(0);
    expect(
      existsSync(join(root, "apps/storytime/content", "l2", "w01.json")),
      "The run wrote no week",
    ).toBe(true);
  });

  it("keeps a draft week with a question page beyond the book", () => {
    const root = freshRoot("receipt-draft-question");
    const week = loopWeek(
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
      "phonemes/daniel/04-n.mp3",
    );
    week.approval = { ...(week.approval ?? {}), loops: { status: "draft" } };
    week.books[0].questions = [
      { kind: "who", ask: { en: "Who?", th: "ใคร?" }, answer: { page: 99, word: "teacher" } },
      { kind: "what", ask: { en: "What?", th: "อะไร?" }, answer: { page: 1, word: "Pat" } },
      { kind: "where", ask: { en: "Where?", th: "ที่ไหน?" }, answer: { page: 2, word: "May" } },
    ];
    const commit = commitWeeks({ "w01.json": weekText(week) });
    expect(run(root, "--commit", commit)).toBe(0);
  });

  it("names the weeks of the record and the media count", () => {
    const root = freshRoot("receipt-record");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(receiver.receiveMain(["--source", source, "--commit", baseCommit], root)).toBe(0);
    const text = log.mock.calls.map((call) => String(call[0])).join("\n");
    expect(text, "The run names no week").toContain("apps/storytime/content/l2/w01.json");
    expect(text, "The run names no media count").toMatch(/media files/);
  });
});
