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

import {
  receiveMain,
  receiveWeek,
  receiveWeeks,
  RollbackIncompleteError,
  writeStaged,
} from "../scripts/receive-weeks";

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
        { rename: failing },
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
      writeStaged([{ path: target, text: "new\n" }], {
        rename: () => {
          throw new Error("rename failed");
        },
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

describe("F32 and F41 the rollback tries every step", () => {
  const names = ["a.json", "b.json", "c.json", "d.json", "e.json"];

  /**
   * Builds a folder with three old files; the entries write five files.
   * @param label The folder name.
   * @returns The folder, the entries, and the snapshot before the write.
   */
  function fixture(label: string): {
    folder: string;
    entries: Array<{ path: string; text: string }>;
    before: Map<string, string>;
  } {
    const folder = join(work, `f32-${label}`);
    mkdirSync(folder, { recursive: true });
    for (const name of names.slice(0, 3)) writeFileSync(join(folder, name), `old ${name}\n`);
    return {
      folder,
      entries: names.map((name) => ({ path: join(folder, name), text: `new ${name}\n` })),
      before: snapshot(folder),
    };
  }

  /**
   * Checks that a folder holds the same files and texts as a snapshot.
   * @param folder The folder.
   * @param before The snapshot.
   */
  function expectSame(folder: string, before: Map<string, string>): void {
    const after = snapshot(folder);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, text] of before) expect(after.get(path), path).toBe(text);
  }

  it("restores everything for a rename fault at each position", () => {
    for (let position = 1; position <= names.length; position += 1) {
      const { folder, entries, before } = fixture(`rename-${position}`);
      let calls = 0;
      expect(
        () =>
          writeStaged(entries, {
            rename: (from, to) => {
              calls += 1;
              if (calls === position) throw new Error("rename failed");
              renameSync(from, to);
            },
          }),
        `position ${position}`,
      ).toThrow(/^rename failed$/);
      expectSame(folder, before);
    }
  });

  it("restores everything for a fault during staging, with or without a file left behind", () => {
    for (const leaveFile of [false, true]) {
      for (let position = 1; position <= names.length; position += 1) {
        const { folder, entries, before } = fixture(`stage-${leaveFile}-${position}`);
        let calls = 0;
        expect(
          () =>
            writeStaged(entries, {
              write: (path, data, flag) => {
                calls += 1;
                if (calls === position) {
                  if (leaveFile) writeFileSync(path, "half", { flag });
                  throw new Error("stage failed");
                }
                writeFileSync(path, data, { flag });
              },
            }),
          `position ${position}`,
        ).toThrow(/^stage failed$/);
        expectSame(folder, before);
      }
    }
  });

  it("tries every restore, keeps the first error, and names the file it cannot restore", () => {
    const { folder, entries, before } = fixture("restore");
    let renames = 0;
    let error: unknown;
    try {
      writeStaged(entries, {
        rename: (from, to) => {
          renames += 1;
          if (renames === 5) throw new Error("rename failed");
          renameSync(from, to);
        },
        write: (path, data, flag) => {
          if (flag === "w" && path === join(folder, "b.json")) throw new Error("restore failed");
          writeFileSync(path, data, { flag });
        },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    const failure = error as RollbackIncompleteError;
    expect(failure.message).toMatch(/rename failed/);
    expect(failure.message).toMatch(/not fully restored/);
    expect(failure.message).toMatch(/b\.json is not restored/);
    expect((failure.cause as Error).message).toBe("rename failed");
    expect(readFileSync(join(folder, "a.json"), "utf8")).toBe("old a.json\n");
    expect(readFileSync(join(folder, "c.json"), "utf8")).toBe("old c.json\n");
    expect(existsSync(join(folder, "d.json"))).toBe(false);
    expect(existsSync(join(folder, "e.json"))).toBe(false);
    const recovery = [...snapshot(folder).entries()].filter(([path]) => /b\.json\.orig-/.test(path));
    expect(recovery).toHaveLength(1);
    expect(recovery[0]![1]).toBe(before.get("/b.json"));
    expect(failure.message).toContain(recovery[0]![0].slice(1));
    expect([...snapshot(folder).keys()].filter((path) => /\.tmp-/.test(path))).toEqual([]);
  });

  it("names the original that no copy can keep", () => {
    const { folder, entries } = fixture("no-recovery");
    let renames = 0;
    let error: unknown;
    try {
      writeStaged(entries, {
        rename: (from, to) => {
          renames += 1;
          if (renames === 5) throw new Error("rename failed");
          renameSync(from, to);
        },
        write: (path, data, flag) => {
          if (path === join(folder, "a.json") || /a\.json\.orig-/.test(path)) throw new Error("disk gone");
          writeFileSync(path, data, { flag });
        },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    expect((error as Error).message).toMatch(/a\.json is not restored/);
    expect((error as Error).message).toMatch(/original could not be kept/);
  });

  it("tries every cleanup step and names a leftover", () => {
    const { folder, entries, before } = fixture("cleanup");
    let renames = 0;
    let error: unknown;
    try {
      writeStaged(entries, {
        rename: (from, to) => {
          renames += 1;
          if (renames === 3) throw new Error("rename failed");
          renameSync(from, to);
        },
        remove: (path, recursive) => {
          if (/d\.json\.tmp-/.test(path)) throw new Error("remove failed");
          rmSync(path, { force: true, recursive });
        },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    expect((error as Error).message).toMatch(/d\.json\.tmp-\w+ is not removed/);
    const left = [...snapshot(folder).keys()].filter((path) => /\.tmp-/.test(path));
    expect(left).toHaveLength(1);
    expect(left[0]).toMatch(/d\.json\.tmp-/);
    for (const [path, text] of before) expect(readFileSync(join(folder, path), "utf8"), path).toBe(text);
    expect(existsSync(join(folder, "e.json.tmp-x"))).toBe(false);
  });

  it("removes a created folder even when an earlier cleanup step fails", () => {
    const folder = join(work, "f32-created");
    const target = join(folder, "l2", "w01.json");
    let error: unknown;
    try {
      writeStaged([{ path: target, text: "new\n" }], {
        rename: () => {
          throw new Error("rename failed");
        },
        remove: (path, recursive) => {
          if (/w01\.json\.tmp-/.test(path)) throw new Error("remove failed");
          rmSync(path, { force: true, recursive });
        },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RollbackIncompleteError);
    expect(existsSync(folder)).toBe(false);
  });
});

describe("F40 the stage name is unpredictable and exclusive", () => {
  it("writes each stage file with the wx flag under a random name", () => {
    const folder = join(work, "f40");
    const seen: Array<{ path: string; flag: string }> = [];
    for (let round = 0; round < 2; round += 1) {
      writeStaged([{ path: join(folder, "w.json"), text: `n${round}\n` }], {
        write: (path, data, flag) => {
          seen.push({ path, flag });
          writeFileSync(path, data, { flag });
        },
      });
    }
    expect(seen).toHaveLength(2);
    for (const entry of seen) {
      expect(entry.flag).toBe("wx");
      expect(entry.path).not.toBe(`${join(folder, "w.json")}.tmp-${process.pid}`);
      expect(entry.path).toMatch(/w\.json\.tmp-[0-9a-f]{12}$/);
    }
    expect(seen[0]!.path).not.toBe(seen[1]!.path);
  });

  it("does not write through or delete a file that appears at the stage name first", () => {
    const folder = join(work, "f40-planted");
    mkdirSync(folder, { recursive: true });
    let planted = "";
    expect(() =>
      writeStaged([{ path: join(folder, "w.json"), text: "new\n" }], {
        write: (path, data, flag) => {
          planted = path;
          writeFileSync(path, "planted\n");
          writeFileSync(path, data, { flag });
        },
      }),
    ).toThrow(/EEXIST/);
    expect(readFileSync(planted, "utf8")).toBe("planted\n");
    expect(existsSync(join(folder, "w.json"))).toBe(false);
  });
});

describe("F50 and F52 the summary and the help", () => {
  it("prints the received weeks and the record weeks apart after a subset run", () => {
    const root = freshRoot("f50-summary");
    expect(run(root, "--commit", baseCommit)).toBe(0);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(receiveMain(["--source", source, "--commit", baseCommit, "--weeks", "1-4"], root)).toBe(0);
    const last = String(log.mock.calls.at(-1)?.[0]);
    expect(last).toMatch(/record 8 weeks/);
    expect(last).toMatch(/this run 4 weeks/);
  });

  it("prints the arguments and exits 0 for --help, and writes nothing", () => {
    const root = freshRoot("f52-help");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(receiveMain(["--help"], root)).toBe(0);
    const text = log.mock.calls.map((call) => String(call[0])).join("\n");
    for (const word of ["--commit", "--level", "--weeks", "--source", "64"]) expect(text).toContain(word);
    expect(snapshot(join(root, "apps/storytime/content")).size).toBe(0);
  });
});
