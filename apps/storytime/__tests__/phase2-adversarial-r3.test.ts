// @vitest-environment node
// Phase 2 adversarial guards, round 3. These tests pin rollback, data preservation, timing, and CLI
// behavior. Faults use temporary folders. No test writes to the real content folder.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { weekSchema } from "../lib/contracts/week";
import {
  findLeftovers,
  receiveMain,
  RollbackIncompleteError,
  writeStaged,
} from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content/l2");
const WEEK_FILES = readdirSync(weekDirectory).filter((name) => /^w\d\d\.json$/.test(name)).sort();
const work = mkdtempSync(join(tmpdir(), "adversarial-r3-"));
const source = join(work, "workbooks");
let baseCommit = "";
let sequence = 0;

/** A week as plain JSON, for a hostile edit. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

afterAll(() => rmSync(work, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

/**
 * Reads a shipped week and clones it.
 * @param file The week file name.
 * @returns A clone that a test can change.
 */
function shipped(file: string): Json {
  return structuredClone(JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json);
}

/**
 * Reads a shipped week as source text.
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

/**
 * Captures an expected fault.
 * @param fn The operation that throws.
 * @returns The thrown error.
 */
function caught(fn: () => void): Error {
  try { fn(); } catch (error) { return error as Error; }
  throw new Error("The operation did not throw");
}

const stateNames = ["a.json", "b.json", "c.json", "d.json", "e.json"];

/**
 * Makes three user files and two new targets.
 * @param label The fixture folder name.
 * @returns The folder and staged entries.
 */
function stateFixture(label: string) {
  const folder = join(work, label);
  mkdirSync(folder, { recursive: true });
  for (const name of stateNames.slice(0, 3)) writeFileSync(join(folder, name), `user ${name}\n`);
  writeFileSync(join(folder, "foreign.txt"), "foreign\n");
  return {
    folder,
    entries: stateNames.map((name) => ({ path: join(folder, name), text: `new ${name}\n` })),
  };
}

/**
 * Reads the files immediately inside a folder.
 * @param folder The folder.
 * @returns The texts by file name.
 */
function flatSnapshot(folder: string): Map<string, string> {
  return new Map(readdirSync(folder).map((name) => [name, readFileSync(join(folder, name), "utf8")]));
}

/**
 * Asserts that a folder has the same files and bytes.
 * @param folder The folder.
 * @param before The expected snapshot.
 */
function expectFlatSame(folder: string, before: Map<string, string>): void {
  const after = flatSnapshot(folder);
  expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
  for (const [name, text] of before) expect(after.get(name), name).toBe(text);
}

describe("r3 staged writes restore user bytes after faults", () => {
  it("restores every fixture after a partial stage write at each position", () => {
    for (let position = 1; position <= stateNames.length; position++) {
      const { folder, entries } = stateFixture(`stage-${position}`);
      const before = flatSnapshot(folder);
      let calls = 0;
      expect(() => writeStaged(entries, {
        write: (path, data, flag) => {
          if (++calls === position) { writeFileSync(path, "half", { flag }); throw new Error("stage fault"); }
          writeFileSync(path, data, { flag });
        },
      }), `position ${position}`).toThrow("stage fault");
      expectFlatSame(folder, before);
    }
  });

  it("restores every fixture after a rename fault at each position", () => {
    for (let position = 1; position <= stateNames.length; position++) {
      const { folder, entries } = stateFixture(`rename-${position}`);
      const before = flatSnapshot(folder);
      let calls = 0;
      expect(() => writeStaged(entries, {
        rename: (from, to) => {
          if (++calls === position) throw new Error("rename fault");
          renameSync(from, to);
        },
      }), `position ${position}`).toThrow("rename fault");
      expectFlatSame(folder, before);
    }
  });

  it("tries two failed restores and keeps both original copies", () => {
    const { folder, entries } = stateFixture("double-restore");
    let renames = 0;
    const error = caught(() => writeStaged(entries, {
      rename: (from, to) => { if (++renames === 5) throw new Error("rename fault"); renameSync(from, to); },
      write: (path, data, flag) => {
        if (flag === "w" && [join(folder, "a.json"), join(folder, "c.json")].includes(path)) {
          throw new Error("restore fault");
        }
        writeFileSync(path, data, { flag });
      },
    }));
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    for (const name of ["a.json", "c.json"]) {
      const copy = readdirSync(folder).find((entry) => entry.startsWith(`${name}.orig-`));
      expect(copy, name).toBeDefined();
      expect(readFileSync(join(folder, copy!), "utf8"), name).toBe(`user ${name}\n`);
      expect(error.message, name).toContain(copy);
    }
    expect(readFileSync(join(folder, "b.json"), "utf8")).toBe("user b.json\n");
    expect(readFileSync(join(folder, "foreign.txt"), "utf8")).toBe("foreign\n");
  });

  it("keeps a foreign file that appears in a folder the run created", () => {
    const folder = join(work, "foreign-created");
    const target = join(folder, "l2/w01.json");
    const error = caught(() => writeStaged([{ path: target, text: "new\n" }], {
      rename: () => { writeFileSync(join(folder, "l2/user-notes.txt"), "keep\n"); throw new Error("rename fault"); },
    }));
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    expect(readFileSync(join(folder, "l2/user-notes.txt"), "utf8")).toBe("keep\n");
    expect(existsSync(target)).toBe(false);
  });

  it("keeps a foreign blocker when folder creation fails after an earlier stage", () => {
    const folder = join(work, "mkdir-fault");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "blocked"), "keep\n");
    expect(() => writeStaged([
      { path: join(folder, "first.json"), text: "first\n" },
      { path: join(folder, "blocked/second.json"), text: "second\n" },
    ])).toThrow();
    expect(readdirSync(folder)).toEqual(["blocked"]);
    expect(readFileSync(join(folder, "blocked"), "utf8")).toBe("keep\n");
  });
});

