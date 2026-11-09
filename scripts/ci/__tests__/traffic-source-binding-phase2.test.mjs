#!/usr/bin/env node
/**
 * Red tests for Phase 2 of the track `sales_traffic_source_binding_20261108`.
 *
 * The cases are T-01 to T-08 and T-20 to T-25 of
 * `measure/tracks/sales_traffic_source_binding_20261108/test-strategy.md` section P2.4.
 * Cases T-01 to T-08 read the five traffic files and the runbook, and run the script
 * `scripts/ci/verify-traffic-source.sh` on a scratch Git fixture. Cases T-20 to T-25 read
 * the script text and run the ancestor check on a scratch Git fixture with a fork-only
 * commit on `refs/pull/7/head`. No test reads a path under `measure/`.
 *
 * The fixture builder and the script runner live in this file (default D11). Every fixture
 * is a scratch Git repository under the temporary folder, with a bare `file://` origin.
 *
 * Run with the Red command of test-strategy section P2.3:
 * `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`.
 *
 * @module traffic-source-binding-phase2.test
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
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
import { parse as parseYamlText } from "yaml";
import { sectionText, stepIds, stepText } from "./helpers/plan.mjs";
import { gitEnv } from "./helpers/scratch.mjs";

/** The repository root. */
const ROOT = fileURLToPath(new URL("../../..", import.meta.url)).replace(/\/$/, "");

/** The script under test. */
const SCRIPT = join(ROOT, "scripts", "ci", "verify-traffic-source.sh");

/** The traffic runbook. */
const RUNBOOK = join(ROOT, "docs", "runbooks", "traffic-moves.md");

/** The GitHub URL that every bind step passes. */
const GITHUB_URL = "https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git";

/** The four arguments of the bind step (spec section 3a-1). */
const BIND_ARGS = ["scripts/ci/verify-traffic-source.sh", "$_RELEASE_COMMIT_SHA", GITHUB_URL, "."];

/** The default value of the `_RELEASE_COMMIT_SHA` substitution. */
const REQUIRED_SHA = "REQUIRED_RELEASE_COMMIT_SHA";

/** The real root `.gcloudignore` text. */
const REAL_GCLOUDIGNORE = readFileSync(join(ROOT, ".gcloudignore"), "utf8");

/** The base of every scratch folder. */
const SCRATCH_BASE = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();

/** The scratch folders of this run. */
const scratchDirs = new Set();

/** The home folder of the hermetic git calls. */
let scratchHome = "";

/** The five Phase 2 apps, their traffic files, and their first source-reading step. */
const APPS = [
  {
    name: "accounts",
    file: join(ROOT, "apps", "accounts", "cloudbuild-traffic.yaml"),
    firstSourceStep: "migrate-company-identity",
  },
  {
    name: "accounting",
    file: join(ROOT, "apps", "accounting", "cloudbuild-traffic.yaml"),
    firstSourceStep: "migrate-db",
  },
  {
    name: "codecamp-advantage",
    file: join(ROOT, "apps", "codecamp-advantage", "cloudbuild-traffic.yaml"),
    firstSourceStep: "migrate-db",
  },
  {
    name: "marketing",
    file: join(ROOT, "apps", "marketing", "cloudbuild-traffic.yaml"),
    firstSourceStep: "migrate-db",
  },
  {
    name: "primary-advantage",
    file: join(ROOT, "apps", "primary-advantage", "cloudbuild-traffic.yaml"),
    firstSourceStep: "refuse-legacy-db",
  },
];

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

/**
 * Create a scratch folder with the prefix `traffic-bind-p2-`.
 *
 * @returns {string} The folder path.
 */
