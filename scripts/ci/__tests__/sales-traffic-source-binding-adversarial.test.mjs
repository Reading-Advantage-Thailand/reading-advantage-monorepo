#!/usr/bin/env node
/**
 * Adversarial tests for Phase 1 of the track `sales_traffic_source_binding_20261108`.
 *
 * The cases are A-01 to A-07 of the adversarial round. They cover the gaps that the
 * 33 mutants of test-strategy section P1.5 exposed in the Red set:
 *
 *   A-01  the substitution placeholder as the first of three arguments fails before
 *         any Git use (mutant Y15).
 *   A-02  an empty commit as the first of three arguments fails before any Git use
 *         (mutant Y12).
 *   A-03  a regular file where the commit holds a submodule entry fails closed
 *         (mutant Y16).
 *   A-04  a repository URL that does not exist gives the Git failure code and not the
 *         "not in the repository" message (mutant Y23).
 *   A-05  a URL argument with a space exits non-zero (scenario 2 of P1.5).
 *   A-06  an upload root that is a symbolic link passes (scenario 3 of P1.5).
 *   A-07  an upload with an empty folder passes (scenario 4 of P1.5).
 *
 * Scenario 1 of P1.5 (a commit that starts with a dash) is covered by case S-18 of
 * `sales-traffic-source-binding.test.mjs`, which holds the form `-` plus 39 hex.
 *
 * Every fixture is a scratch Git repository with a `file://` origin. No case makes a
 * network call, a gcloud call, or a GitHub call. No case reads a path under `measure/`.
 *
 * Run with the adversarial command of test-strategy section P1.5.
 *
 * @module sales-traffic-source-binding-adversarial.test
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, it } from "vitest";

/** The repository root. */
const ROOT = fileURLToPath(new URL("../../..", import.meta.url)).replace(/\/$/, "");

/** The script under test. */
const SCRIPT = join(ROOT, "scripts", "ci", "verify-traffic-source.sh");

/** The real root `.gcloudignore` text. */
const REAL_GCLOUDIGNORE = readFileSync(join(ROOT, ".gcloudignore"), "utf8");

/** The base of every scratch folder. */
const SCRATCH_BASE = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();

/** The scratch folders of this run. */
const scratchDirs = new Set();

/**
 * Throw when a condition is false.
 *
 * @param {unknown} condition The condition.
 * @param {string} message The failure message.
 * @returns {void}
 * @throws {Error} When the condition is false.
 */
function must(condition, message) {
  if (!condition) throw new Error(message);
}

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
 * Return the absolute path of a tool on the host.
 *
 * @param {string} name The tool name.
 * @returns {string} The path, or an empty string.
 */
function which(name) {
  const result = spawnSync("bash", ["-lc", `command -v ${name}`], { encoding: "utf8" });
  return (result.stdout ?? "").trim();
}

/**
 * Run a git command in a folder.
 *
 * @param {string} cwd The working folder.
 * @param {string[]} args The git arguments.
 * @returns {string} The standard output.
 * @throws {Error} When git exits non-zero.
 */
function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, env: gitEnv(), encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  }
  return result.stdout ?? "";
}

/**
 * Make a scratch folder and remember it for the cleanup.
 *
 * @returns {string} The folder path.
 */
function scratch() {
  assertDisk();
  const dir = mkdtempSync(join(SCRATCH_BASE, "sales-adversarial.XXXXXX"));
  scratchDirs.add(dir);
  return dir;
}

/**
 * Build a scratch fixture: a bare origin, one commit, and an upload copy of the tree.
 *
 * @param {{ path: string, content?: string, link?: string, gitlink?: string }[]} entries The entries of the commit.
 * @returns {{ dir: string, bare: string, work: string, upload: string, url: string, sha: string }} The fixture.
 */
