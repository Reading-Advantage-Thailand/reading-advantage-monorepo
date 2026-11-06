// @vitest-environment node
// Phase 2 adversarial guards, round 2. These tests pin the fixes for F22 to F27, F9, and F15.
// Every hostile week is a deep clone of a shipped week. Receiver runs use temporary repositories.
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

import { weekSchema } from "../lib/contracts/week";
import { mediaOf, receiveMain, receiveWeek, receiveWeeks } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content/l2");
const WEEK_FILES = readdirSync(weekDirectory).filter((name) => /^w\d\d\.json$/.test(name)).sort();

/** A week as plain JSON, for a hostile edit. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads a shipped week and clones it.
 * @param file The week file name.
 * @returns A clone that a test can change.
 */
function shipped(file: string): Json {
  return structuredClone(JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json);
}

/**
 * Reads a shipped week without cloning it.
 * @param file The week file name.
 * @returns The source text.
 */
function shippedText(file: string): string {
  return readFileSync(resolve(weekDirectory, file), "utf8");
}

/**
 * Returns the field paths that reject a week.
 * @param week The week to parse.
 * @returns The issue paths, or null when the week parses.
 */
function failPaths(week: unknown): string[] | null {
  const result = weekSchema.safeParse(week);
  return result.success ? null : result.error.issues.map((issue) => issue.path.join("."));
}

describe("r2 the media path allowlist closes the r1 probes", () => {
  const hostile = [
    "../x.png",
    "a/../../x.png",
    "/etc/passwd",
    "a\\b.png",
    "https://evil.example/x.png",
    "file:///etc/passwd",
    "data:text/plain;base64,AAAA",
    "//evil.example/x",
    "a\u0000b.png",
    "a\nb.png",
    "./x.png",
    ".",
    "a//b.png",
    "a/",
    "C:/x.png",
    "~/x.png",
    "%2e%2e/x.png",
    "..%2fx.png",
    "\uff0e\uff0e/x.png",
    "..\uff0fx.png",
    "..\u2215x.png",
    "a b.png",
    `${"a".repeat(201)}.png`,
    "a/".repeat(5000) + "a",
  ];

  it("rejects every hostile value with the field path", () => {
    for (const value of hostile) {
      const week = shipped("w02.json");
      week.books[0].audio.file = value;
      expect(failPaths(week), JSON.stringify(value.slice(0, 40))).toContain("books.0.audio.file");
    }
  });

  it("applies the same rule to each opening audio item", () => {
    for (const value of hostile) {
      const week = shipped("w02.json");
      week.opening.audio[0] = [value];
      expect(failPaths(week), JSON.stringify(value.slice(0, 40))).toContain("opening.audio.0.0");
    }
  });

  it("accepts a normal name at the 200-character boundary", () => {
    const week = shipped("w02.json");
    week.books[0].audio.file = "a".repeat(200);
    expect(failPaths(week)).toBeNull();
    week.books[0].audio.file = "l2/media/w02/books/1-tap.v2_final.mp3";
    expect(failPaths(week)).toBeNull();
  });
});

describe("r2 the key and the requested week agree", () => {
  it("rejects a key that names another level or week", () => {
    for (const key of ["st2/1", "st4/9", "st3/2", "st2/02"]) {
      const week = shipped("w02.json");
      week.meta.key = key;
      expect(failPaths(week), key).toContain("meta.key");
    }
  });

  it("rejects a week whose meta names another target", () => {
    const week = shipped("w03.json");
    week.meta.week = 1;
    week.meta.key = "st2/1";
    expect(() => receiveWeek(week, { expected: { level: 2, week: 3 } })).toThrow(/requested week/);
  });

  it("rejects two source files with one target", () => {
    const text = shippedText("w03.json");
    expect(() => receiveWeeks([
      { level: 2, week: 3, source: "one", text },
      { level: 2, week: 3, source: "two", text },
    ])).toThrow(/same target/);
  });
});