describe("r3 timing boundaries", () => {
  it("keeps every shipped week valid", () => {
    for (const file of WEEK_FILES) expect(failPaths(shipped(file)), file).toBeNull();
  });

  it("accepts equal word starts and a zero-length word", () => {
    const equal = shipped("w01.json");
    const sentence = equal.books[0].audio.sentences[0];
    sentence.words[1].start = sentence.words[0].start;
    expect(failPaths(equal)).toBeNull();
    const zero = shipped("w01.json");
    const word = zero.books[0].audio.sentences[0].words[0];
    word.end = word.start;
    expect(failPaths(zero)).toBeNull();
  });

  it("accepts a zero-length sentence and equal starts after it", () => {
    const zero = shipped("w01.json");
    const first = zero.books[0].audio.sentences[0];
    first.endTime = first.startTime;
    for (const word of first.words) { word.start = first.startTime; word.end = first.startTime; }
    expect(failPaths(zero)).toBeNull();
    const equal = shipped("w01.json");
    const [a, b] = equal.books[0].audio.sentences;
    a.startTime = b.startTime;
    a.endTime = b.startTime;
    for (const word of a.words) { word.start = a.startTime; word.end = a.startTime; }
    expect(failPaths(equal)).toBeNull();
  });

  it("rejects sentence overlap and out-of-order words beyond the slack", () => {
    const overlap = shipped("w01.json");
    const [a, b] = overlap.books[0].audio.sentences;
    b.startTime = a.endTime - 0.01;
    expect(failPaths(overlap)).toContain("books.0.audio.sentences.1.startTime");
    const order = shipped("w01.json");
    const words = order.books[0].audio.sentences[0].words;
    [words[0], words[1]] = [words[1], words[0]];
    expect(failPaths(order)).toContain("books.0.audio.sentences.0.words.1.start");
  });

  it("rejects a paginated book whose audio covers only page one", () => {
    const week = shipped("w01.json");
    for (const sentence of week.books[0].audio.sentences) sentence.page = 1;
    expect(failPaths(week)).toContain("books.0.audio.sentences");
  });
});

/**
 * Runs git in the fake Workbooks repository.
 * @param args The git arguments.
 * @returns The stdout.
 */
function git(...args: string[]): string {
  return execFileSync("git", ["-C", source, ...args], { encoding: "utf8" }).trim();
}

/**
 * Commits shipped weeks with optional replacements.
 * @param edits Replacement text by week file name.
 * @returns The full commit id.
 */
