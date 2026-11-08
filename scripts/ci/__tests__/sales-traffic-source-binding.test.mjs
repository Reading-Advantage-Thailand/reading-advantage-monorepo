#!/usr/bin/env node
/**
 * Red tests for Phase 1 of the track `sales_traffic_source_binding_20261108`.
 *
 * The cases are S-01 to S-30b of `measure/tracks/sales_traffic_source_binding_20261108/test-strategy.md`
 * section P1.4. Cases S-01 to S-26 run the script `scripts/ci/verify-traffic-source.sh` on a
 * scratch Git fixture. Cases S-27 to S-30b read the text of the script, the sales traffic file,
 * the `.gcloudignore` file, and the runbook. No test reads a path under `measure/`.
 *
 * The fixture builder lives in this file (default D4). Every fixture is a scratch Git
 * repository under the temporary folder, with a bare `file://` origin.
 *
 * Run with the Red command of test-strategy section P1.3:
 * `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`.
 *
 * @module sales-traffic-source-binding.test
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, describe, it } from "vitest";
import { parse as parseYamlText } from "yaml";
import { sectionText, stepText } from "./helpers/plan.mjs";

/** The repository root. */
const ROOT = fileURLToPath(new URL("../../..", import.meta.url)).replace(/\/$/, "");

/** The script under test. */
const SCRIPT = join(ROOT, "scripts", "ci", "verify-traffic-source.sh");

/** The sales traffic file. */
const TRAFFIC = join(ROOT, "apps", "sales-advantage", "cloudbuild-traffic.yaml");

/** The traffic runbook. */
const RUNBOOK = join(ROOT, "docs", "runbooks", "traffic-moves.md");

/** The real root `.gcloudignore` text. */
const REAL_GCLOUDIGNORE = readFileSync(join(ROOT, ".gcloudignore"), "utf8");

/** The base of every scratch folder. */
const SCRATCH_BASE = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();

/** The scratch folders of this run. */
const scratchDirs = new Set();

/** The words that spec criterion 6 forbids, in lower case. */
const FORBIDDEN_WORDS = [
  "sha256",
  "sha-256",
  "sha256sum",
  "sha1sum",
  "shasum",
  "md5sum",
  "openssl dgst",
  "checksum",
  "createhash",
  "manifest",
];

/** The tool names that a stub or a missing-tool case may need. */
const TOOL_NAMES = [
  "awk",
  "basename",
  "bash",
  "cat",
  "chmod",
  "comm",
  "cp",
  "cut",
  "date",
  "df",
  "dirname",
  "du",
  "env",
  "expr",
  "false",
  "find",
  "git",
  "grep",
  "head",
  "id",
  "ls",
  "mkdir",
  "mktemp",
  "mv",
  "printenv",
  "ps",
  "realpath",
  "readlink",
  "rm",
  "sed",
  "sh",
  "sleep",
  "sort",
  "stat",
  "tail",
  "tee",
  "test",
  "touch",
  "tr",
  "true",
  "uname",
  "wc",
  "xargs",
];

/**
 * Create a scratch folder with the prefix `traffic-bind-`.
 *
 * @returns {string} The folder path.
 */
function scratch() {
  const dir = mkdtempSync(join(SCRATCH_BASE, "traffic-bind-"));
  scratchDirs.add(dir);
  return dir;
}

/**
 * Remove every scratch folder of this test file.
 *
 * @returns {void}
 */
function removeScratch() {
  for (const dir of scratchDirs) {
    try {
      rmSync(dir, { force: true, recursive: true });
    } catch {
      // A locked file must not hide the result of a case.
    }
  }
  scratchDirs.clear();
}

afterEach(() => {
  removeScratch();
});

afterAll(() => {
  removeScratch();
});

/**
 * Stop a case when the free disk is below 3000 MB.
 *
 * @returns {void}
 * @throws {Error} When the free space is below the guard value.
 */
function assertDisk() {
  const result = spawnSync("df", ["-m", "/"], { encoding: "utf8" });
  const line = (result.stdout ?? "").trim().split("\n").pop() ?? "";
  const parts = line.trim().split(/\s+/);
  const avail = Number(parts[3]);
  if (!Number.isInteger(avail) || avail < 3000) {
    throw new Error(`disk_avail_mb=${Number.isInteger(avail) ? avail : "unknown"}`);
  }
}

/**
 * Require the script under test and the disk guard.
 *
 * Every script case starts with this check, so a missing script fails the case
 * instead of making a negative case pass (anti-pattern A4).
 *
 * @returns {void}
 * @throws {Error} When the script is absent or the disk is low.
 */
function requireScript() {
  assertDisk();
  if (!existsSync(SCRIPT)) {
    throw new Error("red: scripts/ci/verify-traffic-source.sh is absent");
  }
}

/**
 * Build the environment of a hermetic git call.
 *
 * @returns {Record<string, string | undefined>} The environment.
 */
function gitEnv() {
  const env = {
    ...process.env,
    GIT_ALLOW_PROTOCOL: "file",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  for (const key of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
    "GIT_PREFIX",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  ]) {
    delete env[key];
  }
  return env;
}

/**
 * Run a git command and return its text output.
 *
 * @param {string} cwd The working folder.
 * @param {string[]} args The git arguments.
 * @param {{ input?: string }} [options] The standard input of the call.
 * @returns {string} The standard output.
 * @throws {Error} When git exits non-zero.
 */
function gitText(cwd, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd,
    env: gitEnv(),
    encoding: "utf8",
    input: options.input,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  }
  return result.stdout ?? "";
}

/**
 * Run a git command and return its raw output.
 *
 * @param {string} cwd The working folder.
 * @param {string[]} args The git arguments.
 * @returns {Buffer} The standard output.
 * @throws {Error} When git exits non-zero.
 */