function makeFixture(entries) {
  const dir = scratch();
  const bare = join(dir, "origin.git");
  const work = join(dir, "work");
  const upload = join(dir, "upload");
  mkdirSync(work);
  mkdirSync(upload);
  git(dir, ["init", "--bare", "-q", bare]);
  git(bare, ["config", "uploadpack.allowFilter", "true"]);
  git(bare, ["config", "uploadpack.allowAnySHA1InWant", "true"]);
  git(work, ["init", "-q", "-b", "master"]);
  git(work, ["config", "user.name", "Measure Adversarial"]);
  git(work, ["config", "user.email", "measure-adversarial@example.invalid"]);
  git(work, ["config", "commit.gpgsign", "false"]);
  for (const entry of entries) {
    if (entry.gitlink !== undefined) continue;
    const target = join(work, entry.path);
    mkdirSync(dirname(target), { recursive: true });
    if (entry.link !== undefined) symlinkSync(entry.link, target);
    else writeFileSync(target, entry.content ?? "");
  }
  git(work, ["add", "-A"]);
  for (const entry of entries) {
    if (entry.gitlink !== undefined) {
      git(work, ["update-index", "--add", "--cacheinfo", `160000,${entry.gitlink},${entry.path}`]);
    }
  }
  git(work, ["commit", "-q", "-m", "adversarial fixture"]);
  const sha = git(work, ["rev-parse", "HEAD"]).trim();
  git(work, ["push", "-q", bare, "HEAD:refs/heads/master"]);
  spawnSync("cp", ["-a", `${work}/.`, upload], { encoding: "utf8" });
  rmSync(join(upload, ".git"), { recursive: true, force: true });
  return { dir, bare, work, upload, url: `file://${bare}`, sha };
}

/**
 * Build a basic fixture: the real `.gcloudignore` and one in-scope file.
 *
 * @returns {{ dir: string, bare: string, work: string, upload: string, url: string, sha: string }} The fixture.
 */
