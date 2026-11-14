// @vitest-environment node
/**
 * Task 6.2, round 8 (track storytime_app_rebuild_20261025): the review build files.
 *
 * PM 01:50: "For every later review build: one submit only, and a review .gcloudignore that keeps
 * only what the storytime image needs (apps/storytime, packages, the lock and workspace files)."
 * PM 02:2x: "YES, the review-only ignore file goes into the repo, as one small change after the
 * phonics link: the review submit uses it, the CD build does not change; a test or script check
 * that the review submit names it."
 *
 * The Green adds three files (the PM may change a name; the rows read the names from NEW_FILES):
 *   - `apps/storytime/review.gcloudignore`: the ignore file of a review upload.
 *   - `apps/storytime/cloudbuild-review.yaml`: the build and push steps of cloudbuild.yaml only.
 *   - `apps/storytime/scripts/review/submit-review-build.sh`: one `gcloud builds submit` with the
 *     ignore file and the review config. Task 7.11 (group r4) changed the source: a `git archive`
 *     folder, not the working tree (row 2d).
 *
 * Every row reads files. No row calls the real gcloud or the network. The one run row puts a fake
 * `gcloud` first on PATH and an empty gcloud config folder, and it runs only after a static guard
 * finds no absolute gcloud path in the script. The controls (a matcher that finds the poisoned
 * input) pass at the base by design (A4); the rows on the three new files fail at the base because
 * the files are missing. The CD rows (4a to 4c) are characterization rows that pass at the base.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The commit that holds the CD build files as they must stay. */
const BASE_COMMIT = "3b757ea85";

/** The three files of the round, relative to the repo root. */
const NEW_FILES = {
  ignore: "apps/storytime/review.gcloudignore",
  config: "apps/storytime/cloudbuild-review.yaml",
  script: "apps/storytime/scripts/review/submit-review-build.sh",
} as const;

/** The image name that both build files push. */
const IMAGE =
  "asia-southeast1-docker.pkg.dev/$PROJECT_ID/primary-advantage-repo/storytime-app:$BUILD_ID";

/** The review switch and storage names that no new file may hold. */
const BANNED_NAMES = [
  "STORYTIME_REVIEW_DRAFT_WEEKS",
  "NEXT_PUBLIC_STORYTIME_REVIEW",
  "NEXT_PUBLIC_STORAGE_REVIEW",
];

/** Env flag shapes that no new file may hold: the flags stay in the order of the session. */
const ENV_FLAG_RE =
  /STORYTIME_[A-Z_]+|NEXT_PUBLIC_STORAGE_[A-Z_]*|--set-env-vars|--update-env-vars|--set-secrets|--update-secrets/;

/** Names that mark the review build files; the CD files must not hold them. */
const REVIEW_NAME_RE = /review\.gcloudignore|cloudbuild-review|submit-review-build|--ignore-file/;

/** The labeled counts that the Red evidence quotes (A4). */
const counts = {
  copy_sources: 0,
  ignore_must_keep_files: 0,
  ignore_must_not_paths: 0,
  new_files_scanned: 0,
  submit_calls_in_run: 0,
};

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
});

/**
 * Reads a repo file if it exists.
 * @param path The path from the repo root.
 * @returns The text, or null when the file is missing.
 */