function gitBuffer(cwd, args) {
  const result = spawnSync("git", args, { cwd, env: gitEnv(), encoding: "buffer" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr ?? "").trim()}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

/**
 * Find the absolute path of a tool on the current PATH.
 *
 * @param {string} name The tool name.
 * @returns {string} The absolute path, or an empty string.
 */
function which(name) {
  const result = spawnSync("/bin/bash", ["-c", `command -v ${name}`], { encoding: "utf8" });
  const text = (result.stdout ?? "").trim();
  return text.startsWith("/") ? text : "";
}

/**
 * Write an entry of a fixture into the work tree.
 *
 * @param {string} work The work tree.
 * @param {{ path: string, content?: string, link?: string, mode?: string }} entry The entry.
 * @returns {void}
 */
function writeEntry(work, entry) {
  const target = join(work, entry.path);
  mkdirSync(dirname(target), { recursive: true });
  if (entry.link !== undefined) {
    symlinkSync(entry.link, target);
    return;
  }
  writeFileSync(target, entry.content ?? "");
  if (entry.mode === "100755") chmodSync(target, 0o755);
}

/**
 * Build the expected upload of a commit.
 *
 * The upload holds the in-scope entries of the commit, with the same bytes, links,
 * and types. The scope follows the `.gcloudignore` of the commit, through
 * `git check-ignore --no-index`.
 *
 * @param {string} work The work tree.
 * @param {string} sha The commit.
 * @param {string} upload The upload folder.
 * @returns {void}
 */
function writeUpload(work, sha, upload) {
  mkdirSync(upload, { recursive: true });
  const records = gitText(work, ["ls-tree", "-r", "-z", sha])
    .split("\0")
    .filter((record) => record !== "");
  const entries = records.map((record) => {
    const tab = record.indexOf("\t");
    const [mode, type, id] = record.slice(0, tab).split(" ");
    return { mode, type, id, path: record.slice(tab + 1) };
  });
  const show = spawnSync("git", ["show", `${sha}:.gcloudignore`], {
    cwd: work,
    env: gitEnv(),
    encoding: "utf8",
  });
  const ignored = new Set();
  if (show.status === 0) {
    const ignoreFile = join(dirname(upload), "commit-gcloudignore");
    writeFileSync(ignoreFile, show.stdout ?? "");
    const input = entries.length === 0 ? "" : `${entries.map((entry) => entry.path).join("\0")}\0`;
    const check = spawnSync(
      "git",
      ["-c", `core.excludesFile=${ignoreFile}`, "check-ignore", "--no-index", "--stdin", "-z"],
      { cwd: work, env: gitEnv(), encoding: "utf8", input },
    );
    if (check.status === 128) {
      throw new Error(`git check-ignore failed: ${(check.stderr ?? "").trim()}`);
    }
    for (const path of (check.stdout ?? "").split("\0")) {
      if (path !== "") ignored.add(path);
    }
  }
  for (const entry of entries) {
    if (ignored.has(entry.path) || entry.mode === "160000") continue;
    const target = join(upload, entry.path);
    mkdirSync(dirname(target), { recursive: true });
    const blob = gitBuffer(work, ["cat-file", "blob", entry.id]);
    if (entry.mode === "120000") {
      symlinkSync(blob.toString("utf8"), target);
    } else {
      writeFileSync(target, blob);
    }
  }
}

/**
 * Build a scratch repository with one commit and its upload.
 *
 * @param {{ path: string, content?: string, link?: string, gitlink?: string, mode?: string }[]} entries The entries of the commit.
 * @returns {{ dir: string, bare: string, url: string, sha: string, upload: string }} The fixture.
 */
function fixture(entries) {
  const dir = scratch();
  const bare = join(dir, "origin.git");
  const work = join(dir, "work");
  mkdirSync(work);
  gitText(dir, ["init", "--bare", "-q", bare]);
  gitText(bare, ["config", "uploadpack.allowFilter", "true"]);
  gitText(bare, ["config", "uploadpack.allowAnySHA1InWant", "true"]);
  gitText(work, ["init", "-q", "-b", "master"]);
  gitText(work, ["config", "user.name", "Measure Red"]);
  gitText(work, ["config", "user.email", "measure-red@example.invalid"]);
  gitText(work, ["config", "commit.gpgsign", "false"]);
  for (const entry of entries) {
    if (entry.gitlink === undefined) writeEntry(work, entry);
  }
  gitText(work, ["add", "-A"]);
  for (const entry of entries) {
    if (entry.gitlink !== undefined) {
      gitText(work, ["update-index", "--add", "--cacheinfo", `160000,${entry.gitlink},${entry.path}`]);
    }
  }
  gitText(work, ["commit", "-q", "-m", "fixture"]);
  const sha = gitText(work, ["rev-parse", "HEAD"]).trim();
  gitText(work, ["push", "-q", bare, "HEAD:refs/heads/master"]);
  const upload = join(dir, "upload");
  writeUpload(work, sha, upload);
  return { dir, bare, url: `file://${bare}`, sha, upload };
}

/**
 * Build a fixture with the real `.gcloudignore` and one in-scope file.
 *
 * @returns {{ dir: string, bare: string, url: string, sha: string, upload: string }} The fixture.
 */
function basicFixture() {
  return fixture([
    { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
    { path: "README.md", content: "# fixture\n" },
  ]);
}

/**
 * Write the logging `git` wrapper into a binary folder.
 *
 * The wrapper writes its arguments to a log file and then runs the real git by
 * absolute path (default D2).
 *
 * @param {string} dir The scratch folder.
 * @param {string} logFile The log file.
 * @returns {string} The binary folder.
 */
function gitWrapper(dir, logFile) {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  const realGit = which("git");
  if (realGit === "") throw new Error("the test host has no git");
  const file = join(bin, "git");
  writeFileSync(
    file,
    `#!/bin/bash\nprintf '%s\\n' "$*" >> ${JSON.stringify(logFile)}\nexec ${JSON.stringify(realGit)} "$@"\n`,
  );
  chmodSync(file, 0o755);
  return bin;
}

/**
 * Build a binary folder with links to the needed tools.
 *
 * @param {string} dir The scratch folder.
 * @param {{ omit?: string[], overrides?: Record<string, string> }} [options] The tools to omit and the stub text.
 * @returns {string} The binary folder.
 */
function toolBin(dir, options = {}) {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  const omit = options.omit ?? [];
  for (const name of TOOL_NAMES) {
    if (omit.includes(name)) continue;
    const real = which(name);
    if (real === "") continue;
    symlinkSync(real, join(bin, name));
  }
  for (const [name, content] of Object.entries(options.overrides ?? {})) {
    const file = join(bin, name);
    writeFileSync(file, content);
    chmodSync(file, 0o755);
  }
  return bin;
}

/**
 * Build the environment of one script run.
 *
 * @param {{ pathDir?: string, onlyPath?: boolean, extra?: Record<string, string | undefined> }} [options] The PATH folder and extra values.
 * @returns {Record<string, string | undefined>} The environment.
 */
function scriptEnv(options = {}) {
  const env = gitEnv();
  if (options.pathDir) {
    env.PATH = options.onlyPath
      ? options.pathDir
      : `${options.pathDir}:${process.env.PATH ?? ""}`;
  }
  return Object.assign(env, options.extra ?? {});
}

/**
 * Read the lines of a fetch log.
 *
 * @param {string | undefined} path The log file.
 * @returns {string[]} The lines.
 */
function fetchLines(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter((line) => line !== "");
}

/**
 * Run the script with separate streams.
 *
 * @param {string[]} args The script arguments.
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, file?: string, fetchLog?: string }} [options] The run options.
 * @returns {{ status: number | null, stdout: string, stderr: string, fetchLines: string[] }} The result.
 */
function runScript(args, options = {}) {
  const result = spawnSync("/bin/bash", [options.file ?? SCRIPT, ...args], {
    cwd: options.cwd,
    env: options.env ?? scriptEnv(),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    fetchLines: fetchLines(options.fetchLog),
  };
}

/**
 * Run the script with standard output and standard error in one stream (default D3).
 *
 * @param {string[]} args The script arguments.
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, file?: string, fetchLog?: string }} [options] The run options.
 * @returns {{ status: number | null, merged: string, fetchLines: string[] }} The result.
 */
function runMerged(args, options = {}) {
  const result = spawnSync(
    "/bin/bash",
    ["-c", 'exec /bin/bash "$@" 2>&1', "measure-red", options.file ?? SCRIPT, ...args],
    {
      cwd: options.cwd,
      env: options.env ?? scriptEnv(),
      encoding: "utf8",
    },
  );
  return {
    status: result.status,
    merged: result.stdout ?? "",
    fetchLines: fetchLines(options.fetchLog),
  };
}

/**
 * Assert that a fetch log holds no fetch and no init line (default D2).
 *
 * @param {string[]} lines The log lines.
 * @param {string} label The check name.
 * @returns {void}
 * @throws {Error} When the log holds a fetch or an init line.
 */
function assertNoFetch(lines, label) {
  const found = lines.filter((line) => line.startsWith("fetch") || line.startsWith("init"));
  if (found.length > 0) {
    throw new Error(`${label}: the script fetched or inited before the check: ${found.join("; ")}`);
  }
}

/**
 * Throw when a standard error stream holds no named line.
 *
 * @param {string} stderr The stream.
 * @param {string} expected The expected line.
 * @returns {void}
 * @throws {Error} When the line is absent.
 */
function assertStderrLine(stderr, expected) {
  const lines = stderr.split("\n");
  if (!lines.includes(expected)) {
    throw new Error(`expected stderr line ${JSON.stringify(expected)}; got ${JSON.stringify(stderr)}`);
  }
}

/**
 * Throw when a status is zero on a negative case.
 *
 * @param {{ status: number | null, stderr?: string }} result The result.
 * @param {string} label The check name.
 * @returns {void}
 * @throws {Error} When the status is zero.
 */
function assertNonZero(result, label) {
  if (result.status === 0) {
    throw new Error(`${label}: expected a non-zero exit; stderr=${JSON.stringify(result.stderr ?? "")}`);
  }
}

/**
 * Read the parsed sales traffic file and its bind step.
 *
 * @returns {{ doc: Record<string, unknown>, steps: Record<string, unknown>[], step: Record<string, unknown> | undefined }} The file.
 */
function salesTraffic() {
  const doc = parseYamlText(readFileSync(TRAFFIC, "utf8"));
  const steps = Array.isArray(doc.steps) ? doc.steps : [];
  const step = steps.find((candidate) => String(candidate?.id ?? "") === "bind-release-source");
  return { doc, steps, step };
}

/**
 * Find the forbidden words of criterion 6 in a text.
 *
 * @param {string} text The text.
 * @returns {string[]} The words that the text holds.
 */
function forbiddenHits(text) {
  const lower = String(text).toLowerCase();
  return FORBIDDEN_WORDS.filter((word) => lower.includes(word));
}

/**
 * Get the lines of a stream that start with `missing:`, `extra:`, or `differs:`.
 *
 * @param {string} stream The stream.
 * @param {string} prefix The prefix.
 * @returns {string[]} The matching lines.
 */
function prefixedLines(stream, prefix) {
  return stream.split("\n").filter((line) => line.startsWith(`${prefix}: `));
}

/**
 * Read the real root `.gcloudignore` text.
 *
 * @returns {string} The text.
 */
function rulesText() {
  return readFileSync(join(ROOT, ".gcloudignore"), "utf8");
}

/**
 * Add a `measure/` line to rules text when the text lacks it (default D7).
 *
 * @param {string} text The rules text.
 * @returns {string} The text with the line.
 */
function rulesWithMeasureLine(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes("measure/")) return text;
  return text === "" || text.endsWith("\n") ? `${text}measure/\n` : `${text}\nmeasure/\n`;
}

/**
 * Remove every `measure/` line from rules text (the control of default D7).
 *
 * @param {string} text The rules text.
 * @returns {string} The text without the line.
 */
function rulesWithoutMeasureLine(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "measure/")
    .join("\n");
}

/**
 * Build an empty non-bare scratch repository with an exclude file (default D8).
 *
 * @param {string} text The rules text.
 * @returns {{ dir: string, file: string }} The repository and the exclude file.
 */
function ignoreScratch(text) {
  const dir = scratch();
  gitText(dir, ["init", "-q"]);
  const file = join(dir, "gcloudignore");
  writeFileSync(file, text);
  return { dir, file };
}

/**
 * Return the paths that the rules do not ignore (default D8).
 *
 * @param {string} text The rules text.
 * @param {string[]} paths The paths to check.
 * @returns {string[]} The paths that stay in scope.
 */
function inScopePaths(text, paths) {
  const { dir, file } = ignoreScratch(text);
  const input = paths.length === 0 ? "" : `${paths.join("\0")}\0`;
  const result = spawnSync(
    "git",
    ["-c", `core.excludesFile=${file}`, "check-ignore", "--no-index", "--stdin", "-z"],
    { cwd: dir, env: gitEnv(), encoding: "utf8", input },
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git check-ignore failed: ${(result.stderr ?? "").trim()}`);
  }
  const ignored = new Set((result.stdout ?? "").split("\0").filter((path) => path !== ""));
  return paths.filter((path) => !ignored.has(path));
}

describe("S: sales traffic source binding", () => {
  it("S-01 a matching source passes and the script fetches once", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "README.md", content: "# fixture\n" },
      { path: "apps/sales-advantage/app/page.tsx", content: "export default null;\n" },
      { path: "packages/db/drizzle/0001_x.sql", content: "select 1;\n" },
      { path: "scripts/ci/probe.txt", content: "probe\n" },
      { path: "apps/primary-advantage/x.ts", content: "ignored\n" },
      { path: "node_modules/x.js", content: "ignored\n" },
      { path: ".env", content: "IGNORED=1\n" },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    if (res.status !== 0) throw new Error(`expected exit 0, got ${res.status}; stderr=${res.stderr}`);
    for (const prefix of ["missing", "extra", "differs"]) {
      const lines = prefixedLines(`${res.stdout}\n${res.stderr}`, prefix);
      if (lines.length > 0) throw new Error(`a pass run printed ${lines.join("; ")}`);
    }
    if (!res.fetchLines.some((line) => line.startsWith("fetch"))) {
      throw new Error("the valid run made no fetch; the logging wrapper is dead");
    }
  });

  it("S-02 a differing file fails and names the first file", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "a.txt", content: "one\n" },
      { path: "b.txt", content: "one\n" },
    ]);
    writeFileSync(join(f.upload, "a.txt"), "two\n");
    writeFileSync(join(f.upload, "b.txt"), "two\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-02");
    const differs = prefixedLines(res.stderr, "differs");
    if (differs.length !== 2) throw new Error(`expected two differs lines, got ${JSON.stringify(res.stderr)}`);
    if (differs[0] !== "differs: a.txt") throw new Error(`the first differs line is ${JSON.stringify(differs[0])}`);
    if (prefixedLines(res.stderr, "missing").length > 0 || prefixedLines(res.stderr, "extra").length > 0) {
      throw new Error(`a one-way line appeared: ${JSON.stringify(res.stderr)}`);
    }
  });

  it("S-03 a missing migration file fails with a missing line", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "packages/db/drizzle/0001_x.sql", content: "select 1;\n" },
    ]);
    rmSync(join(f.upload, "packages/db/drizzle/0001_x.sql"), { force: true });
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-03");
    assertStderrLine(res.stderr, "missing: packages/db/drizzle/0001_x.sql");
  });

  it("S-04 an extra file fails with an extra line", () => {
    requireScript();
    const f = basicFixture();
    mkdirSync(join(f.upload, "apps/sales-advantage"), { recursive: true });
    writeFileSync(join(f.upload, "apps/sales-advantage/untracked.txt"), "extra\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-04");
    assertStderrLine(res.stderr, "extra: apps/sales-advantage/untracked.txt");
  });

  it("S-05 an extra file on an ignored path fails (default D6)", () => {
    requireScript();
    const f = basicFixture();
    mkdirSync(join(f.upload, "apps/primary-advantage"), { recursive: true });
    writeFileSync(join(f.upload, "apps/primary-advantage/evil.ts"), "extra\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-05");
    assertStderrLine(res.stderr, "extra: apps/primary-advantage/evil.ts");
  });

  it("S-06 excluded files that the upload lacks pass", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "README.md", content: "# fixture\n" },
      { path: "apps/primary-advantage/x.ts", content: "ignored\n" },
      { path: "node_modules/x.js", content: "ignored\n" },
    ]);
    if (existsSync(join(f.upload, "apps/primary-advantage/x.ts"))) {
      throw new Error("the fixture upload holds an ignored path");
    }
    if (existsSync(join(f.upload, "node_modules/x.js"))) {
      throw new Error("the fixture upload holds an ignored path");
    }
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    if (res.status !== 0) throw new Error(`expected exit 0, got ${res.status}; stderr=${res.stderr}`);
  });

  it("S-07 a missing re-included app file fails with a missing line", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "apps/sales-advantage/app/page.tsx", content: "export default null;\n" },
    ]);
    rmSync(join(f.upload, "apps/sales-advantage/app/page.tsx"), { force: true });
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-07");
    assertStderrLine(res.stderr, "missing: apps/sales-advantage/app/page.tsx");
  });

  it("S-08 the lines come in bytewise order under a non-C locale", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "B.txt", content: "b\n" },
      { path: "a.txt", content: "a\n" },
    ]);
    rmSync(join(f.upload, "B.txt"), { force: true });
    rmSync(join(f.upload, "a.txt"), { force: true });
    writeFileSync(join(f.upload, "D.txt"), "d\n");
    writeFileSync(join(f.upload, "c.txt"), "e\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const env = scriptEnv({ pathDir: bin });
    delete env.LC_ALL;
    env.LANG = "en_US.utf8";
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env, fetchLog: log });
    assertNonZero(res, "S-08");
    const ordered = res.stderr
      .split("\n")
      .filter((line) => /^(missing|extra): /.test(line));
    const expected = ["missing: B.txt", "missing: a.txt", "extra: D.txt", "extra: c.txt"];
    if (JSON.stringify(ordered) !== JSON.stringify(expected)) {
      throw new Error(`line order differs; expected=${JSON.stringify(expected)} actual=${JSON.stringify(ordered)}`);
    }
  });

  it("S-09 a name with a space, a quote, a newline, and non-ASCII passes", () => {
    requireScript();
    const name = 'dir/a b"c\nd-é.txt';
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: name, content: "same\n" },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    if (res.status !== 0) throw new Error(`expected exit 0, got ${res.status}; stderr=${res.stderr}`);
  });

  it("S-10 a missing special name fails with a missing line", () => {
    requireScript();
    const name = 'dir/a b"c\nd-é.txt';
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: name, content: "same\n" },
    ]);
    rmSync(join(f.upload, name), { force: true });
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-10");
    const line = res.stderr.split("\n").find((candidate) => candidate.startsWith('missing: dir/a b"c'));
    if (!line) throw new Error(`no missing line for the special name; stderr=${JSON.stringify(res.stderr)}`);
  });

  it("S-11 a differing special name fails with a differs line", () => {
    requireScript();
    const name = 'dir/a b"c\nd-é.txt';
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: name, content: "same\n" },
    ]);
    writeFileSync(join(f.upload, name), "other\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-11");
    const line = res.stderr.split("\n").find((candidate) => candidate.startsWith('differs: dir/a b"c'));
    if (!line) throw new Error(`no differs line for the special name; stderr=${JSON.stringify(res.stderr)}`);
  });

  it("S-12 a gitlink entry fails closed", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "README.md", content: "# fixture\n" },
      { path: "vendor/sub", gitlink: "1".repeat(40) },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-12");
  });

  it("S-13 a #!include: line in .gcloudignore fails closed", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: `${REAL_GCLOUDIGNORE}\n#!include:extra.ignore\n` },
      { path: "README.md", content: "# fixture\n" },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-13");
  });

  it("S-14 a symbolic link with the same target passes", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "link", link: "target.txt" },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    if (res.status !== 0) throw new Error(`expected exit 0, got ${res.status}; stderr=${res.stderr}`);
  });

  it("S-15 a symbolic link with another target fails with a differs line", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "link", link: "target.txt" },
    ]);
    rmSync(join(f.upload, "link"), { force: true });
    symlinkSync("other.txt", join(f.upload, "link"));
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-15");
    assertStderrLine(res.stderr, "differs: link");
  });

  it("S-16 a regular file where the commit holds a link fails with a differs line", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "link", link: "target.txt" },
    ]);
    rmSync(join(f.upload, "link"), { force: true });
    writeFileSync(join(f.upload, "link"), "target.txt");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-16");
    assertStderrLine(res.stderr, "differs: link");
  });

  it("S-17 the executable bit is not compared", () => {
    requireScript();
    const first = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "run.sh", content: "echo run\n", mode: "100755" },
    ]);
    const firstLog = join(first.dir, "git.log");
    const firstBin = gitWrapper(first.dir, firstLog);
    const firstRes = runScript([first.sha, first.url, "."], {
      cwd: first.upload,
      env: scriptEnv({ pathDir: firstBin }),
      fetchLog: firstLog,
    });
    if (firstRes.status !== 0) {
      throw new Error(`expected exit 0 when the upload bit differs, got ${firstRes.status}; stderr=${firstRes.stderr}`);
    }
    const second = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "run.sh", content: "echo run\n" },
    ]);
    chmodSync(join(second.upload, "run.sh"), 0o755);
    const secondLog = join(second.dir, "git.log");
    const secondBin = gitWrapper(second.dir, secondLog);
    const secondRes = runScript([second.sha, second.url, "."], {
      cwd: second.upload,
      env: scriptEnv({ pathDir: secondBin }),
      fetchLog: secondLog,
    });
    if (secondRes.status !== 0) {
      throw new Error(`expected exit 0 when the commit bit differs, got ${secondRes.status}; stderr=${secondRes.stderr}`);
    }
  });

  it("S-18 ten malformed SHA forms fail before any fetch", () => {
    requireScript();
    const f = basicFixture();
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const forms = [
      [],
      [""],
      ["REQUIRED_RELEASE_COMMIT_SHA"],
      ["a".repeat(39), f.url, "."],
      ["a".repeat(41), f.url, "."],
      ["A".repeat(40), f.url, "."],
      [`${"a".repeat(39)}g`, f.url, "."],
      [`${f.sha}\n`, f.url, "."],
      [` ${f.sha}`, f.url, "."],
      [`-${"a".repeat(39)}`, f.url, "."],
    ];
    if (forms.length !== 10) throw new Error(`forms_checked=${forms.length}`);
    const env = scriptEnv({ pathDir: bin });
    for (const form of forms) {
      const res = runMerged(form, { cwd: f.upload, env, fetchLog: log });
      if (res.status === 0) throw new Error(`the SHA form ${JSON.stringify(form[0] ?? "")} passed`);
      if (!res.merged.includes("GNU bash, version") || !res.merged.includes("git version")) {
        throw new Error(`the SHA form ${JSON.stringify(form[0] ?? "")} printed no version lines`);
      }
      assertNoFetch(res.fetchLines, `S-18 ${JSON.stringify(form[0] ?? "")}`);
    }
  });

  it("S-19 a commit that the origin does not hold fails", () => {
    requireScript();
    const f = basicFixture();
    const last = f.sha.slice(-1) === "a" ? "b" : "a";
    const missing = `${f.sha.slice(0, -1)}${last}`;
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([missing, f.url, "."], { cwd: f.upload, env: scriptEnv({ pathDir: bin }), fetchLog: log });
    assertNonZero(res, "S-19");
  });

  it("S-20 the version checks come before the first fetch", () => {
    requireScript();
    const scriptText = readFileSync(SCRIPT, "utf8");
    const firstFetch = scriptText.indexOf("fetch");
    if (firstFetch < 0) throw new Error("the script text holds no fetch");
    for (const token of ["bash --version", "git --version"]) {
      const index = scriptText.indexOf(token);
      if (index < 0) throw new Error(`the script text holds no ${JSON.stringify(token)}`);
      if (index > firstFetch) throw new Error(`${JSON.stringify(token)} runs after the first fetch`);
    }
    const f = basicFixture();
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runMerged(["REQUIRED_RELEASE_COMMIT_SHA", f.url, "."], {
      cwd: f.upload,
      env: scriptEnv({ pathDir: bin }),
      fetchLog: log,
    });
    const lines = res.merged.split("\n").filter((line) => line.trim() !== "");
    const last = lines[lines.length - 1] ?? "";
    const lastIndex = res.merged.lastIndexOf(last);
    for (const token of ["GNU bash, version", "git version"]) {
      const index = res.merged.indexOf(token);
      if (index < 0) throw new Error(`the run printed no ${JSON.stringify(token)}`);
      if (index > lastIndex) throw new Error(`${JSON.stringify(token)} printed after the last line`);
    }
  });

  it("S-21 a PATH without git fails and names git", () => {
    requireScript();
    const f = basicFixture();
    const copy = join(f.dir, "verify-traffic-source.sh");
    copyFileSync(SCRIPT, copy);
    const log = join(f.dir, "git.log");
    const bin = toolBin(f.dir, { omit: ["git"] });
    const res = runScript([f.sha, f.url, "."], {
      cwd: f.upload,
      file: copy,
      env: scriptEnv({ pathDir: bin, onlyPath: true }),
      fetchLog: log,
    });
    assertNonZero(res, "S-21");
    if (!res.stderr.includes("git")) throw new Error(`no message names git; stderr=${JSON.stringify(res.stderr)}`);
    if (res.stderr.includes("command not found")) {
      throw new Error(`the script left the message to bash: ${JSON.stringify(res.stderr)}`);
    }
    assertNoFetch(res.fetchLines, "S-21");
  });

  it("S-22 a PATH without bash fails and names bash", () => {
    requireScript();
    const f = basicFixture();
    const copy = join(f.dir, "verify-traffic-source.sh");
    copyFileSync(SCRIPT, copy);
    const log = join(f.dir, "git.log");
    gitWrapper(f.dir, log);
    const bin = toolBin(f.dir, { omit: ["bash", "git"] });
    const res = runScript([f.sha, f.url, "."], {
      cwd: f.upload,
      file: copy,
      env: scriptEnv({ pathDir: bin, onlyPath: true }),
      fetchLog: log,
    });
    assertNonZero(res, "S-22");
    if (!res.stderr.includes("bash")) throw new Error(`no message names bash; stderr=${JSON.stringify(res.stderr)}`);
    assertNoFetch(res.fetchLines, "S-22");
  });

  it("S-23 a sort stub that refuses -z stops the script before a fetch", () => {
    requireScript();
    const f = basicFixture();
    const realSort = which("sort");
    const log = join(f.dir, "git.log");
    gitWrapper(f.dir, log);
    const bin = toolBin(f.dir, {
      omit: ["git", "sort"],
      overrides: {
        sort: `#!/bin/bash\nfor arg in "$@"; do if [ "$arg" = "-z" ]; then exit 2; fi; done\nexec ${JSON.stringify(realSort)} "$@"\n`,
      },
    });
    const res = runScript([f.sha, f.url, "."], {
      cwd: f.upload,
      env: scriptEnv({ pathDir: bin, onlyPath: true }),
      fetchLog: log,
    });
    assertNonZero(res, "S-23");
    if (!res.stderr.includes("sort")) throw new Error(`no message names sort; stderr=${JSON.stringify(res.stderr)}`);
    assertNoFetch(res.fetchLines, "S-23");
  });

  it("S-24 a comm stub that refuses -z stops the script before a fetch", () => {
    requireScript();
    const f = basicFixture();
    const realComm = which("comm");
    const log = join(f.dir, "git.log");
    gitWrapper(f.dir, log);
    const bin = toolBin(f.dir, {
      omit: ["git", "comm"],
      overrides: {
        comm: `#!/bin/bash\nfor arg in "$@"; do if [ "$arg" = "-z" ]; then exit 2; fi; done\nexec ${JSON.stringify(realComm)} "$@"\n`,
      },
    });
    const res = runScript([f.sha, f.url, "."], {
      cwd: f.upload,
      env: scriptEnv({ pathDir: bin, onlyPath: true }),
      fetchLog: log,
    });
    assertNonZero(res, "S-24");
    if (!res.stderr.includes("comm")) throw new Error(`no message names comm; stderr=${JSON.stringify(res.stderr)}`);
    assertNoFetch(res.fetchLines, "S-24");
  });

  it("S-25 the script leaves TMPDIR empty", () => {
    requireScript();
    const tmp = scratch();
    const f = basicFixture();
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const env = scriptEnv({ pathDir: bin });
    env.TMPDIR = tmp;
    const pass = runScript([f.sha, f.url, "."], { cwd: f.upload, env, fetchLog: log });
    if (pass.status !== 0) throw new Error(`the pass run failed; stderr=${pass.stderr}`);
    const passLeft = readdirSync(tmp).length;
    if (passLeft !== 0) throw new Error(`tmpdir_left=${passLeft} after the pass run`);
    rmSync(join(f.upload, "README.md"), { force: true });
    const fail = runScript([f.sha, f.url, "."], { cwd: f.upload, env, fetchLog: log });
    if (fail.status === 0) throw new Error("the missing-file run passed");
    const failLeft = readdirSync(tmp).length;
    if (failLeft !== 0) throw new Error(`tmpdir_left=${failLeft} after the fail run`);
  });

  it("S-26 a CRLF file passes with core.autocrlf=true", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "crlf.txt", content: "one\r\ntwo\r\n" },
    ]);
    const config = join(f.dir, "gitconfig");
    writeFileSync(config, "[core]\n\tautocrlf = true\n");
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const env = scriptEnv({ pathDir: bin, extra: { GIT_CONFIG_GLOBAL: config } });
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env, fetchLog: log });
    if (res.status !== 0) throw new Error(`expected exit 0, got ${res.status}; stderr=${res.stderr}`);
  });

  it("S-27 neither the script nor the bind step holds a forbidden hash word", () => {
    requireScript();
    const scriptText = readFileSync(SCRIPT, "utf8");
    const { step, steps } = salesTraffic();
    if (!step) {
      throw new Error(`the bind step is absent from the sales traffic file; ids=${steps.map((candidate) => String(candidate?.id ?? "")).join(",")}`);
    }
    const hits = [...forbiddenHits(scriptText), ...forbiddenHits(stepText(step))];
    if (hits.length > 0) throw new Error(`forbidden hash tokens: ${hits.join(",")}`);
    if (forbiddenHits("printf 'ShA256Sum'").length === 0) {
      throw new Error("the forbidden-word control did not match");
    }
  });

  it("S-28 the bind step is step 0 with the exact block", () => {
    assertDisk();
    const doc = parseYamlText(readFileSync(TRAFFIC, "utf8"));
    const steps = Array.isArray(doc.steps) ? doc.steps : [];
    const ids = steps.map((candidate) => String(candidate?.id ?? ""));
    const step = steps.find((candidate) => String(candidate?.id ?? "") === "bind-release-source");
    if (!step) throw new Error(`the sales traffic file has no bind-release-source; ids=${ids.join(",")}`);
    if (ids[0] !== "bind-release-source") throw new Error(`step 0 is ${ids[0]}`);
    if (!(ids.indexOf("bind-release-source") < ids.indexOf("verify-curriculum-backup"))) {
      throw new Error("bind-release-source does not come before verify-curriculum-backup");
    }
    if (!(ids.indexOf("bind-release-source") < ids.indexOf("migrate-db"))) {
      throw new Error("bind-release-source does not come before migrate-db");
    }
    if (step.name !== "gcr.io/cloud-builders/git" || String(step.name).includes("@")) {
      throw new Error(`the image is ${JSON.stringify(step.name)}`);
    }
    if (step.entrypoint !== "bash") throw new Error(`the entrypoint is ${JSON.stringify(step.entrypoint)}`);
    const expectedArgs = [
      "scripts/ci/verify-traffic-source.sh",
      "$_RELEASE_COMMIT_SHA",
      "https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git",
      ".",
    ];
    if (JSON.stringify(step.args) !== JSON.stringify(expectedArgs)) {
      throw new Error(`the args are ${JSON.stringify(step.args)}`);
    }
    if (step.secretEnv !== undefined) throw new Error("the step holds secretEnv");
    if (step.env !== undefined) throw new Error("the step holds env");
    const substitutions = doc.substitutions ?? {};
    if (substitutions._RELEASE_COMMIT_SHA !== "REQUIRED_RELEASE_COMMIT_SHA") {
      throw new Error(`the substitution default is ${JSON.stringify(substitutions._RELEASE_COMMIT_SHA)}`);
    }
  });

  it("S-29 the bind step installs nothing and .gcloudignore keeps scripts/ci", () => {
    requireScript();
    const { step } = salesTraffic();
    if (!step) throw new Error("the bind step is absent from the sales traffic file");
    if (stepText(step).includes("apt-get")) throw new Error("the bind step holds apt-get");
    const dir = scratch();
    gitText(dir, ["init", "-q"]);
    const ignoreFile = join(dir, "gcloudignore");
    writeFileSync(ignoreFile, REAL_GCLOUDIGNORE);
    const check = spawnSync(
      "git",
      ["-c", `core.excludesFile=${ignoreFile}`, "check-ignore", "--no-index", "scripts/ci/verify-traffic-source.sh"],
      { cwd: dir, env: gitEnv(), encoding: "utf8" },
    );
    if (check.status !== 1) {
      throw new Error(`the .gcloudignore excludes scripts/ci (check-ignore exit ${check.status})`);
    }
    if (!existsSync(SCRIPT)) throw new Error("scripts/ci/verify-traffic-source.sh is absent");
  });

  it("S-30 the sales runbook section names the bind step", () => {
    assertDisk();
    const section = sectionText(readFileSync(RUNBOOK, "utf8"), "sales-advantage");
    if (section === "") throw new Error("the runbook has no sales-advantage section");
    if (!section.includes("bind-release-source")) {
      throw new Error("the sales runbook section does not name bind-release-source");
    }
  });

  it("S-30b the sales step list puts the bind step before the backup guard", () => {
    assertDisk();
    const section = sectionText(readFileSync(RUNBOOK, "utf8"), "sales-advantage");
    const marker = "Steps, in order:";
    const start = section.indexOf(marker);
    if (start < 0) throw new Error("the sales section has no `Steps, in order:` sentence");
    const rest = section.slice(start);
    const end = rest.indexOf("\n\n");
    const sentence = end < 0 ? rest : rest.slice(0, end);
    const bindIndex = sentence.indexOf("bind-release-source");
    const backupIndex = sentence.indexOf("verify-curriculum-backup");
    if (bindIndex < 0) throw new Error("the sales step list does not name bind-release-source");
    if (!(bindIndex < backupIndex)) {
      throw new Error("the sales step list puts bind-release-source after verify-curriculum-backup");
    }
  });

  it("S-31 the root .gcloudignore excludes the measure folder", () => {
    assertDisk();
    const text = rulesText();
    const line = text.split(/\r?\n/).find((candidate) => candidate.trim() === "measure/");
    if (!line) throw new Error("the root .gcloudignore holds no line measure/");
    const { dir, file } = ignoreScratch(text);
    const result = spawnSync(
      "git",
      ["-c", `core.excludesFile=${file}`, "check-ignore", "--no-index", "measure/tracks/x.md"],
      { cwd: dir, env: gitEnv(), encoding: "utf8" },
    );
    const printed = (result.stdout ?? "").split("\n").filter((value) => value !== "");
    if (result.status !== 0 || !printed.includes("measure/tracks/x.md")) {
      throw new Error(
        `check-ignore did not report measure/tracks/x.md (exit ${result.status}); stdout=${JSON.stringify(result.stdout)}`,
      );
    }
  });

  it("S-32 every tracked link is outside the upload scope", () => {
    assertDisk();
    const index = spawnSync("git", ["ls-files", "-s", "-z"], {
      cwd: ROOT,
      env: gitEnv(),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (index.status !== 0) throw new Error(`git ls-files failed: ${(index.stderr ?? "").trim()}`);
    const links = (index.stdout ?? "")
      .split("\0")
      .filter((record) => record !== "")
      .map((record) => {
        const tab = record.indexOf("\t");
        const mode = record.slice(0, tab).split(" ")[0];
        return { mode, path: record.slice(tab + 1) };
      })
      .filter((entry) => entry.mode === "120000")
      .map((entry) => entry.path);
    if (links.length < 1) throw new Error(`links_tracked=${links.length}: no tracked symbolic link`);
    const text = rulesText();
    const control = inScopePaths(text, ["scripts/ci/fake-link"]);
    if (!control.includes("scripts/ci/fake-link")) {
      throw new Error("the link control did not report scripts/ci/fake-link");
    }
    const kept = inScopePaths(text, links);
    if (kept.length !== 0) {
      throw new Error(`links_in_scope=${kept.length}; not excluded: ${kept.join(",")}`);
    }
  });

  it("S-33 ignored measure links and files match the upload", () => {
    requireScript();
    const rules = rulesWithMeasureLine(REAL_GCLOUDIGNORE);
    const main = fixture([
      { path: ".gcloudignore", content: rules },
      { path: "measure/tracks/old", link: "../archive/old" },
      { path: "measure/archive/old/plan.md", content: "# old plan\n" },
    ]);
    const mainLog = join(main.dir, "git.log");
    const mainBin = gitWrapper(main.dir, mainLog);
    const mainRes = runScript([main.sha, main.url, "."], {
      cwd: main.upload,
      env: scriptEnv({ pathDir: mainBin }),
      fetchLog: mainLog,
    });
    if (mainRes.status !== 0) {
      throw new Error(`the ignored measure paths failed the run; stderr=${mainRes.stderr}`);
    }
    const mainMissing = prefixedLines(`${mainRes.stdout}\n${mainRes.stderr}`, "missing");
    if (mainMissing.length > 0) {
      throw new Error(`the ignored measure paths printed ${mainMissing.join("; ")}`);
    }
    const controlRules = rulesWithoutMeasureLine(REAL_GCLOUDIGNORE);
    const control = fixture([
      { path: ".gcloudignore", content: controlRules },
      { path: "measure/tracks/old", link: "../archive/old" },
      { path: "measure/archive/old/plan.md", content: "# old plan\n" },
    ]);
    rmSync(join(control.upload, "measure/tracks/old"), { force: true });
    rmSync(join(control.upload, "measure/archive/old/plan.md"), { force: true });
    const controlLog = join(control.dir, "git.log");
    const controlBin = gitWrapper(control.dir, controlLog);
    const controlRes = runScript([control.sha, control.url, "."], {
      cwd: control.upload,
      env: scriptEnv({ pathDir: controlBin }),
      fetchLog: controlLog,
    });
    assertNonZero(controlRes, "S-33 control");
    assertStderrLine(controlRes.stderr, "missing: measure/archive/old/plan.md");
    assertStderrLine(controlRes.stderr, "missing: measure/tracks/old");
  });
});