describe("r2 the timing rules protect a published week without rejecting shipped drafts", () => {
  it("parses every shipped week", () => {
    for (const file of WEEK_FILES) expect(failPaths(shipped(file)), file).toBeNull();
  });

  it("rejects non-finite times in a draft and a published week", () => {
    for (const file of ["w01.json", "w02.json"]) {
      for (const value of [Infinity, -Infinity, NaN]) {
        const week = shipped(file);
        week.books[0].audio.sentences[0].startTime = value;
        expect(failPaths(week), `${file} ${String(value)}`).toContain("books.0.audio.sentences.0.startTime");
      }
    }
  });

  it("rejects a published sentence out of order and a page beyond the book", () => {
    const order = shipped("w01.json");
    const sentences = order.books[0].audio.sentences;
    [sentences[0], sentences[1]] = [sentences[1], sentences[0]];
    expect(failPaths(order)).toContain("books.0.audio.sentences.1.startTime");
    const page = shipped("w01.json");
    page.books[0].audio.sentences[0].page = page.books[0].pages.length + 1;
    expect(failPaths(page)).toContain("books.0.audio.sentences.0.page");
  });

  it("rejects a published word outside its sentence", () => {
    const early = shipped("w01.json");
    const first = early.books[0].audio.sentences[0];
    first.words[0].start = first.startTime - 1;
    expect(failPaths(early)).toContain("books.0.audio.sentences.0.words.0.start");
    const late = shipped("w01.json");
    const target = late.books[0].audio.sentences[0];
    target.words[0].end = target.endTime + 5;
    expect(failPaths(late)).toContain("books.0.audio.sentences.0.words.0.end");
  });
});

describe("r2 the media list keeps every picture entry distinct", () => {
  it("lists a missing cover, family word, and song line", () => {
    const week = shipped("w02.json");
    week.books[0].cover = { prompt: "cover" };
    week.focus.family = { max: 8, words: [{ word: "tap", image: { prompt: "family" } }] };
    week.song = {
      title: "song",
      lines: [{ text: "line", part: "verse", gesture: "wave", image: { prompt: "song" } }],
    };
    const media = mediaOf(weekSchema.parse(week));
    // The release pin ships covers for w02, so the search names the missing entry and not the
    // first shipped cover.
    expect(media.find((item) => item.kind === "book-cover" && item.missing)?.missing).toMatch(/cover/);
    expect(media.find((item) => item.kind === "family-word-picture" && item.missing)?.missing).toMatch(/tap/);
    expect(media.find((item) => item.kind === "song-line-picture" && item.missing)?.missing).toMatch(/song line 1/);
  });

  it("lists the same pictures with files as normal media", () => {
    const week = shipped("w02.json");
    week.books[0].cover = { file: "covers/present.png" };
    week.focus.family = { max: 8, words: [{ word: "tap", image: { file: "words/tap.png" } }] };
    week.song = {
      title: "song",
      lines: [{ text: "line", part: "verse", gesture: "wave", image: { file: "song/line.png" } }],
    };
    const media = mediaOf(weekSchema.parse(week));
    for (const file of ["covers/present.png", "words/tap.png", "song/line.png"]) {
      const item = media.find((entry) => entry.file === file);
      expect(item, file).toBeDefined();
      expect(item?.missing, file).toBeUndefined();
    }
  });

  it("keeps a missing page when a file has the name of its field path", () => {
    const week = shipped("w01.json");
    week.books[0].cover = { file: "books.0.pages.0.image" };
    week.books[0].pages[0].image = { prompt: "missing" };
    const same = mediaOf(weekSchema.parse(week)).filter((item) => item.file === "books.0.pages.0.image");
    expect(same).toHaveLength(2);
    expect(same.find((item) => item.missing)?.kind).toBe("book-page-picture");
    expect(same.find((item) => !item.missing)?.kind).toBe("book-cover");
  });
});

const work = mkdtempSync(join(tmpdir(), "adversarial-r2-"));
const source = join(work, "workbooks");
let baseCommit = "";
let commitSequence = 0;