function readSoft(path: string): string | null {
  const full = resolve(repoRoot, path);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

/**
 * Reads the text of a path at the base commit.
 * @param path The path from the repo root.
 * @returns The text at the base commit.
 */
function textAtBase(path: string): string {
  return execFileSync("git", ["-C", repoRoot, "show", `${BASE_COMMIT}:${path}`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

/**
 * Lists the tracked files under some paths.
 * @param paths The paths from the repo root.
 * @returns The tracked files.
 */
function trackedUnder(paths: string[]): string[] {
  const out = execFileSync("git", ["-C", repoRoot, "ls-files", "-z", "--", ...paths], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\0").filter(Boolean);
}

// ---- A small matcher of the gcloudignore rules (gitignore syntax) ----

/** One parsed ignore rule. */
interface Rule {
  negate: boolean;
  dirOnly: boolean;
  regex: RegExp;
}

/**
 * Turns a gitignore glob into the body of a regular expression.
 * @param glob The glob without a leading slash and a trailing slash.
 * @returns The regular expression source.
 */
function globBody(glob: string): string {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        const atStart = i === 0 || glob[i - 1] === "/";
        if (atStart && glob[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "[") {
      const end = glob.indexOf("]", i + 1);
      if (end === -1) {
        out += "\\[";
      } else {
        out += glob.slice(i, end + 1);
        i = end;
      }
    } else if (c === "\\") {
      i += 1;
      out += (glob[i] ?? "").replace(/[.+^${}()|[\]\\*?]/g, "\\$&");
    } else {
      out += (c ?? "").replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return out;
}

/**
 * Parses the text of an ignore file.
 * @param text The ignore file text.
 * @returns The rules in file order.
 */
function parseIgnore(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split("\n")) {
    let line = raw.replace(/\r$/, "").replace(/(?<!\\)\s+$/, "");
    if (line === "" || line.startsWith("#")) continue;
    let negate = false;
    if (line.startsWith("!")) {
      negate = true;
      line = line.slice(1);
    } else if (line.startsWith("\\!") || line.startsWith("\\#")) {
      line = line.slice(1);
    }
    let dirOnly = false;
    if (line.endsWith("/")) {
      dirOnly = true;
      line = line.slice(0, -1);
    }
    const anchored = line.includes("/");
    if (line.startsWith("/")) line = line.slice(1);
    const body = globBody(line);
    rules.push({ negate, dirOnly, regex: new RegExp(anchored ? `^${body}$` : `^(?:.*/)?${body}$`) });
  }
  return rules;
}

/**
 * Decides one path against the rules: the last matching rule wins.
 * @param rules The rules.
 * @param path The path from the root, without a trailing slash.
 * @param isDir True when the path is a directory.
 * @returns True when the rules ignore the path itself.
 */
function decide(rules: Rule[], path: string, isDir: boolean): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue;
    if (rule.regex.test(path)) ignored = !rule.negate;
  }
  return ignored;
}

/**
 * Tells whether an upload leaves out a file. A file below an ignored directory is out, as in
 * gitignore: no rule can bring back a file below an ignored directory.
 * @param rules The rules.
 * @param path The file path from the root.
 * @returns True when the file is left out of the upload.
 */
function isIgnored(rules: Rule[], path: string): boolean {
  const parts = path.split("/");
  for (let i = 1; i < parts.length; i += 1) {
    if (decide(rules, parts.slice(0, i).join("/"), true)) return true;
  }
  return decide(rules, path, false);
}

// ---- The paths that the image needs and the paths that an upload must leave out ----

/**
 * Reads the COPY sources of the storytime Dockerfile that come from the build context.
 * @returns The sources, for example `package.json` and `packages/read-along`.
 */
function dockerfileCopySources(): string[] {
  const text = readFileSync(resolve(app, "Dockerfile"), "utf8");
  const sources: string[] = [];
  for (const line of text.split("\n")) {
    const match = /^COPY\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const tokens = (match[1] ?? "").split(/\s+/).filter(Boolean);
    if (tokens.some((token) => token.startsWith("--from="))) continue;
    const words = tokens.filter((token) => !token.startsWith("--"));
    for (const source of words.slice(0, -1)) sources.push(source.replace(/\/$/, ""));
  }
  return [...new Set(sources)];
}

/**
 * Lists the files that a review upload must keep. They are the tracked files under the COPY
 * sources of the Dockerfile that the repo root `.gcloudignore` keeps (so the CD upload holds
 * them), plus the lock and the workspace files of the PM order.
 * @returns The file paths.
 */
function mustKeepFiles(): string[] {
  const sources = dockerfileCopySources();
  counts.copy_sources = sources.length;
  const rootRules = parseIgnore(readFileSync(resolve(repoRoot, ".gcloudignore"), "utf8"));
  const files = new Set(
    trackedUnder([...sources, "pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json"]).filter(
      (path) => !isIgnored(rootRules, path),
    ),
  );
  return [...files].sort();
}

/**
 * Lists the paths that a review upload must leave out.
 * @returns The paths. Each one is a file path (a real or a typical one) below a heavy folder.
 */
function mustLeaveOutPaths(): string[] {
  const others = readdirSync(resolve(repoRoot, "apps"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "storytime")
    .map((entry) => `apps/${entry.name}/package.json`);
  return [
    "measure/index.md",
    "measure/tracks.md",
    "measure/tracks/storytime_app_rebuild_20261025/plan.md",
    "docs/runbooks/storytime-deploy.md",
    "docs/primary-rpg-skin.md",
    ".git/HEAD",
    ".git/objects/pack/pack-0.pack",
    "node_modules/.bin/vitest",
    "apps/storytime/node_modules/next/package.json",
    "packages/db/node_modules/drizzle-orm/index.js",
    "apps/storytime/.next/server/app/page.js",
    "apps/storytime/.next/standalone/server.js",
    "packages/read-along/.next/x.js",
    ...others,
  ];
}

/**
 * Checks an ignore text against both path lists.
 * @param text The ignore file text.
 * @returns The files that it wrongly drops and the paths that it wrongly keeps.
 */
function ignoreViolations(text: string): { dropped: string[]; kept: string[] } {
  const rules = parseIgnore(text);
  return {
    dropped: mustKeepFiles().filter((path) => isIgnored(rules, path)),
    kept: mustLeaveOutPaths().filter((path) => !isIgnored(rules, path)),
  };
}

/** A correct ignore text for the positive control of the checker. */
const GOOD_IGNORE = [
  "/*",
  "!/apps",
  "/apps/*",
  "!/apps/storytime",
  "!/packages",
  "!/package.json",
  "!/pnpm-lock.yaml",
  "!/pnpm-workspace.yaml",
  "!/turbo.json",
  "!/.pnpmfile.cjs",
  "**/node_modules",
  "**/.next",
  "",
].join("\n");

// ---- The text of the build config ----

/** The parts of a Cloud Build config file. */
interface BuildParts {
  steps: string[];
  options: string;
}

/**
 * Splits a Cloud Build config into step blocks and the options block, without comments.
 * @param text The config text.
 * @returns The step blocks (trimmed lines joined by a newline) and the options block.
 */
function buildParts(text: string): BuildParts {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  const optionsAt = lines.findIndex((line) => /^options:/.test(line));
  const stepLines = optionsAt === -1 ? lines : lines.slice(0, optionsAt);
  const options = optionsAt === -1 ? "" : lines.slice(optionsAt).map((l) => l.trim()).join("\n");
  const steps: string[] = [];
  for (const line of stepLines) {
    if (/^ {2}- name:/.test(line)) steps.push(line.trim());
    else if (steps.length > 0) steps[steps.length - 1] += `\n${line.trim()}`;
  }
  return { steps, options };
}

/**
 * Finds the parts of a deploy that a review build config must not hold.
 * @param raw The config text.
 * @returns One label for each deploy marker found (comment lines do not count).
 */
function deployMarkers(raw: string): string[] {
  // Comment lines may explain the missing deploy step; only live lines count.
  const text = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  const markers: Array<[string, RegExp]> = [
    ["gcloud run", /gcloud\s+run\b/],
    ["deploy-cloudrun", /deploy-cloudrun/],
    ["update-traffic", /update-traffic/],
    ["gcloud builder", /cloud-builders\/gcloud/],
    ["--no-traffic", /--no-traffic/],
    ["--tag=", /--tag=/],
    ["--allow-unauthenticated", /--allow-unauthenticated/],
  ];
  return markers.filter(([, re]) => re.test(text)).map(([label]) => label);
}

/**
 * Counts the live `gcloud builds submit` commands of a script (comment lines do not count).
 * @param text The script text.
 * @returns The count.
 */
function submitCount(text: string): number {
  const code = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  return (code.match(/\bgcloud\s+builds\s+submit\b/g) ?? []).length;
}

/**
 * Finds the banned names and env flags in a text.
 * @param text The file text.
 * @returns One label for each hit.
 */
function bannedHits(text: string): string[] {
  const hits = BANNED_NAMES.filter((name) => text.includes(name));
  const flag = ENV_FLAG_RE.exec(text);
  if (flag) hits.push(flag[0]);
  return hits;
}

// ---- Row 1: the ignore file ----

describe("row 1: the review ignore file keeps what the image needs and nothing else", () => {
  it("1a the ignore file exists", () => {
    expect(readSoft(NEW_FILES.ignore), `${NEW_FILES.ignore} must exist`).not.toBeNull();
  });

  it("1b it keeps every file that the Dockerfile COPY lines and the workspace files need", () => {
    const text = readSoft(NEW_FILES.ignore);
    expect(text, `${NEW_FILES.ignore} must exist`).not.toBeNull();
    const must = mustKeepFiles();
    counts.ignore_must_keep_files = must.length;
    expect(must.length, "ignore_must_keep_files must be above 100 (A4)").toBeGreaterThan(100);
    expect(counts.copy_sources, "the Dockerfile must name at least 12 COPY sources").toBeGreaterThanOrEqual(12);
    const rules = parseIgnore(text ?? "");
    const dropped = must.filter((path) => isIgnored(rules, path));
    expect(dropped.slice(0, 10), `the ignore file drops ${dropped.length} needed files`).toEqual([]);
  });

  it("1c it names the root files of the image explicitly", () => {
    const text = readSoft(NEW_FILES.ignore);
    expect(text, `${NEW_FILES.ignore} must exist`).not.toBeNull();
    const rules = parseIgnore(text ?? "");
    for (const path of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      ".pnpmfile.cjs",
      "apps/storytime/package.json",
      "packages/read-along/package.json",
    ]) {
      expect(isIgnored(rules, path), `${path} must upload`).toBe(false);
    }
  });

  it("1d it leaves out measure/, docs/, every other app, .git, node_modules, and .next", () => {
    const text = readSoft(NEW_FILES.ignore);
    expect(text, `${NEW_FILES.ignore} must exist`).not.toBeNull();
    const out = mustLeaveOutPaths();
    counts.ignore_must_not_paths = out.length;
    expect(out.length, "ignore_must_not_paths must be above 10 (A4)").toBeGreaterThan(10);
    const rules = parseIgnore(text ?? "");
    const kept = out.filter((path) => !isIgnored(rules, path));
    expect(kept, "these paths must stay out of the upload").toEqual([]);
  });

  it("1e control: a correct ignore text passes the checker", () => {
    const keep = mustKeepFiles();
    counts.ignore_must_keep_files = keep.length;
    counts.ignore_must_not_paths = mustLeaveOutPaths().length;
    expect(keep.length, "ignore_must_keep_files must be above 100 (A4)").toBeGreaterThan(100);
    expect(counts.ignore_must_not_paths, "ignore_must_not_paths must be above 10 (A4)").toBeGreaterThan(10);
    const { dropped, kept } = ignoreViolations(GOOD_IGNORE);
    expect({ dropped: dropped.slice(0, 5), kept }, "the good fixture must pass").toEqual({
      dropped: [],
      kept: [],
    });
  });

  it("1f control: an empty ignore text keeps heavy paths and an over-broad one drops needed files", () => {
    const empty = ignoreViolations("");
    expect(empty.kept, "an empty ignore file must be caught as keeping measure/").toContain(
      "measure/index.md",
    );
    const broad = ignoreViolations("*\n");
    expect(broad.dropped.length, "a star-only ignore file must be caught as dropping files").toBeGreaterThan(100);
    const noStorytime = ignoreViolations(`${GOOD_IGNORE}apps/storytime/app\n`);
    expect(
      noStorytime.dropped.some((path) => path.startsWith("apps/storytime/app/")),
      "an ignore text that drops apps/storytime/app must be caught",
    ).toBe(true);
  });

  it("1g control: the matcher reads the real repo rules as the CD upload does", () => {
    const rules = parseIgnore(readFileSync(resolve(repoRoot, ".gcloudignore"), "utf8"));
    expect(isIgnored(rules, "measure/index.md"), "the repo ignore file drops measure/").toBe(true);
    expect(isIgnored(rules, "apps/storytime/package.json"), "the repo ignore file keeps storytime").toBe(false);
    expect(isIgnored(rules, "apps/sales-advantage/package.json"), "the repo ignore file keeps listed apps").toBe(false);
  });
});

// ---- Row 2: the submit script ----

describe("row 2: the review submit script", () => {
  it("2a the script exists, is executable, and has valid bash syntax", () => {
    const full = resolve(repoRoot, NEW_FILES.script);
    expect(existsSync(full), `${NEW_FILES.script} must exist`).toBe(true);
    expect(statSync(full).mode & 0o111, "the script must have an executable bit").not.toBe(0);
    const check = spawnSync("bash", ["-n", full], { encoding: "utf8" });
    expect(check.status, `bash -n must pass: ${check.stderr}`).toBe(0);
  });

  it("2b it names the ignore file and the review config, and holds exactly one submit", () => {
    const text = readSoft(NEW_FILES.script);
    expect(text, `${NEW_FILES.script} must exist`).not.toBeNull();
    expect(text).toContain(`--ignore-file=${NEW_FILES.ignore}`);
    expect(text).toContain(`--config=${NEW_FILES.config}`);
    expect(submitCount(text ?? ""), "exactly one live gcloud builds submit").toBe(1);
  });

  it("2c it holds no deploy and no traffic move", () => {
    const text = readSoft(NEW_FILES.script);
    expect(text, `${NEW_FILES.script} must exist`).not.toBeNull();
    expect(text).not.toMatch(/gcloud\s+run\b/);
    expect(text).not.toMatch(/update-traffic/);
    expect(text).not.toMatch(/--no-traffic|--tag=/);
  });

  it("2d run with a fake gcloud: one call, from the archive folder, with the pinned flags", () => {
    // Task 7.11 (group r4) changed this row. It pinned the working-tree form: one submit from the
    // repo root with `.` as the source. The script now submits a `git archive` folder, so the row
    // runs a tracked copy of the three files in a temporary repository (a whole-monorepo archive
    // would be heavy) and expects the call to run from a fresh folder, not from the repository.
    const text = readSoft(NEW_FILES.script);
    expect(text, `${NEW_FILES.script} must exist`).not.toBeNull();
    expect(text, "the static guard: no absolute gcloud path in the script").not.toMatch(
      /\/[A-Za-z0-9._/-]*gcloud\b/,
    );
    const dir = mkdtempSync(join(tmpdir(), "storytime-r8-submit-"));
    try {
      const bin = join(dir, "bin");
      const scratch = join(dir, "tmp");
      const repo = join(dir, "repo");
      const log = join(dir, "calls.log");
      mkdirSync(bin);
      mkdirSync(scratch);
      mkdirSync(repo);
      const gitEnv = {
        NODE_ENV: "test" as const,
        PATH: "/usr/bin:/bin",
        HOME: dir,
        GIT_AUTHOR_NAME: "red",
        GIT_AUTHOR_EMAIL: "red@example.invalid",
        GIT_COMMITTER_NAME: "red",
        GIT_COMMITTER_EMAIL: "red@example.invalid",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      };
      const git = (...args: string[]) =>
        execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd: repo, env: gitEnv });
      git("init", "-q", "-b", "main");
      for (const rel of Object.values(NEW_FILES)) {
        mkdirSync(dirname(join(repo, rel)), { recursive: true });
        copyFileSync(resolve(repoRoot, rel), join(repo, rel));
      }
      chmodSync(join(repo, NEW_FILES.script), 0o755);
      writeFileSync(join(repo, "package.json"), "{}\n");
      git("add", "-A");
      git("commit", "-q", "-m", "fixture");
      writeFileSync(
        join(bin, "gcloud"),
        '#!/bin/bash\n{ echo CALL; echo "CWD=$(pwd -P)"; for a in "$@"; do echo "ARG=$a"; done; } >> "$FAKE_GCLOUD_LOG"\nexit 0\n',
        { mode: 0o755 },
      );
      const run = spawnSync("bash", [join(repo, NEW_FILES.script)], {
        cwd: join(repo, "apps", "storytime", "scripts", "review"),
        env: {
          NODE_ENV: "test",
          PATH: `${bin}:/usr/bin:/bin`,
          HOME: dir,
          TMPDIR: scratch,
          CLOUDSDK_CONFIG: join(dir, "gcloud-config"),
          FAKE_GCLOUD_LOG: log,
        },
        encoding: "utf8",
        timeout: 60_000,
      });
      expect(run.status, `the script must exit 0 with a fake gcloud: ${run.stderr}`).toBe(0);
      const lines = existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
      const calls = lines.filter((line) => line === "CALL").length;
      counts.submit_calls_in_run = calls;
      expect(calls, "exactly one gcloud call").toBe(1);
      const cwd = lines.find((line) => line.startsWith("CWD="))?.slice(4) ?? "";
      expect(cwd.startsWith(`${realpathSync(scratch)}/`), `the submit runs from the archive folder: ${cwd}`).toBe(
        true,
      );
      expect(cwd, "the submit does not run from the working tree").not.toBe(realpathSync(repo));
      const args = lines.filter((line) => line.startsWith("ARG=")).map((line) => line.slice(4));
      expect(args.slice(0, 2), "the call is builds submit").toEqual(["builds", "submit"]);
      expect(args).toContain(`--ignore-file=${NEW_FILES.ignore}`);
      expect(args).toContain(`--config=${NEW_FILES.config}`);
      expect(args).toContain("--project=primary-advantage");
      expect(args).toContain("--region=asia-southeast1");
      expect(args, "the source is the archive folder").toContain(".");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("2e control: the submit counter and the deploy finder catch poisoned text", () => {
    expect(submitCount("gcloud builds submit .\ngcloud builds submit .\n")).toBe(2);
    expect(submitCount("# gcloud builds submit .\n")).toBe(0);
    expect(deployMarkers("gcloud run deploy x --no-traffic")).toEqual(
      expect.arrayContaining(["gcloud run", "--no-traffic"]),
    );
  });
});

// ---- Row 3: the review build config ----

describe("row 3: the review config holds the build and push steps only", () => {
  it("3a the config exists", () => {
    expect(readSoft(NEW_FILES.config), `${NEW_FILES.config} must exist`).not.toBeNull();
  });

  it("3b it holds exactly the build and push steps of cloudbuild.yaml, and the same options", () => {
    const review = readSoft(NEW_FILES.config);
    expect(review, `${NEW_FILES.config} must exist`).not.toBeNull();
    const cd = buildParts(readFileSync(resolve(app, "cloudbuild.yaml"), "utf8"));
    const rv = buildParts(review ?? "");
    expect(rv.steps.length, "exactly two steps").toBe(2);
    expect(rv.steps[0], "step 1 equals the build step of cloudbuild.yaml").toBe(cd.steps[0]);
    expect(rv.steps[1], "step 2 equals the push step of cloudbuild.yaml").toBe(cd.steps[1]);
    expect(rv.options, "the options equal the options of cloudbuild.yaml").toBe(cd.options);
    expect(rv.options).toContain("CLOUD_LOGGING_ONLY");
  });

  it("3c both steps name the image of cloudbuild.yaml", () => {
    const review = readSoft(NEW_FILES.config);
    expect(review, `${NEW_FILES.config} must exist`).not.toBeNull();
    const rv = buildParts(review ?? "");
    expect(rv.steps.length, "exactly two steps").toBe(2);
    for (const step of rv.steps) expect(step).toContain(IMAGE);
    expect(readFileSync(resolve(app, "cloudbuild.yaml"), "utf8")).toContain(IMAGE);
  });

  it("3d it holds no deploy step, no traffic flag, and no gcloud builder", () => {
    const review = readSoft(NEW_FILES.config);
    expect(review, `${NEW_FILES.config} must exist`).not.toBeNull();
    expect(deployMarkers(review ?? "")).toEqual([]);
  });

  it("3e control: the checks catch a config with a deploy step and a config without the push step", () => {
    const cdText = readFileSync(resolve(app, "cloudbuild.yaml"), "utf8");
    expect(deployMarkers(cdText), "the CD file holds the deploy markers").toEqual(
      expect.arrayContaining(["gcloud run", "--no-traffic", "deploy-cloudrun"]),
    );
    const cd = buildParts(cdText);
    expect(cd.steps.length, "the CD file holds three steps").toBe(3);
    const withoutPush = buildParts(cdText.split("  # Step 2: Push the image.")[0] ?? "");
    expect(withoutPush.steps.length, "a file without the push step has one step").toBe(1);
  });
});

// ---- Row 4: the CD build does not change ----

describe("row 4: the CD build files stay as they are", () => {
  it("4a apps/storytime/cloudbuild.yaml equals its text at the base commit", () => {
    expect(readFileSync(resolve(app, "cloudbuild.yaml"), "utf8")).toBe(
      textAtBase("apps/storytime/cloudbuild.yaml"),
    );
  });

  it("4b the repo root .gcloudignore equals its text at the base commit", () => {
    expect(readFileSync(resolve(repoRoot, ".gcloudignore"), "utf8")).toBe(textAtBase(".gcloudignore"));
  });

  it("4c no CD file, workflow, Dockerfile, or CI app row names a review build file", () => {
    const workflows = readdirSync(resolve(repoRoot, ".github", "workflows"))
      .filter((name) => name.endsWith(".yml"))
      .map((name) => `.github/workflows/${name}`);
    const files = ["apps/storytime/cloudbuild.yaml", "apps/storytime/Dockerfile", ...workflows];
    expect(files.length, "files scanned must be above 4 (A4)").toBeGreaterThan(4);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(resolve(repoRoot, file), "utf8");
      if (REVIEW_NAME_RE.test(text)) hits.push(file);
    }
    const apps = JSON.parse(readFileSync(resolve(repoRoot, "scripts/ci/apps.json"), "utf8")) as Array<
      Record<string, unknown>
    >;
    const row = apps.find((entry) => entry.id === "storytime");
    expect(row, "scripts/ci/apps.json must hold a storytime row").toBeDefined();
    if (REVIEW_NAME_RE.test(JSON.stringify(row))) hits.push("scripts/ci/apps.json#storytime");
    expect(hits, "the CD build must not name a review file").toEqual([]);
  });

  it("4d control: the review-name finder catches a poisoned CD file", () => {
    const poisoned = `${readFileSync(resolve(app, "cloudbuild.yaml"), "utf8")}\n# --ignore-file=apps/storytime/review.gcloudignore\n`;
    expect(REVIEW_NAME_RE.test(poisoned)).toBe(true);
    expect(REVIEW_NAME_RE.test(readFileSync(resolve(app, "cloudbuild.yaml"), "utf8"))).toBe(false);
  });
});

// ---- Row 5: no new file names a review switch or an env flag ----

describe("row 5: the new files name no review switch and no env flag", () => {
  it.each(Object.entries(NEW_FILES))("5a the %s file exists and names no switch and no env flag", (_kind, path) => {
    const text = readSoft(path);
    expect(text, `${path} must exist`).not.toBeNull();
    counts.new_files_scanned += 1;
    expect(bannedHits(text ?? ""), `${path} must keep the env flags out`).toEqual([]);
  });

  it("5b the config path is covered by the glob of the old deploy-file scan", () => {
    // look-draft-week-switch.test.ts row (f) scans ":(glob)apps/storytime/**/cloudbuild*.yaml".
    const body = globBody("apps/storytime/**/cloudbuild*.yaml");
    expect(new RegExp(`^${body}$`).test(NEW_FILES.config)).toBe(true);
    expect(new RegExp(`^${body}$`).test("apps/storytime/cloudbuild.yaml")).toBe(true);
    expect(new RegExp(`^${body}$`).test(NEW_FILES.script)).toBe(false);
  });

  it("5c control: the finder catches a switch name and an env flag", () => {
    expect(bannedHits("x STORYTIME_REVIEW_DRAFT_WEEKS=1")).not.toEqual([]);
    expect(bannedHits("x NEXT_PUBLIC_STORAGE_REVIEW_FOO=1")).not.toEqual([]);
    expect(bannedHits("gcloud run deploy --set-env-vars=A=1")).not.toEqual([]);
    expect(bannedHits("gcloud builds submit --config=a.yaml .")).toEqual([]);
  });
});
