// @vitest-environment node
// The receiver findings of the Phase 3 test strategy (plan task 3.8): F77, F78, F84, F91, F92,
// and F98. The tests build a fake Workbooks repository and a fake repository root in the system
// temp folder. They never write to the real content folder.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import * as receiver from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const shippedDirectory = resolve(app, "content", "l2");
const runbookPath = resolve(root, "docs/runbooks/storytime-app-week-sync.md");
const runbook = readFileSync(runbookPath, "utf8");
const receiverSource = readFileSync(resolve(app, "scripts", "receive-weeks.ts"), "utf8");

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const work = mkdtempSync(join(tmpdir(), "receiver-hardening-"));
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
 * Writes the level 2 weeks of a fake Workbooks commit.
 * @param edits Replacement texts by file name; every other week keeps its shipped text.
 * @returns The full commit id.
 */
function commitWeeks(edits: Record<string, string> = {}): string {
  mkdirSync(join(source, "content/storytime/l2"), { recursive: true });
  for (const name of readdirSync(shippedDirectory).filter((entry) => /^w\d\d\.json$/.test(entry))) {
    writeFileSync(
      join(source, "content/storytime/l2", name),
      edits[name] ?? readFileSync(resolve(shippedDirectory, name), "utf8"),
    );
  }
  git("add", "-A");
  git("commit", "--quiet", "--allow-empty", "--message", "weeks");
  return git("rev-parse", "HEAD").trim();
}

/**
 * Writes a level 3 week of a fake Workbooks commit.
 * @returns The full commit id.
 */
function commitLevel3(): string {
  const week = JSON.parse(readFileSync(resolve(shippedDirectory, "w01.json"), "utf8")) as Json;
  week.meta.level = 3;
  week.meta.week = 7;
  week.meta.key = "st3/7";
  mkdirSync(join(source, "content/storytime/l3"), { recursive: true });
  writeFileSync(join(source, "content/storytime/l3", "w07.json"), `${JSON.stringify(week, null, 2)}\n`);
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
  const folder = join(work, name);
  mkdirSync(join(folder, "apps/storytime/content"), { recursive: true });
  return folder;
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
 * Runs the receiving step quietly and gives the error text.
 * @param root The fake repository root.
 * @param args The command line.
 * @returns The exit code and the text of the error lines.
 */
function run(root: string, ...args: string[]): { code: number; errors: string } {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const code = receiver.receiveMain(["--source", source, ...args], root);
  return { code, errors: error.mock.calls.map((call) => String(call[0])).join("\n") };
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", source]);
  git("config", "user.email", "maker@example.invalid");
  git("config", "user.name", "Maker");
  baseCommit = commitWeeks();
});

describe("F77 a match of the leftover rule may be an unrelated file", () => {
  it("names every match a possible recovery file", () => {
    const folder = freshRoot("f77");
    const content = join(folder, "apps/storytime/content");
    const planted = join(content, "operator.orig-notes");
    writeFileSync(planted, "the operator notes\n");
    const result = run(folder, "--commit", baseCommit);
    expect(result.code, "The run wrote a file").not.toBe(0);
    expect(result.errors, "The message names no possible recovery file").toMatch(
      /possible recovery file/,
    );
    expect(readFileSync(planted, "utf8"), "The run changed the file").toBe("the operator notes\n");
    expect(snapshot(content).size, "The run wrote a file").toBe(1);
  });
});

describe("F78 a link in the content folder stops the run", () => {
  it("exits before any write and names the link", () => {
    const folder = freshRoot("f78");
    const content = join(folder, "apps/storytime/content");
    const outside = join(work, "f78-outside");
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "w01.json.orig-aabbccddeeff"), "the only copy\n");
    symlinkSync(outside, join(content, "l2"));
    const result = run(folder, "--commit", baseCommit);
    expect(result.code, "The run wrote through the link").not.toBe(0);
    expect(result.errors, "The message names no link").toContain(join(content, "l2"));
    expect(readdirSync(outside), "The run wrote through the link").toEqual([
      "w01.json.orig-aabbccddeeff",
    ]);
    expect(snapshot(content).size, "The run wrote a file in the content folder").toBe(0);
  });
});