afterAll(() => rmSync(work, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

/**
 * Runs git in the fake Workbooks repository.
 * @param args The git arguments.
 * @returns The stdout.
 */
function git(...args: string[]): string {
  return execFileSync("git", ["-C", source, ...args], { encoding: "utf8" }).trim();
}

/**
 * Commits the shipped weeks with optional hostile replacements.
 * @param edits Replacement source text by week file name.
 * @returns The full commit id.
 */
function commitWeeks(edits: Record<string, string> = {}): string {
  mkdirSync(join(source, "content/storytime/l2"), { recursive: true });
  for (const file of WEEK_FILES) {
    writeFileSync(join(source, "content/storytime/l2", file), edits[file] ?? shippedText(file));
  }
  git("add", "-A");
  git("commit", "--quiet", "--allow-empty", "--message", `weeks ${commitSequence++}`);
  return git("rev-parse", "HEAD");
}

/**
 * Makes a temporary target root.
 * @param name The folder name.
 * @returns The root path.
 */
function freshRoot(name: string): string {
  const root = join(work, name);
  mkdirSync(join(root, "apps/storytime/content"), { recursive: true });
  return root;
}

/**
 * Runs the receiver against a temporary root.
 * @param root The target root.
 * @param commit The source commit.
 * @param extra Extra command-line arguments.
 * @returns The exit code.
 */
function run(root: string, commit: string, ...extra: string[]): number {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return receiveMain(["--source", source, "--commit", commit, ...extra], root);
}

/**
 * Lists every content file and its text.
 * @param root The target root.
 * @returns The files by relative path.
 */
function snapshot(root: string): Map<string, string> {
  const directory = join(root, "apps/storytime/content");
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
 * Asserts that a run changed no content file.
 * @param before The files before the run.
 * @param after The files after the run.
 */
function expectUnchanged(before: Map<string, string>, after: Map<string, string>): void {
  expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
  for (const [path, text] of before) expect(after.get(path), path).toBe(text);
}

/**
 * Changes one shipped week and returns its source text.
 * @param file The week file name.
 * @param edit The hostile edit.
 * @returns The edited source text.
 */
function hostileText(file: string, edit: (week: Json) => void): string {
  const week = shipped(file);
  edit(week);
  return `${JSON.stringify(week, null, 2)}\n`;
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", source]);
  git("config", "user.email", "adversarial@example.invalid");
  git("config", "user.name", "Adversarial");
  baseCommit = commitWeeks();
});

describe("r2 a rejected receiver run changes nothing", () => {
  it("keeps the published week when another source file names its target", () => {
    const root = freshRoot("hostile-meta");
    expect(run(root, baseCommit)).toBe(0);
    const before = snapshot(root);
    const hostile = commitWeeks({
      "w03.json": hostileText("w03.json", (week) => {
        week.meta.week = 1;
        week.meta.key = "st2/1";
        week.meta.status = "draft";
      }),
    });
    expect(run(root, hostile)).toBe(1);
    expectUnchanged(before, snapshot(root));
    expect(JSON.parse(snapshot(root).get("/l2/w01.json")!).meta.status).toBe("published");
  });

  it("writes nothing when week five of eight breaks the contract", () => {
    const root = freshRoot("bad-week-five");
    expect(run(root, baseCommit)).toBe(0);
    const before = snapshot(root);
    const broken = commitWeeks({ "w05.json": hostileText("w05.json", (week) => { week.version = 2; }) });
    expect(run(root, broken)).toBe(1);
    expectUnchanged(before, snapshot(root));
  });

  it("writes nothing for a mismatched key or hostile opening audio", () => {
    const root = freshRoot("hostile-contract");
    expect(run(root, baseCommit)).toBe(0);
    const before = snapshot(root);
    const badKey = commitWeeks({ "w06.json": hostileText("w06.json", (week) => { week.meta.key = "st4/9"; }) });
    expect(run(root, badKey)).toBe(1);
    expectUnchanged(before, snapshot(root));
    const badOpening = commitWeeks({
      "w02.json": hostileText("w02.json", (week) => {
        week.opening.audio = [["../../../etc/passwd", "a\u0000b"], [], [], [], []];
      }),
    });
    expect(run(root, badOpening)).toBe(1);
    expectUnchanged(before, snapshot(root));
  });

  it("refuses a subset at a new commit but merges a subset at the recorded commit", () => {
    const root = freshRoot("subset-rules");
    expect(run(root, baseCommit)).toBe(0);
    const before = snapshot(root);
    const next = commitWeeks();
    expect(run(root, next, "--weeks", "5")).toBe(64);
    expectUnchanged(before, snapshot(root));
    expect(run(root, baseCommit, "--weeks", "5")).toBe(0);
    expectUnchanged(before, snapshot(root));
  });

  it("moves the source record after a full run at a new commit", () => {
    const root = freshRoot("full-new-commit");
    expect(run(root, baseCommit)).toBe(0);
    const next = commitWeeks({ "w02.json": hostileText("w02.json", (week) => { week.meta.title = "new title"; }) });
    expect(run(root, next)).toBe(0);
    const record = JSON.parse(snapshot(root).get("/source.json")!);
    expect(record.commit).toBe(next);
    expect(record.files).toHaveLength(WEEK_FILES.length);
    expect(JSON.parse(snapshot(root).get("/l2/w02.json")!).meta.title).toBe("new title");
  });

  it("rejects bad week tokens and a dead commit before any write", () => {
    const root = freshRoot("bad-command");
    expect(run(root, baseCommit)).toBe(0);
    const before = snapshot(root);
    for (const weeks of ["1-8,abc", "abc", "1,,3", "0", "33", "3-1", "1-99999999999", "-1", "1.5"]) {
      expect(run(root, baseCommit, "--weeks", weeks), weeks).toBe(64);
      expectUnchanged(before, snapshot(root));
    }
    expect(run(root, "deadbeef")).toBe(64);
    expectUnchanged(before, snapshot(root));
  });
});