function commitWeeks(edits: Record<string, string> = {}): string {
  mkdirSync(join(source, "content/storytime/l2"), { recursive: true });
  for (const file of WEEK_FILES) {
    writeFileSync(join(source, "content/storytime/l2", file), edits[file] ?? shippedText(file));
  }
  git("add", "-A");
  git("commit", "--quiet", "--allow-empty", "--message", `weeks ${sequence++}`);
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
 * Runs the receiver quietly.
 * @param root The temporary target root.
 * @param args The receiver arguments after --source.
 * @returns The exit code.
 */
function run(root: string, ...args: string[]): number {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return receiveMain(["--source", source, ...args], root);
}

/**
 * Lists all content files recursively.
 * @param root The temporary target root.
 * @returns The texts by relative path.
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
 * Asserts that no content file changed.
 * @param before The snapshot before a run.
 * @param after The snapshot after a run.
 */
function expectUnchanged(before: Map<string, string>, after: Map<string, string>): void {
  expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
  for (const [path, text] of before) expect(after.get(path), path).toBe(text);
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", source]);
  git("config", "user.email", "adversarial@example.invalid");
  git("config", "user.name", "Adversarial");
  baseCommit = commitWeeks();
});

describe("r3 receiver failures preserve user data", () => {
  it("keeps an uncommitted week edit and the old record when writeStaged fails reading the originals before any replacement write", () => {
    const root = freshRoot("user-edit");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const content = join(root, "apps/storytime/content");
    writeFileSync(join(content, "l2/w01.json"), "USER UNCOMMITTED EDIT\n");
    rmSync(join(content, "l2/w05.json"));
    mkdirSync(join(content, "l2/w05.json"));
    writeFileSync(join(content, "l2/w05.json/keep.txt"), "foreign keep\n");
    const before = snapshot(root);
    const changed = shipped("w01.json");
    changed.meta.title = "new source title";
    const next = commitWeeks({ "w01.json": `${JSON.stringify(changed, null, 2)}\n` });
    expect(run(root, "--commit", next)).toBe(1);
    expectUnchanged(before, snapshot(root));
    expect(readFileSync(join(content, "l2/w01.json"), "utf8")).toBe("USER UNCOMMITTED EDIT\n");
    expect(findLeftovers(content)).toEqual([]);
  });

  it("stops at a crash leftover and preserves every file", () => {
    const root = freshRoot("crash-leftover");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const content = join(root, "apps/storytime/content");
    const leftover = join(content, "l2/w02.json.tmp-0123456789ab");
    writeFileSync(leftover, "partial stage\n");
    const before = snapshot(root);
    const next = commitWeeks();
    expect(run(root, "--commit", next)).toBe(1);
    expectUnchanged(before, snapshot(root));
    expect(findLeftovers(content)).toEqual([leftover]);
  });
});

describe("r3 receiver CLI boundaries", () => {
  it("makes short and full commit forms idempotent", () => {
    const root = freshRoot("commit-forms");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(root);
    expect(run(root, "--commit", baseCommit.slice(0, 7))).toBe(0);
    expectUnchanged(before, snapshot(root));
    expect(run(root, "--commit", baseCommit)).toBe(0);
    expectUnchanged(before, snapshot(root));
  });

  it("accepts valid week lists at the recorded commit without changing the record", () => {
    const root = freshRoot("valid-ranges");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(root);
    for (const weeks of ["1,3,5-7", "8,1-3", "01-08"]) {
      expect(run(root, "--commit", baseCommit, "--weeks", weeks), weeks).toBe(0);
      expectUnchanged(before, snapshot(root));
    }
  });

  it("rejects invalid levels and week tokens before any write", () => {
    const root = freshRoot("invalid-options");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(root);
    for (const level of ["-1", "0", "5", "2.5", "NaN", "Infinity"]) {
      expect(run(root, "--commit", baseCommit, "--level", level), level).toBe(64);
      expectUnchanged(before, snapshot(root));
    }
    for (const weeks of ["1-8,abc", "0", "33", "3-1", "1.5", "1,,3", "1-99999999999"]) {
      expect(run(root, "--commit", baseCommit, "--weeks", weeks), weeks).toBe(64);
      expectUnchanged(before, snapshot(root));
    }
    expect(run(root, "--commit", "deadbeef")).toBe(64);
    expectUnchanged(before, snapshot(root));
  });

  it("lets --help win over other flags and writes nothing", () => {
    const root = freshRoot("help-mixed");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(root);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(receiveMain([
      "--source", source,
      "--commit", "not-a-sha",
      "--weeks", "nope",
      "--level", "99",
      "--evil",
      "--help",
    ], root)).toBe(0);
    expect(log.mock.calls.map((call) => String(call[0])).join("\n")).toMatch(/Usage:/);
    expectUnchanged(before, snapshot(root));
  });
});