describe("F84 a stage path is checked at every folder of the way", () => {
  it("writes no file outside the content folder", () => {
    const folder = freshRoot("f84");
    const content = join(folder, "apps/storytime/content");
    const outside = join(work, "f84-outside");
    mkdirSync(outside, { recursive: true });
    const commit = commitLevel3();
    symlinkSync(outside, join(content, "l3"));
    const result = run(folder, "--commit", commit, "--level", "3", "--weeks", "7");
    expect(result.code, "The run wrote through the link").not.toBe(0);
    expect(result.errors, "The message names no link").toContain(join(content, "l3"));
    expect(readdirSync(outside), "The run wrote a file outside the content folder").toEqual([]);
  });
});

describe("F91 the stop rule and the runbook text agree", () => {
  it("gives the same pattern as the code", () => {
    const match = receiverSource.match(/const LEFTOVER_NAME = \/(.+)\/\w*;/);
    expect(match, "The receiving script has no leftover rule").not.toBeNull();
    const pattern = match?.[1] ?? "";
    expect(pattern, "The leftover rule has no pattern").not.toBe("");
    expect(runbook, "The runbook does not give the pattern of the code").toContain(pattern);
  });

  it("says that the name ends with the pattern", () => {
    expect(runbook, "The runbook does not say that the name ends with the pattern").toMatch(
      /ends with/i,
    );
  });
});

describe("F92 the recovery steps answer for an untracked target", () => {
  const section = runbook.slice(runbook.indexOf("## Recover from a failed run"));

  it("names the untracked case", () => {
    expect(section, "The recovery steps name no untracked case").toMatch(/untracked/i);
  });

  it("gives an answer for a target that Git does not track", () => {
    expect(section, "The recovery steps give no answer for an untracked target").toMatch(
      /git restore[\s\S]{0,400}?(delete|remove)/i,
    );
  });
});

describe("F98 a fault in the copy write leaves no partial copy", () => {
  it("removes the partial copy and names it", () => {
    const folder = join(work, "f98");
    mkdirSync(folder, { recursive: true });
    const names = ["a.json", "b.json", "c.json", "d.json", "e.json"];
    for (const name of names.slice(0, 3)) writeFileSync(join(folder, name), `old ${name}\n`);
    let renames = 0;
    let restoreFailed = false;
    let error: unknown;
    try {
      receiver.writeStaged(
        names.map((name) => ({ path: join(folder, name), text: `new ${name}\n` })),
        {
          rename: (from, to) => {
            renames += 1;
            if (renames === 5) throw new Error("rename failed");
            renameSync(from, to);
          },
          write: (path, data, flag) => {
            if (flag === "w" && path === join(folder, "b.json")) {
              restoreFailed = true;
              throw new Error("restore failed");
            }
            if (restoreFailed && flag === "wx") {
              writeFileSync(path, "half", { flag });
              throw new Error("copy failed");
            }
            writeFileSync(path, data, { flag });
          },
        },
      );
    } catch (caught) {
      error = caught;
    }
    expect(error, "The failed write did not raise an error").toBeInstanceOf(
      receiver.RollbackIncompleteError,
    );
    const message = (error as Error).message;
    expect(message, "The error names no partial copy").toMatch(/b\.json/);
    expect(message, "The error names no partial copy").toMatch(/partial copy/);
    const left = [...snapshot(folder).keys()].filter((path) => /\.orig-|\.tmp-/.test(path));
    expect(left, `The run left a partial copy: ${left.join(" | ")}`).toEqual([]);
    expect(readFileSync(join(folder, "b.json"), "utf8"), "The target holds the new text").toBe(
      "new b.json\n",
    );
  });
});