function basicFixture() {
  return makeFixture([
    { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
    { path: "README.md", content: "# fixture\n" },
  ]);
}

/**
 * Write the logging `git` wrapper into a binary folder.
 *
 * @param {string} dir The scratch folder.
 * @param {string} logFile The log file.
 * @returns {string} The binary folder.
 * @throws {Error} When the test host has no git.
 */
function gitWrapper(dir, logFile) {
  const realGit = which("git");
  if (realGit === "") throw new Error("the test host has no git");
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  const file = join(bin, "git");
  writeFileSync(
    file,
    `#!/bin/bash\nprintf '%s\\n' "$*" >> ${JSON.stringify(logFile)}\nexec ${JSON.stringify(realGit)} "$@"\n`,
  );
  chmodSync(file, 0o755);
  return bin;
}

/**
 * Build the environment of one script run.
 *
 * @param {string} pathDir The PATH folder with the git wrapper.
 * @returns {Record<string, string | undefined>} The environment.
 */
function scriptEnv(pathDir) {
  const env = gitEnv();
  env.PATH = `${pathDir}:${process.env.PATH ?? ""}`;
  return env;
}

/**
 * Run the script with separate streams.
 *
 * @param {string[]} args The script arguments.
 * @param {{ cwd?: string, env?: Record<string, string | undefined> }} [options] The run options.
 * @returns {{ status: number | null, stdout: string, stderr: string }} The result.
 */
function runScript(args, options = {}) {
  const result = spawnSync("/bin/bash", [SCRIPT, ...args], {
    cwd: options.cwd,
    env: options.env ?? gitEnv(),
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * Return the log lines of a git wrapper.
 *
 * @param {string} logFile The log file.
 * @returns {string[]} The lines.
 */
function logLines(logFile) {
  if (!existsSync(logFile)) return [];
  return readFileSync(logFile, "utf8").split("\n").filter((line) => line !== "");
}

/**
 * Read the lines of standard error that start with a prefix.
 *
 * @param {string} stderr The stream.
 * @param {string} prefix The line prefix.
 * @returns {string[]} The lines.
 */
function prefixed(stderr, prefix) {
  return stderr.split("\n").filter((line) => line.startsWith(`${prefix}: `));
}

describe("A: adversarial cases of the sales traffic source binding", () => {
  it("A-01 the substitution placeholder as the commit fails before any Git use", () => {
    const f = basicFixture();
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript(["REQUIRED_RELEASE_COMMIT_SHA", f.url, "."], {
      cwd: f.upload,
      env: scriptEnv(bin),
    });
    must(res.status !== 0, `the placeholder commit passed; stderr=${JSON.stringify(res.stderr)}`);
    const used = logLines(log).filter((line) => line.startsWith("fetch") || line.startsWith("init"));
    must(used.length === 0, `the placeholder commit started a git command: ${used.join("; ")}`);
  });

  it("A-02 an empty commit argument fails before any Git use", () => {
    const f = basicFixture();
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript(["", f.url, "."], { cwd: f.upload, env: scriptEnv(bin) });
    must(res.status !== 0, `the empty commit passed; stderr=${JSON.stringify(res.stderr)}`);
    const used = logLines(log).filter((line) => line.startsWith("fetch") || line.startsWith("init"));
    must(used.length === 0, `the empty commit started a git command: ${used.join("; ")}`);
  });

  it("A-03 a regular file where the commit holds a submodule entry fails closed", () => {
    const f = makeFixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "README.md", content: "# fixture\n" },
      { path: "vendor/sub", gitlink: "1".repeat(40) },
    ]);
    mkdirSync(join(f.upload, "vendor"), { recursive: true });
    writeFileSync(join(f.upload, "vendor", "sub"), "a file, not a submodule\n");
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: gitEnv() });
    must(res.status !== 0, `a file over a submodule passed; stderr=${JSON.stringify(res.stderr)}`);
    const lines = prefixed(res.stderr, "submodule");
    must(lines.includes("submodule: vendor/sub"), `expected the submodule line; got ${JSON.stringify(res.stderr)}`);
  });

  it("A-04 a repository URL that does not exist gives the Git failure code", () => {
    const f = basicFixture();
    const missing = join(f.dir, "no-such-origin.git");
    const res = runScript([f.sha, `file://${missing}`, "."], { cwd: f.upload, env: gitEnv() });
    must(res.status !== 0, `a missing repository passed; stderr=${JSON.stringify(res.stderr)}`);
    must(
      res.status !== 1,
      `a failed fetch gave exit 1, not the Git failure code; stderr=${JSON.stringify(res.stderr)}`,
    );
    must(
      !res.stderr.includes("the commit is not in the repository"),
      `a failed fetch gave the commit message; stderr=${JSON.stringify(res.stderr)}`,
    );
  });

  it("A-05 a URL argument with a space exits non-zero", () => {
    const f = basicFixture();
    const res = runScript([f.sha, `${f.url} x`, "."], { cwd: f.upload, env: gitEnv() });
    must(res.status !== 0, `a URL with a space passed; stdout=${JSON.stringify(res.stdout)}`);
  });

  it("A-06 an upload root that is a symbolic link passes", () => {
    const f = basicFixture();
    const linkRoot = join(f.dir, "upload-link");
    symlinkSync(f.upload, linkRoot);
    const res = runScript([f.sha, f.url, linkRoot], { cwd: f.dir, env: gitEnv() });
    must(res.status === 0, `a link upload root failed with ${res.status}; stderr=${JSON.stringify(res.stderr)}`);
    must(
      res.stdout.includes("the upload matches commit"),
      `a link upload root printed no match line; stdout=${JSON.stringify(res.stdout)}`,
    );
  });

  it("A-07 an upload with an empty folder passes", () => {
    const f = basicFixture();
    mkdirSync(join(f.upload, "empty-dir"), { recursive: true });
    const res = runScript([f.sha, f.url, "."], { cwd: f.upload, env: gitEnv() });
    must(res.status === 0, `an empty folder stopped the run with ${res.status}; stderr=${JSON.stringify(res.stderr)}`);
    const missing = prefixed(res.stderr, "missing");
    must(missing.length === 0, `an empty folder printed ${missing.join("; ")}`);
  });
});

afterAll(() => {
  for (const dir of scratchDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs.clear();
});