function scratch() {
  const dir = mkdtempSync(join(SCRATCH_BASE, "traffic-bind-p2-"));
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

afterAll(() => {
  removeScratch();
});

/**
 * Get the home folder of the hermetic git calls and create it once.
 *
 * @returns {string} The home folder path.
 */
function home() {
  if (scratchHome === "") scratchHome = scratch();
  return scratchHome;
}

/**
 * Build the environment of a hermetic git call.
 *
 * @returns {Record<string, string | undefined>} The environment.
 */
function env() {
  return gitEnv(home());
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
 * Require the script under test and the disk guard.
 *
 * Every script case starts with this check, so a missing script fails the case instead of
 * making a negative case pass (anti-pattern A4).
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
 * Run a git command and return its text output.
 *
 * @param {string} cwd The working folder.
 * @param {string[]} args The git arguments.
 * @returns {string} The standard output.
 * @throws {Error} When git exits non-zero.
 */
function gitText(cwd, args) {
  const result = spawnSync("git", args, { cwd, env: env(), encoding: "utf8" });
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
  const result = spawnSync("git", args, { cwd, env: env(), encoding: "buffer" });
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
 * @param {{ path: string, content?: string, link?: string }} entry The entry.
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
}

/**
 * Build the expected upload of a commit.
 *
 * The upload holds the in-scope entries of the commit, with the same bytes and links. The
 * scope follows the `.gcloudignore` of the commit, through `git check-ignore --no-index`.
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
    env: env(),
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
      { cwd: work, env: env(), encoding: "utf8", input },
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
 * Initialise a work clone of a bare fixture repository.
 *
 * @param {string} dir The scratch folder.
 * @returns {{ bare: string, work: string, url: string }} The repository paths and URL.
 */
function bareFixture(dir) {
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
  return { bare, work, url: `file://${bare}` };
}

/**
 * Build a scratch repository with one commit and its upload.
 *
 * @param {{ path: string, content?: string, link?: string }[]} entries The entries of the commit.
 * @returns {{ dir: string, bare: string, url: string, sha: string, upload: string }} The fixture.
 */
function fixture(entries) {
  const dir = scratch();
  const { bare, work, url } = bareFixture(dir);
  for (const entry of entries) writeEntry(work, entry);
  gitText(work, ["add", "-A"]);
  gitText(work, ["commit", "-q", "-m", "fixture"]);
  const sha = gitText(work, ["rev-parse", "HEAD"]).trim();
  gitText(work, ["push", "-q", bare, "HEAD:refs/heads/master"]);
  const upload = join(dir, "upload");
  writeUpload(work, sha, upload);
  return { dir, bare, url, sha, upload };
}

/**
 * Build the basic fixture of the step-command rows. Its commit holds the script and the
 * root `.gcloudignore`, so the upload can run the step command (criterion 18).
 *
 * @returns {{ dir: string, bare: string, url: string, sha: string, upload: string }} The fixture.
 */
function stepFixture() {
  return fixture([
    { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
    { path: "scripts/ci/verify-traffic-source.sh", content: readFileSync(SCRIPT, "utf8") },
    { path: "README.md", content: "# fixture\n" },
  ]);
}

/**
 * Build the ancestor fixture of section 8.5.
 *
 * `master` holds an older commit and a newer tip. A third commit starts from the older
 * commit and goes to `refs/pull/7/head`. The fork-only commit is not an ancestor of `master`.
 *
 * @returns {{
 *   dir: string,
 *   url: string,
 *   older: string,
 *   tip: string,
 *   fork: string,
 *   uploads: { older: string, tip: string, fork: string },
 * }} The fixture.
 */
function ancestorFixture() {
  const dir = scratch();
  const { bare, work, url } = bareFixture(dir);
  writeEntry(work, { path: ".gcloudignore", content: REAL_GCLOUDIGNORE });
  writeEntry(work, { path: "scripts/ci/verify-traffic-source.sh", content: readFileSync(SCRIPT, "utf8") });
  writeEntry(work, { path: "README.md", content: "# older\n" });
  gitText(work, ["add", "-A"]);
  gitText(work, ["commit", "-q", "-m", "older"]);
  const older = gitText(work, ["rev-parse", "HEAD"]).trim();

  writeFileSync(join(work, "README.md"), "# newer\n");
  gitText(work, ["add", "-A"]);
  gitText(work, ["commit", "-q", "-m", "newer"]);
  const tip = gitText(work, ["rev-parse", "HEAD"]).trim();

  gitText(work, ["checkout", "-q", "-b", "fork", older]);
  writeEntry(work, { path: "fork.txt", content: "fork only\n" });
  gitText(work, ["add", "-A"]);
  gitText(work, ["commit", "-q", "-m", "fork"]);
  const fork = gitText(work, ["rev-parse", "HEAD"]).trim();

  gitText(work, ["push", "-q", bare, "refs/heads/master:refs/heads/master"]);
  gitText(work, ["push", "-q", bare, "refs/heads/fork:refs/pull/7/head"]);

  const uploads = {
    older: join(dir, "upload-older"),
    tip: join(dir, "upload-tip"),
    fork: join(dir, "upload-fork"),
  };
  writeUpload(work, older, uploads.older);
  writeUpload(work, tip, uploads.tip);
  writeUpload(work, fork, uploads.fork);
  return { dir, url, older, tip, fork, uploads };
}

/**
 * Write the logging `git` wrapper into a binary folder.
 *
 * The wrapper writes its arguments to a log file and then runs the real git by absolute
 * path (default D2).
 *
 * @param {string} dir The scratch folder.
 * @param {string} logFile The log file.
 * @returns {string} The binary folder.
 */
function gitWrapper(dir, logFile) {
  const bin = join(dir, `bin-${scratchDirs.size}`);
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
 * Write the forced-exit `git` wrapper into a binary folder (default D16).
 *
 * The wrapper logs its arguments, runs the real git for every call except
 * `merge-base --is-ancestor`, and exits with the named code for that call.
 *
 * @param {string} dir The scratch folder.
 * @param {string} logFile The log file.
 * @param {number} code The exit code of the forced call.
 * @returns {string} The binary folder.
 */
function forcedGit(dir, logFile, code) {
  const bin = join(dir, `bin-forced-${code}-${scratchDirs.size}`);
  mkdirSync(bin, { recursive: true });
  const realGit = which("git");
  if (realGit === "") throw new Error("the test host has no git");
  const file = join(bin, "git");
  writeFileSync(
    file,
    [
      "#!/bin/bash",
      `printf '%s\\n' "$*" >> ${JSON.stringify(logFile)}`,
      'prev=""',
      'for a in "$@"; do',
      '  if [ "$prev" = "merge-base" ] && [ "$a" = "--is-ancestor" ]; then',
      `    exit ${code}`,
      "  fi",
      '  prev="$a"',
      "done",
      `exec ${JSON.stringify(realGit)} "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(file, 0o755);
  return bin;
}

/**
 * Build the environment of one script run.
 *
 * @param {{ pathDir?: string, extra?: Record<string, string | undefined> }} [options] The PATH folder and extra values.
 * @returns {Record<string, string | undefined>} The environment.
 */
function scriptEnv(options = {}) {
  const base = env();
  base.GIT_ALLOW_PROTOCOL = "file";
  base.GIT_TERMINAL_PROMPT = "0";
  if (options.pathDir) base.PATH = `${options.pathDir}:${process.env.PATH ?? ""}`;
  return Object.assign(base, options.extra ?? {});
}

/**
 * Read the lines of a git log.
 *
 * @param {string | undefined} path The log file.
 * @returns {string[]} The lines.
 */
function logLines(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter((line) => line !== "");
}

/**
 * Run the script with separate streams.
 *
 * @param {string[]} args The script arguments.
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, logFile?: string }} [options] The run options.
 * @returns {{ status: number | null, stdout: string, stderr: string, logLines: string[] }} The result.
 */
function runScript(args, options = {}) {
  const result = spawnSync("/bin/bash", [SCRIPT, ...args], {
    cwd: options.cwd,
    env: options.env ?? scriptEnv(),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    logLines: logLines(options.logFile),
  };
}

/**
 * Run a bind step command with the SHA and URL replaced by fixture values.
 *
 * @param {string[]} args The step arguments.
 * @param {string} sha The fixture commit.
 * @param {string} url The fixture URL.
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, logFile?: string }} [options] The run options.
 * @returns {{ status: number | null, stdout: string, stderr: string, logLines: string[] }} The result.
 */
function runStep(args, sha, url, options = {}) {
  const resolved = args.map((value) =>
    String(value).replaceAll("$_RELEASE_COMMIT_SHA", sha).replaceAll(GITHUB_URL, url),
  );
  const result = spawnSync("/bin/bash", resolved, {
    cwd: options.cwd,
    env: options.env ?? scriptEnv(),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    logLines: logLines(options.logFile),
  };
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
 * Throw when a pass run printed an anchor line.
 *
 * @param {string} stream The standard output and standard error of the run.
 * @param {string} label The check name.
 * @returns {void}
 * @throws {Error} When the stream holds a `missing:`, `extra:`, or `differs:` line.
 */
function assertNoAnchorLine(stream, label) {
  for (const prefix of ["missing", "extra", "differs"]) {
    const lines = prefixedLines(stream, prefix);
    if (lines.length > 0) throw new Error(`${label}: the run printed ${lines.join("; ")}`);
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
 * Parse a traffic file.
 *
 * @param {string} file The absolute path.
 * @returns {Record<string, unknown>} The parsed file.
 */
function readTraffic(file) {
  return parseYamlText(readFileSync(file, "utf8"));
}

/**
 * Get the bind step of a traffic file.
 *
 * @param {Record<string, unknown>} doc The parsed file.
 * @returns {Record<string, unknown> | undefined} The step, or undefined.
 */
function bindStep(doc) {
  const steps = Array.isArray(doc.steps) ? doc.steps : [];
  return steps.find((step) => String(step?.id ?? "") === "bind-release-source");
}

/**
 * Get the arguments of the bind step of a traffic file.
 *
 * @param {{ name: string, file: string }} app The app.
 * @param {Record<string, unknown>} doc The parsed file.
 * @returns {string[]} The arguments.
 * @throws {Error} When the step or its arguments are absent.
 */
function bindArgs(app, doc) {
  const step = bindStep(doc);
  if (!step) {
    const ids = stepIds(doc).join(", ");
    throw new Error(`${app.name}: the file has no bind-release-source step; steps=${ids}`);
  }
  if (!Array.isArray(step.args)) {
    throw new Error(`${app.name}: the bind-release-source step has no args`);
  }
  return step.args.map((value) => String(value));
}

/**
 * Throw when an argument list is not the exact block of spec section 3a-1.
 *
 * @param {string[]} args The step arguments.
 * @param {string} label The check name.
 * @returns {void}
 * @throws {Error} When an item differs.
 */
function assertBindArgs(args, label) {
  if (args.length !== BIND_ARGS.length) {
    throw new Error(`${label}: the args hold ${args.length} items, not ${BIND_ARGS.length}: ${JSON.stringify(args)}`);
  }
  for (let index = 0; index < BIND_ARGS.length; index += 1) {
    if (args[index] !== BIND_ARGS[index]) {
      throw new Error(
        `${label}: args[${index}] is ${JSON.stringify(args[index])}, not ${JSON.stringify(BIND_ARGS[index])}`,
      );
    }
  }
}

/**
 * Copy an upload folder into a fresh scratch folder.
 *
 * @param {string} upload The source upload.
 * @returns {string} The copy.
 */
function copyUpload(upload) {
  const dir = join(scratch(), "upload-copy");
  cpSync(upload, dir, { recursive: true });
  return dir;
}

/**
 * Find the index of a needle or throw.
 *
 * @param {string} text The text.
 * @param {string} needle The needle.
 * @param {string} label The check name.
 * @returns {number} The index.
 * @throws {Error} When the needle is absent.
 */
function indexOfOrFail(text, needle, label) {
  const index = text.indexOf(needle);
  if (index < 0) throw new Error(`${label}: the script text lacks ${JSON.stringify(needle)}`);
  return index;
}

/**
 * Build the section 8.6 line with a filled SHA.
 *
 * @param {string} sha The release commit.
 * @returns {string} The line.
 */
function section86(sha) {
  return `verify-traffic-source: the release commit ${sha} is not on the upstream master; merge it into master first, then start the traffic run from a commit on master`;
}

/**
 * Build the section 8.7 line with a filled exit code.
 *
 * @param {number} code The git exit code.
 * @returns {string} The line.
 */
function section87(code) {
  return `verify-traffic-source: the ancestor check failed (git exit ${code}); the run stops`;
}

describe("T: phase 2 traffic source binding", () => {
  it("T-01 bind-release-source is step 1 and comes before the first source step", () => {
    for (const app of APPS) {
      const doc = readTraffic(app.file);
      const ids = stepIds(doc);
      if (ids[0] !== "bind-release-source") {
        throw new Error(`${app.name}: step 1 is ${JSON.stringify(ids[0])}; steps=${ids.join(", ")}`);
      }
      const sourceIndex = ids.indexOf(app.firstSourceStep);
      if (sourceIndex < 0) {
        throw new Error(`${app.name}: the file has no first source step ${app.firstSourceStep}`);
      }
      if (sourceIndex <= 0) {
        throw new Error(`${app.name}: ${app.firstSourceStep} is at or above the bind step`);
      }
    }
  });

  it("T-02 the bind args are the exact block and a differing upload fails", () => {
    requireScript();
    const f = stepFixture();
    for (const app of APPS) {
      const args = bindArgs(app, readTraffic(app.file));
      assertBindArgs(args, `T-02 ${app.name}`);
      const copy = copyUpload(f.upload);
      writeFileSync(join(copy, "README.md"), "# changed\n");
      const res = runStep(args, f.sha, f.url, { cwd: copy });
      assertNonZero(res, `T-02 ${app.name}`);
      const differs = prefixedLines(res.stderr, "differs");
      if (differs.length !== 1 || differs[0] !== "differs: README.md") {
        throw new Error(`T-02 ${app.name}: expected "differs: README.md"; stderr=${JSON.stringify(res.stderr)}`);
      }
    }
  });

  it("T-03 a matching upload passes for each of the five step commands", () => {
    requireScript();
    const f = stepFixture();
    for (const app of APPS) {
      const args = bindArgs(app, readTraffic(app.file));
      assertBindArgs(args, `T-03 ${app.name}`);
      const res = runStep(args, f.sha, f.url, { cwd: f.upload });
      if (res.status !== 0) {
        throw new Error(`T-03 ${app.name}: expected exit 0, got ${res.status}; stderr=${res.stderr}`);
      }
      assertNoAnchorLine(`${res.stdout}\n${res.stderr}`, `T-03 ${app.name}`);
    }
  });

  it("T-04 each file holds the REQUIRED substitution and a malformed SHA fails before a fetch", () => {
    requireScript();
    const f = stepFixture();
    const malformed = ["", REQUIRED_SHA, "abc123", "A".repeat(40)];
    for (const app of APPS) {
      const doc = readTraffic(app.file);
      const substitutions =
        doc.substitutions && typeof doc.substitutions === "object" ? doc.substitutions : {};
      if (substitutions._RELEASE_COMMIT_SHA !== REQUIRED_SHA) {
        throw new Error(
          `T-04 ${app.name}: _RELEASE_COMMIT_SHA is ${JSON.stringify(substitutions._RELEASE_COMMIT_SHA)}`,
        );
      }
      const args = bindArgs(app, doc);
      assertBindArgs(args, `T-04 ${app.name}`);
      for (const sha of malformed) {
        const log = join(f.dir, `git-${app.name}-${scratchDirs.size}.log`);
        const bin = gitWrapper(f.dir, log);
        const res = runStep(args, sha, f.url, {
          cwd: f.upload,
          env: scriptEnv({ pathDir: bin }),
          logFile: log,
        });
        assertNonZero(res, `T-04 ${app.name} sha=${JSON.stringify(sha)}`);
        const fetches = res.logLines.filter((line) => line === "fetch" || line.startsWith("fetch "));
        if (fetches.length > 0) {
          throw new Error(`T-04 ${app.name} sha=${JSON.stringify(sha)}: the script fetched: ${fetches.join("; ")}`);
        }
      }
    }
  });

  it("T-05 each runbook section names the step and the substitution", () => {
    const text = readFileSync(RUNBOOK, "utf8");
    for (const app of APPS) {
      const section = sectionText(text, app.name);
      if (section === "") throw new Error(`T-05 ${app.name}: the runbook has no section`);
      if (!section.includes("bind-release-source")) {
        throw new Error(`T-05 ${app.name}: the section does not name bind-release-source`);
      }
      if (!section.includes("_RELEASE_COMMIT_SHA")) {
        throw new Error(`T-05 ${app.name}: the section does not name _RELEASE_COMMIT_SHA`);
      }
    }
  });

  it("T-06 the bind step holds no forbidden word and uses the FR-11 image", () => {
    for (const app of APPS) {
      const doc = readTraffic(app.file);
      const step = bindStep(doc);
      if (!step) throw new Error(`T-06 ${app.name}: the file has no bind-release-source step`);
      const text = stepText(step);
      const hits = forbiddenHits(text);
      if (hits.length > 0) {
        throw new Error(`T-06 ${app.name}: the step holds ${hits.join(", ")}`);
      }
      const name = String(step.name ?? "");
      if (name !== "gcr.io/cloud-builders/git" || name.includes("@")) {
        throw new Error(`T-06 ${app.name}: the image is ${JSON.stringify(name)}`);
      }
      if (String(step.entrypoint ?? "") !== "bash") {
        throw new Error(`T-06 ${app.name}: the entrypoint is ${JSON.stringify(step.entrypoint)}`);
      }
      if (text.includes("apt-get")) throw new Error(`T-06 ${app.name}: the step holds apt-get`);
      if (text.includes("gcloud")) throw new Error(`T-06 ${app.name}: the step holds gcloud`);
    }
  });

  it("T-07 the Primary step ids are exact and the bind step holds no gcloud command", () => {
    const app = APPS.find((candidate) => candidate.name === "primary-advantage");
    const doc = readTraffic(app.file);
    const expected = [
      "bind-release-source",
      "refuse-legacy-db",
      "migrate-db",
      "doctor-check",
      "update-traffic",
    ];
    const ids = stepIds(doc);
    if (ids.length !== expected.length || ids.some((id, index) => id !== expected[index])) {
      throw new Error(`T-07: the ids are ${ids.join(", ")}`);
    }
    const step = bindStep(doc);
    if (!step) throw new Error("T-07: the file has no bind-release-source step");
    if (stepText(step).includes("gcloud")) {
      throw new Error("T-07: the bind step holds a gcloud command");
    }
  });

  it("T-08 an upload that lacks one file fails for each of the five step commands", () => {
    requireScript();
    const f = stepFixture();
    for (const app of APPS) {
      const args = bindArgs(app, readTraffic(app.file));
      assertBindArgs(args, `T-08 ${app.name}`);
      const copy = copyUpload(f.upload);
      rmSync(join(copy, "README.md"));
      const res = runStep(args, f.sha, f.url, { cwd: copy });
      assertNonZero(res, `T-08 ${app.name}`);
      const missing = prefixedLines(res.stderr, "missing");
      if (missing.length !== 1 || missing[0] !== "missing: README.md") {
        throw new Error(`T-08 ${app.name}: expected "missing: README.md"; stderr=${JSON.stringify(res.stderr)}`);
      }
    }
  });

  it("T-20 the script runs cat-file then merge-base then the two lists", () => {
    requireScript();
    const text = readFileSync(SCRIPT, "utf8");
    const catFile = indexOfOrFail(text, "cat-file -e", "T-20");
    const catLine = text.slice(catFile, text.indexOf("\n", catFile));
    if (!catLine.includes("^{commit}")) {
      throw new Error(`T-20: the cat-file line does not name ^{commit}: ${JSON.stringify(catLine)}`);
    }
    const mergeBase = indexOfOrFail(text, "merge-base --is-ancestor", "T-20");
    const mergeLine = text
      .split("\n")
      .find((line) => line.includes("merge-base --is-ancestor"));
    if (!/merge-base --is-ancestor\b.*\bFETCH_HEAD\b/.test(mergeLine ?? "")) {
      throw new Error(`T-20: the merge-base line does not use FETCH_HEAD: ${JSON.stringify(mergeLine)}`);
    }
    const tree = indexOfOrFail(text, "ls-tree -r -z", "T-20");
    const ignore = indexOfOrFail(text, "check-ignore", "T-20");
    if (!(catFile < mergeBase)) throw new Error("T-20: cat-file is not before merge-base");
    if (!(mergeBase < tree)) throw new Error("T-20: merge-base is not before the tree list");
    if (!(mergeBase < ignore)) throw new Error("T-20: merge-base is not before check-ignore");
  });

  it("T-21 the run fetches origin master once, without depth, then checks FETCH_HEAD", () => {
    requireScript();
    const f = fixture([
      { path: ".gcloudignore", content: REAL_GCLOUDIGNORE },
      { path: "README.md", content: "# fixture\n" },
    ]);
    const log = join(f.dir, "git.log");
    const bin = gitWrapper(f.dir, log);
    const res = runScript([f.sha, f.url, "."], {
      cwd: f.upload,
      env: scriptEnv({ pathDir: bin }),
      logFile: log,
    });
    if (res.status !== 0) {
      throw new Error(`T-21: the control run exited ${res.status}; stderr=${res.stderr}`);
    }
    const fetches = res.logLines.filter((line) => line === "fetch" || line.startsWith("fetch "));
    if (fetches.length !== 1) {
      throw new Error(`T-21: expected one fetch, got ${fetches.length}: ${fetches.join("; ")}`);
    }
    if (!/\borigin\s+master\b/.test(fetches[0])) {
      throw new Error(`T-21: the fetch does not name origin master: ${JSON.stringify(fetches[0])}`);
    }
    if (fetches[0].includes("--depth")) {
      throw new Error(`T-21: the fetch holds --depth: ${JSON.stringify(fetches[0])}`);
    }
    if (fetches[0].includes(f.sha)) {
      throw new Error(`T-21: the fetch names the release commit: ${JSON.stringify(fetches[0])}`);
    }
    if (!res.logLines.some((line) => /merge-base --is-ancestor\b.*\bFETCH_HEAD\b/.test(line))) {
      throw new Error("T-21: the log holds no merge-base --is-ancestor line with FETCH_HEAD");
    }
  });

  it("T-22 the fork-only commit stops with the section 8.6 line and no anchor line", () => {
    requireScript();
    const f = ancestorFixture();
    const res = runScript([f.fork, f.url, "."], { cwd: f.uploads.fork });
    if (res.status !== 1) {
      throw new Error(`T-22: expected exit 1, got ${res.status}; stderr=${JSON.stringify(res.stderr)}`);
    }
    assertStderrLine(res.stderr, section86(f.fork));
    assertNoAnchorLine(`${res.stdout}\n${res.stderr}`, "T-22");
    const control = runScript([f.tip, f.url, "."], { cwd: f.uploads.tip });
    if (control.status !== 0) {
      throw new Error(`T-22 control: the tip exited ${control.status}; stderr=${control.stderr}`);
    }
    assertNoAnchorLine(`${control.stdout}\n${control.stderr}`, "T-22 control");
  });

  it("T-23 an old non-tip master commit passes with a matching upload", () => {
    requireScript();
    const f = ancestorFixture();
    const res = runScript([f.older, f.url, "."], { cwd: f.uploads.older });
    if (res.status !== 0) {
      throw new Error(`T-23: expected exit 0, got ${res.status}; stderr=${JSON.stringify(res.stderr)}`);
    }
    assertNoAnchorLine(`${res.stdout}\n${res.stderr}`, "T-23");
  });

  it("T-24 a merge-base exit 128 stops with the section 8.7 line", () => {
    requireScript();
    const f = ancestorFixture();
    const log = join(f.dir, "forced-128.log");
    const bin = forcedGit(f.dir, log, 128);
    const res = runScript([f.tip, f.url, "."], {
      cwd: f.uploads.tip,
      env: scriptEnv({ pathDir: bin }),
      logFile: log,
    });
    assertNonZero(res, "T-24");
    assertStderrLine(res.stderr, section87(128));
    if (prefixedLines(res.stderr, "missing").length > 0) {
      throw new Error(`T-24: the run printed a missing line: ${JSON.stringify(res.stderr)}`);
    }
    const control = runScript([f.tip, f.url, "."], { cwd: f.uploads.tip });
    if (control.status !== 0) {
      throw new Error(`T-24 control: the real git exited ${control.status}; stderr=${control.stderr}`);
    }
  });

  it("T-25 a merge-base exit 1 stops with the section 8.6 line", () => {
    requireScript();
    const f = ancestorFixture();
    const log = join(f.dir, "forced-1.log");
    const bin = forcedGit(f.dir, log, 1);
    const res = runScript([f.tip, f.url, "."], {
      cwd: f.uploads.tip,
      env: scriptEnv({ pathDir: bin }),
      logFile: log,
    });
    if (res.status !== 1) {
      throw new Error(`T-25: expected exit 1, got ${res.status}; stderr=${JSON.stringify(res.stderr)}`);
    }
    assertStderrLine(res.stderr, section86(f.tip));
  });
});
