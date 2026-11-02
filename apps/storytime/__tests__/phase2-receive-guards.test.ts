// @vitest-environment node
// Phase 2 round 6 (Green, 2026-11-02): adversarial F22 (target path, validate first), and the
// receiver integrity findings F15 and F26 (subset run, junk --weeks). The run tests build a fake
// Workbooks repository and a fake repository root in the system temp folder. They never write to
// the real content folder.
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

import { receiveMain, receiveWeek, receiveWeeks, writeStaged } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shippedDirectory = resolve(app, "content", "l2");
const WEEK_FILES = readdirSync(shippedDirectory).filter((name) => /^w\d\d\.json$/.test(name)).sort();

/** A week as plain JSON, for a hostile edit. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const work = mkdtempSync(join(tmpdir(), "receive-guards-"));
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
  return receiveMain(["--source", source, ...args], root);
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", source]);
  git("config", "user.email", "green@example.invalid");
  git("config", "user.name", "Green");
  baseCommit = commitWeeks();
});

describe("F22 the receiver writes to the requested week only", () => {
  it("refuses a week whose meta names another level or week", () => {
    const hostile = JSON.parse(shippedText("w03.json")) as Json;
    hostile.meta.week = 1;
    hostile.meta.key = "st2/1";
    expect(() => receiveWeek(hostile, { expected: { level: 2, week: 3 } })).toThrow(
      /requested week/,
    );
  });

  it("accepts a week that matches the requested level and week", () => {
    const received = receiveWeek(JSON.parse(shippedText("w03.json")), {
      expected: { level: 2, week: 3 },
    });
    expect(received.path).toBe("apps/storytime/content/l2/w03.json");
  });

  it("refuses two weeks with one target path", () => {
    const text = shippedText("w03.json");
    expect(() =>
      receiveWeeks([
        { level: 2, week: 3, source: "l2/w03.json", text },
        { level: 2, week: 3, source: "l2/w03.json", text },
      ]),
    ).toThrow(/same target/);
  });

  it("keeps the published w01 when a source file holds the meta of w01", () => {
    const root = freshRoot("f22-overwrite");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(join(root, "apps/storytime/content"));
    const hostile = JSON.parse(shippedText("w03.json")) as Json;
    hostile.meta = { ...JSON.parse(shippedText("w02.json")).meta, week: 1, key: "st2/1" };
    const second = commitWeeks({ "w03.json": `${JSON.stringify(hostile, null, 2)}\n` });
    expect(run(root, "--commit", second)).not.toBe(0);
    const after = snapshot(join(root, "apps/storytime/content"));
    expect([...after.keys()]).toEqual([...before.keys()]);
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
    expect(JSON.parse(after.get("/l2/w01.json")!).meta.status).toBe("published");
  });

  it("writes nothing when a later week breaks the contract", () => {
    const root = freshRoot("f22-validate-first");
    const broken = JSON.parse(shippedText("w05.json")) as Json;
    broken.version = 2;
    const third = commitWeeks({ "w05.json": JSON.stringify(broken) });
    expect(run(root, "--commit", third)).toBe(1);
    expect(snapshot(join(root, "apps/storytime/content")).size).toBe(0);
  });
});

describe("F15 and F26 a run keeps one commit for the whole set", () => {
  it("refuses a subset run at a new commit, and keeps the files and source.json", () => {
    const root = freshRoot("f26-subset");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(join(root, "apps/storytime/content"));
    const next = commitWeeks();
    expect(next).not.toBe(baseCommit);
    expect(run(root, "--commit", next, "--weeks", "5")).toBe(64);
    const after = snapshot(join(root, "apps/storytime/content"));
    expect([...after.keys()]).toEqual([...before.keys()]);
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  });

  it("keeps all eight files in source.json after a subset run at the same commit", () => {
    const root = freshRoot("f26-same-commit");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const before = snapshot(join(root, "apps/storytime/content"));
    expect(run(root, "--commit", baseCommit, "--weeks", "5")).toBe(0);
    const after = snapshot(join(root, "apps/storytime/content"));
    expect(after.get("/source.json")).toBe(before.get("/source.json"));
    expect(JSON.parse(after.get("/source.json")!).files).toHaveLength(8);
  });

  it("moves the commit of source.json when a full run at a new commit succeeds", () => {
    const root = freshRoot("f26-full-move");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const next = commitWeeks();
    expect(run(root, "--commit", next)).toBe(0);
    const record = JSON.parse(snapshot(join(root, "apps/storytime/content")).get("/source.json")!);
    expect(record.commit).toBe(next);
    expect(record.files).toHaveLength(8);
  });

  it("exits 64 on a --weeks token that is not a number or a range, and writes nothing", () => {
    for (const weeks of ["1-8,abc", "abc", "1,,3", "0", "33", "3-1", "1-99999999999", "-1", "1.5"]) {
      const root = freshRoot(`f26-junk-${weeks.replace(/\W/g, "_")}`);
      expect(run(root, "--commit", baseCommit, "--weeks", weeks), weeks).toBe(64);
      expect(snapshot(join(root, "apps/storytime/content")).size, weeks).toBe(0);
    }
  });
});

describe("F29 a failed write restores every file", () => {
  it("leaves the content folder as it was when a directory stands at the path of week 5", () => {
    const root = freshRoot("f29-directory");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const edits: Record<string, string> = {};
    for (const file of ["w01.json", "w02.json", "w03.json", "w04.json"]) {
      const week = JSON.parse(shippedText(file)) as Json;
      week.meta.title = `${week.meta.title}!`;
      edits[file] = `${JSON.stringify(week, null, 2)}\n`;
    }
    const next = commitWeeks(edits);
    const content = join(root, "apps/storytime/content");
    rmSync(join(content, "l2/w05.json"));
    mkdirSync(join(content, "l2/w05.json"));
    writeFileSync(join(content, "l2/w05.json/keep.txt"), "keep\n");
    const before = snapshot(content);
    expect(run(root, "--commit", next)).not.toBe(0);
    const after = snapshot(content);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  });

  it("restores the replaced files, removes the new files, and leaves no temporary file", () => {
    const folder = join(work, "f29-staged");
    mkdirSync(folder, { recursive: true });
    const names = ["a.json", "b.json", "c.json", "d.json", "e.json"];
    for (const name of names.slice(0, 3)) writeFileSync(join(folder, name), `old ${name}\n`);
    const before = snapshot(folder);
    let calls = 0;
    const failing = (from: string, to: string): void => {
      calls += 1;
      if (calls === 5) throw new Error("rename failed");
      renameSync(from, to);
    };
    expect(() =>
      writeStaged(
        names.map((name) => ({ path: join(folder, name), text: `new ${name}\n` })),
        failing,
      ),
    ).toThrow(/rename failed/);
    const after = snapshot(folder);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  });

  it("removes a folder that the failed run created", () => {
    const folder = join(work, "f29-created");
    const target = join(folder, "l2", "w01.json");
    expect(() =>
      writeStaged([{ path: target, text: "new\n" }], () => {
        throw new Error("rename failed");
      }),
    ).toThrow(/rename failed/);
    expect(existsSync(folder)).toBe(false);
  });

  it("writes every file when nothing fails", () => {
    const folder = join(work, "f29-ok");
    writeStaged([
      { path: join(folder, "x/a.json"), text: "a\n" },
      { path: join(folder, "x/b.json"), text: "b\n" },
    ]);
    expect([...snapshot(folder).entries()].sort()).toEqual([
      ["/x/a.json", "a\n"],
      ["/x/b.json", "b\n"],
    ]);
  });
});
