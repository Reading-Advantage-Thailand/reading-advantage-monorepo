// @vitest-environment node
/**
 * Review B blockers B996 to B999 and Review A finding N1 of Phase 7 (track
 * storytime_app_rebuild_20261025; plan task 7.11, group r4).
 *
 * Root cause of the four blockers: `submit-review-build.sh` runs `gcloud builds submit ... .` from
 * the git root, so the upload is the WORKING TREE. Every untracked or gitignored file under
 * `apps/storytime` or `packages` is a candidate, and a deny list in `review.gcloudignore` keeps
 * missing shapes (PKCS archives, service-account keys, `.npmrc`, SSH keys).
 *
 * The contract that this file pins:
 * 1. Archive-only upload (closes the class). The submit script takes an optional commit argument
 *    (default `HEAD`), writes `git archive <commit>` into a fresh temporary folder, runs the one
 *    `gcloud builds submit` from that folder with the same four flags, and removes the folder on
 *    exit, also on a failure (a trap). An untracked or gitignored file never reaches the folder.
 *    The rows put a stub `gcloud` first on PATH inside a temporary git repository. The stub
 *    records its cwd, its args, and the file list of its cwd. The stub never calls the real gcloud,
 *    and no row touches the network. The temporary repository holds a tracked copy of the real
 *    script, so a script that finds its repository from its own folder also finds the temporary
 *    repository.
 * 2. Defense in depth. `review.gcloudignore` also excludes `**\/*.p12`, `**\/*.pfx`,
 *    `**\/service-account*.json`, `**\/*-key.json`, `**\/.npmrc`, `**\/.netrc`, `**\/.docker/`,
 *    `**\/id_rsa*`, `**\/id_ed25519*`, `**\/id_ecdsa*`, and `**\/*.ppk`. The rows apply the
 *    rules with gcloudignore semantics (gitignore syntax, last match wins) to a fake file list, with
 *    positive controls that keep normal sources.
 * 3. N1. `apps/storytime/package.json` declares `ignore` in devDependencies with an exact version
 *    that `pnpm-lock.yaml` resolves for the app (the r3 rows import the package).
 *
 * The judge rows run the checks against a reference input and against weak inputs, so a check that
 * passes everything fails a row (A4).
 */
import { spawnSync } from "node:child_process";
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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ignore from "ignore";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

const SCRIPT_REL = "apps/storytime/scripts/review/submit-review-build.sh";
const IGNORE_REL = "apps/storytime/review.gcloudignore";
const CONFIG_REL = "apps/storytime/cloudbuild-review.yaml";

const counts = { archive_runs: 0, upload_rule_inputs: 0, secret_shapes: 0 };

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
});

// ---------------------------------------------------------------------------------------------
// Row group 1: the archive-only upload
// ---------------------------------------------------------------------------------------------

const GIT_ENV = {
  NODE_ENV: "test" as const,
  GIT_AUTHOR_NAME: "red",
  GIT_AUTHOR_EMAIL: "red@example.invalid",
  GIT_COMMITTER_NAME: "red",
  GIT_COMMITTER_EMAIL: "red@example.invalid",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

/**
 * Runs git in a folder and returns the trimmed stdout.
 * @param cwd The folder.
 * @param args The git arguments.
 * @returns The trimmed stdout.
 */
function git(cwd: string, args: string[]): string {
  const run = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    env: { PATH: "/usr/bin:/bin", HOME: cwd, ...GIT_ENV },
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${run.stderr}`);
  return run.stdout.trim();
}

/**
 * Writes a file and its folders.
 * @param root The root folder.
 * @param rel The relative path.
 * @param text The text.
 */
function put(root: string, rel: string, text: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

/** The untracked and ignored files that must never reach the submitted folder. */
const NEVER_UPLOADED = [
  ".env",
  "id_rsa",
  ".npmrc",
  "service-account.json",
  "x.p12",
  "apps/storytime/.env",
  "apps/storytime/certs/x.p12",
  "apps/storytime/ignored-secret.txt",
  "packages/db/.npmrc",
  "packages/db/service-account.json",
];

/** The fixture of one run. */
interface Fixture {
  /** The temporary folder that holds everything of the run. */
  base: string;
  /** The temporary git repository. */
  repoDir: string;
  /** The TMPDIR of the script run: the archive folder is made inside it. */
  scratch: string;
  /** The folder with the stub gcloud. */
  bin: string;
  /** The log of the stub. */
  log: string;
  /** The first commit. */
  first: string;
  /** The second commit (HEAD). */
  second: string;
}

/**
 * Builds a temporary git repository with two commits, a tracked copy of the real review files,
 * and untracked and ignored secret-like files.
 * @returns The fixture.
 */
function makeFixture(): Fixture {
  const base = mkdtempSync(join(tmpdir(), "storytime-r4-"));
  const repoDir = join(base, "repo");
  const scratch = join(base, "tmp");
  const bin = join(base, "bin");
  mkdirSync(repoDir);
  mkdirSync(scratch);
  mkdirSync(bin);
  git(repoDir, ["init", "-q", "-b", "main"]);
  for (const rel of [SCRIPT_REL, IGNORE_REL, CONFIG_REL]) {
    mkdirSync(dirname(join(repoDir, rel)), { recursive: true });
    copyFileSync(resolve(repoRoot, rel), join(repoDir, rel));
  }
  chmodSync(join(repoDir, SCRIPT_REL), 0o755);
  put(repoDir, ".gitignore", "apps/storytime/ignored-secret.txt\n");
  put(repoDir, "package.json", "{}\n");
  put(repoDir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  put(repoDir, "marker.txt", "first\n");
  put(repoDir, "old.txt", "old\n");
  put(repoDir, "apps/storytime/package.json", "{}\n");
  put(repoDir, "packages/db/index.ts", "export {};\n");
  git(repoDir, ["add", "-A"]);
  git(repoDir, ["commit", "-q", "-m", "first"]);
  const first = git(repoDir, ["rev-parse", "HEAD"]);
  git(repoDir, ["rm", "-q", "old.txt"]);
  put(repoDir, "new.txt", "new\n");
  put(repoDir, "marker.txt", "second\n");
  git(repoDir, ["add", "-A"]);
  git(repoDir, ["commit", "-q", "-m", "second"]);
  const second = git(repoDir, ["rev-parse", "HEAD"]);
  // A tracked file that differs in the working tree, and the untracked and ignored files.
  put(repoDir, "marker.txt", "dirty\n");
  for (const rel of NEVER_UPLOADED) put(repoDir, rel, "secret\n");
  const log = join(base, "calls.log");
  writeFileSync(
    join(bin, "gcloud"),
    [
      "#!/bin/bash",
      "{",
      "  echo CALL",
      '  echo "CWD=$(pwd -P)"',
      '  for a in "$@"; do echo "ARG=$a"; done',
      '  echo "MARKER=$(cat marker.txt 2>/dev/null)"',
      '  [ -f apps/storytime/review.gcloudignore ] && echo "IGNORE_IN_CWD=yes"',
      '  find . -type f | sed "s#^\\./#FILE=#" | sort',
      '} >> "$FAKE_GCLOUD_LOG"',
      'exit "${FAKE_GCLOUD_EXIT:-0}"',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  return { base, repoDir, scratch, bin, log, first, second };
}

/** The result of one script run. */
interface Run {
  status: number | null;
  stderr: string;
  calls: number;
  cwd: string;
  args: string[];
  marker: string;
  files: string[];
  ignoreInCwd: boolean;
}

/**
 * Runs the tracked copy of the submit script with the stub gcloud.
 * @param fx The fixture.
 * @param options The commit argument, the stub exit code, and the folder to run from.
 * @returns What the stub recorded and how the script ended.
 */
function runScript(
  fx: Fixture,
  options: { commit?: string; stubExit?: number; from?: string; tmpdir?: string } = {},
): Run {
  const scriptText = readFileSync(resolve(repoRoot, SCRIPT_REL), "utf8");
  expect(scriptText, "the static guard: no absolute gcloud path in the script").not.toMatch(
    /\/[A-Za-z0-9._/-]*gcloud\b/,
  );
  const run = spawnSync("bash", [join(fx.repoDir, SCRIPT_REL), ...(options.commit ? [options.commit] : [])], {
    cwd: options.from ? join(fx.repoDir, options.from) : fx.repoDir,
    env: {
      PATH: `${fx.bin}:/usr/bin:/bin`,
      HOME: fx.base,
      TMPDIR: options.tmpdir ?? fx.scratch,
      CLOUDSDK_CONFIG: join(fx.base, "gcloud-config"),
      FAKE_GCLOUD_LOG: fx.log,
      FAKE_GCLOUD_EXIT: String(options.stubExit ?? 0),
      ...GIT_ENV,
    },
    encoding: "utf8",
    timeout: 60_000,
  });
  counts.archive_runs += 1;
  const lines = existsSync(fx.log) ? readFileSync(fx.log, "utf8").split("\n").filter(Boolean) : [];
  return {
    status: run.status,
    stderr: run.stderr,
    calls: lines.filter((line) => line === "CALL").length,
    cwd: lines.find((line) => line.startsWith("CWD="))?.slice(4) ?? "",
    args: lines.filter((line) => line.startsWith("ARG=")).map((line) => line.slice(4)),
    marker: lines.find((line) => line.startsWith("MARKER="))?.slice(7) ?? "",
    files: lines.filter((line) => line.startsWith("FILE=")).map((line) => line.slice(5)).sort(),
    ignoreInCwd: lines.includes("IGNORE_IN_CWD=yes"),
  };
}

/**
 * Lists the tracked files of a commit.
 * @param fx The fixture.
 * @param commit The commit.
 * @returns The sorted paths.
 */
function tracked(fx: Fixture, commit: string): string[] {
  return git(fx.repoDir, ["ls-tree", "-r", "--name-only", commit]).split("\n").sort();
}

/**
 * Asserts the facts that every successful or failed run holds: one call, from a fresh folder under
 * the scratch TMPDIR that is not the repository, and the four flags.
 * @param fx The fixture.
 * @param result The run.
 */
function expectArchiveCall(fx: Fixture, result: Run): void {
  expect(result.calls, "gcloud runs exactly once").toBe(1);
  const scratchReal = realpathSync(fx.scratch);
  expect(
    result.cwd.startsWith(`${scratchReal}/`),
    `the submit must run from a fresh folder under TMPDIR, cwd=${result.cwd}`,
  ).toBe(true);
  expect(result.cwd, "the submit must not run from the working tree").not.toBe(realpathSync(fx.repoDir));
  expect(result.args.slice(0, 2)).toEqual(["builds", "submit"]);
  expect(result.args).toContain(`--ignore-file=${IGNORE_REL}`);
  expect(result.args).toContain(`--config=${CONFIG_REL}`);
  expect(result.args).toContain("--project=primary-advantage");
  expect(result.args).toContain("--region=asia-southeast1");
  expect(result.args, "the source is the folder itself").toContain(".");
}

describe("P7 r4 B996 to B999 root cause: the review submit uploads a git archive only", () => {
  const fixtures: Fixture[] = [];
  afterAll(() => {
    for (const fx of fixtures) rmSync(fx.base, { recursive: true, force: true });
  });
  const fixture = (): Fixture => {
    const fx = makeFixture();
    fixtures.push(fx);
    return fx;
  };

  it("a1 the submitted folder holds the tracked files of HEAD and no untracked or ignored file", () => {
    const fx = fixture();
    const result = runScript(fx);
    expect(result.status, `the script must exit 0: ${result.stderr}`).toBe(0);
    expectArchiveCall(fx, result);
    const leaked = NEVER_UPLOADED.filter((path) => result.files.includes(path));
    expect(leaked, "these untracked or ignored files reached the submitted folder").toEqual([]);
    expect(result.files, "the folder holds exactly the tracked files of HEAD").toEqual(tracked(fx, "HEAD"));
    expect(result.ignoreInCwd, "the ignore file is in the submitted folder").toBe(true);
  });

  it("a2 the submitted files are the committed text, not the working-tree text", () => {
    const fx = fixture();
    const result = runScript(fx);
    expect(result.status).toBe(0);
    expectArchiveCall(fx, result);
    expect(result.marker, "marker.txt is committed as second and modified to dirty").toBe("second");
  });

  it("a3 an explicit commit argument archives that commit", () => {
    const fx = fixture();
    const result = runScript(fx, { commit: fx.first });
    expect(result.status, `the script must exit 0: ${result.stderr}`).toBe(0);
    expectArchiveCall(fx, result);
    expect(result.files, "the folder holds exactly the tracked files of the first commit").toEqual(
      tracked(fx, fx.first),
    );
    expect(result.files).toContain("old.txt");
    expect(result.files).not.toContain("new.txt");
    expect(result.marker).toBe("first");
  });

  it("a4 a run from a subfolder still uploads the whole repository, tracked files only", () => {
    const fx = fixture();
    const result = runScript(fx, { from: "apps/storytime" });
    expect(result.status, `the script must exit 0: ${result.stderr}`).toBe(0);
    expectArchiveCall(fx, result);
    expect(result.files).toEqual(tracked(fx, "HEAD"));
    expect(result.files).toContain("packages/db/index.ts");
    expect(result.files).toContain("package.json");
  });

  it("a5 the temporary folder is gone after a successful run", () => {
    const fx = fixture();
    const result = runScript(fx);
    expect(result.status).toBe(0);
    expectArchiveCall(fx, result);
    expect(readdirSync(fx.scratch), "TMPDIR must hold no folder after the run").toEqual([]);
  });

  it("a6 a failing gcloud makes the script fail and the folder is removed", () => {
    const fx = fixture();
    const result = runScript(fx, { stubExit: 1 });
    expectArchiveCall(fx, result);
    expect(result.status, "the script must exit non-zero when gcloud fails").not.toBe(0);
    expect(result.status).not.toBeNull();
    expect(readdirSync(fx.scratch), "TMPDIR must hold no folder after a failed run").toEqual([]);
  });

  it("a7 the script text archives a commit, removes the folder by a trap, and submits once", () => {
    const text = readFileSync(resolve(repoRoot, SCRIPT_REL), "utf8");
    const code = text
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    expect(code, "the script must run git archive").toMatch(/git\s+archive\b/);
    expect(code, "the script must clean up with a trap").toMatch(/\btrap\b/);
    expect(code, "the script must make a fresh folder with mktemp").toMatch(/\bmktemp\b/);
    expect((code.match(/\bgcloud\s+builds\s+submit\b/g) ?? []).length, "exactly one live submit").toBe(1);
  });

  /**
   * Lists every folder of the temporary repository, as relative paths.
   * @param fx The fixture.
   * @returns The sorted folder paths.
   */
  function folders(fx: Fixture): string[] {
    const out = spawnSync("find", [".", "-type", "d", "-not", "-path", "./.git", "-not", "-path", "./.git/*"], {
      cwd: fx.repoDir,
      encoding: "utf8",
    }).stdout;
    return out.split("\n").filter(Boolean).sort();
  }

  it("b1 a relative TMPDIR leaves no archive folder after a successful run (B1001)", () => {
    // Finding B1001 of Review B: with a relative TMPDIR the `mktemp -d` result is relative, the
    // script then changes folder, and the trap `rm -rf "$work"` runs from the new folder, so the
    // archive folder stays. The TMPDIR is a folder name under the repository root, where the
    // script first changes to.
    const fx = fixture();
    mkdirSync(join(fx.repoDir, "tmp-rel"));
    const before = folders(fx);
    const result = runScript(fx, { tmpdir: "tmp-rel" });
    expect(result.status, `the script must exit 0: ${result.stderr}`).toBe(0);
    expect(result.calls, "gcloud runs exactly once").toBe(1);
    expect(
      result.cwd.startsWith(`${realpathSync(join(fx.repoDir, "tmp-rel"))}/`),
      `the submit must run from a folder under the relative TMPDIR, cwd=${result.cwd}`,
    ).toBe(true);
    expect(readdirSync(join(fx.repoDir, "tmp-rel")), "the relative TMPDIR must hold no folder").toEqual([]);
    expect(folders(fx), "the repository must hold no new folder anywhere").toEqual(before);
  });

  it("b2 a relative TMPDIR leaves no archive folder after a failing gcloud (B1001)", () => {
    const fx = fixture();
    mkdirSync(join(fx.repoDir, "tmp-rel"));
    const before = folders(fx);
    const result = runScript(fx, { tmpdir: "tmp-rel", stubExit: 1 });
    expect(result.calls, "gcloud runs exactly once").toBe(1);
    expect(
      result.cwd.startsWith(`${realpathSync(join(fx.repoDir, "tmp-rel"))}/`),
      `the submit must run from a folder under the relative TMPDIR, cwd=${result.cwd}`,
    ).toBe(true);
    expect(result.status, "the script must exit non-zero when gcloud fails").not.toBe(0);
    expect(result.status).not.toBeNull();
    expect(readdirSync(join(fx.repoDir, "tmp-rel")), "the relative TMPDIR must hold no folder").toEqual([]);
    expect(folders(fx), "the repository must hold no new folder anywhere").toEqual(before);
  });

  it("c1 control: the stub records the untracked files when a script uploads the working tree", () => {
    const fx = fixture();
    const probe = join(fx.repoDir, "probe.sh");
    writeFileSync(probe, '#!/bin/bash\nset -e\ncd "$(git rev-parse --show-toplevel)"\ngcloud builds submit .\n', {
      mode: 0o755,
    });
    const run = spawnSync("bash", [probe], {
      cwd: fx.repoDir,
      env: {
        PATH: `${fx.bin}:/usr/bin:/bin`,
        HOME: fx.base,
        FAKE_GCLOUD_LOG: fx.log,
        FAKE_GCLOUD_EXIT: "0",
        ...GIT_ENV,
      },
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    const files = readFileSync(fx.log, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("FILE="))
      .map((line) => line.slice(5));
    for (const path of ["id_rsa", ".npmrc", "x.p12", "apps/storytime/.env"]) {
      expect(files, `the working-tree form must show ${path}: the stub sees untracked files`).toContain(path);
    }
  });

  it("c2 control: the fixture holds the secret shapes untracked and the files tracked", () => {
    const fx = fixture();
    const trackedFiles = tracked(fx, "HEAD");
    expect(trackedFiles.length, "tracked files must be above 6 (A4)").toBeGreaterThan(6);
    for (const path of NEVER_UPLOADED) {
      expect(existsSync(join(fx.repoDir, path)), `${path} must exist in the working tree`).toBe(true);
      expect(trackedFiles, `${path} must be untracked`).not.toContain(path);
    }
  });

  it("a8 the archive rows ran the script the expected number of times (floor, A4)", () => {
    // Task 7.13 (finding N2 of Review A) replaced a `>= 0` assertion that could never fail. Rows a1
    // to a6, b1, and b2 each make one real script run through `runScript`; a row that skips its run
    // or a deleted row lowers the count.
    expect(counts.archive_runs, "the number of real script runs in this describe").toBe(8);
  });
});

// ---------------------------------------------------------------------------------------------
// Row group 2: the extra secret shapes in review.gcloudignore
// ---------------------------------------------------------------------------------------------

/** Secret shapes, one group for each finding, that must never enter the upload. */
const SECRET_SHAPES: Record<string, string[]> = {
  B996: ["apps/storytime/certs/client.p12", "packages/db/store.pfx", "packages/auth/keys/signing.p12"],
  B997: [
    "apps/storytime/service-account.json",
    "packages/db/service-account-prod.json",
    "apps/storytime/gcloud-key.json",
    "packages/db/deploy-key.json",
    "packages/auth/service-account-key.json",
  ],
  B998: [
    "apps/storytime/.npmrc",
    "packages/db/.npmrc",
    "packages/db/.netrc",
    "apps/storytime/.docker/config.json",
    "packages/db/.docker/config.json",
  ],
  B999: [
    "apps/storytime/.ssh/id_rsa",
    "packages/db/id_ed25519",
    "packages/auth/id_ecdsa",
    "apps/storytime/keys/id_rsa_deploy",
    "packages/db/putty.ppk",
  ],
};

/** Source files that the upload keeps: an exclusion that drops one is too broad (A7). */
const KEEP_PATHS = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "apps/storytime/package.json",
  "apps/storytime/tsconfig.json",
  "apps/storytime/app/page.tsx",
  "apps/storytime/content/l2/w01.json",
  "apps/storytime/content/key-words.json",
  "apps/storytime/lib/keys.ts",
  "apps/storytime/lib/service-account-help.ts",
  "packages/db/package.json",
  "packages/read-along/tsconfig.json",
  "packages/read-along/hooks/use-read-along.ts",
  "packages/db/docker/config.json",
  "packages/db/npmrc-notes.md",
  "packages/db/src/monkey.json",
];

/**
 * Applies ignore rules to a file list with the gitignore semantics of gcloudignore.
 * @param rules The text of an ignore file.
 * @param files The relative paths.
 * @returns The paths that the upload keeps.
 */
function keptBy(rules: string, files: string[]): string[] {
  const filter = ignore().add(rules);
  return files.filter((path) => !filter.ignores(path));
}

/**
 * Checks an ignore text against the shape groups and the keep list.
 * @param rules The ignore text.
 * @returns One message for each rule that the text breaks.
 */
function checkShapes(rules: string): string[] {
  const problems: string[] = [];
  for (const [finding, paths] of Object.entries(SECRET_SHAPES)) {
    const kept = keptBy(rules, paths);
    if (kept.length > 0) problems.push(`${finding}: these enter the upload: ${kept.join(", ")}`);
  }
  const dropped = KEEP_PATHS.filter((path) => !keptBy(rules, [path]).includes(path));
  if (dropped.length > 0) problems.push(`source files leave the upload: ${dropped.join(", ")}`);
  return problems;
}

describe("P7 r4 B996 to B999: the review upload excludes the extra secret shapes", () => {
  const rules = (): string => readFileSync(resolve(repoRoot, IGNORE_REL), "utf8");
  counts.secret_shapes = Object.values(SECRET_SHAPES).flat().length;

  it("s1 B996: PKCS archives (.p12, .pfx) are excluded", () => {
    expect(keptBy(rules(), SECRET_SHAPES.B996)).toEqual([]);
  });

  it("s2 B997: service-account key files (service-account*.json, *-key.json) are excluded", () => {
    expect(keptBy(rules(), SECRET_SHAPES.B997)).toEqual([]);
  });

  it("s3 B998: token-bearing configs (.npmrc, .netrc, .docker/config.json) are excluded", () => {
    expect(keptBy(rules(), SECRET_SHAPES.B998)).toEqual([]);
  });

  it("s4 B999: private keys (id_rsa, id_ed25519, id_ecdsa, .ppk) are excluded", () => {
    expect(keptBy(rules(), SECRET_SHAPES.B999)).toEqual([]);
  });

  it("s5 the ignore rules keep normal sources, including look-alike names (positive control)", () => {
    expect(keptBy(rules(), KEEP_PATHS).sort()).toEqual([...KEEP_PATHS].sort());
  });

  it("s6 the earlier rules of round r3 still hold (characterization)", () => {
    const earlier = [
      "apps/storytime/.env",
      "apps/storytime/.env.local",
      "packages/db/.env",
      "apps/storytime/certs/server.pem",
      "packages/db/private.key",
      "apps/storytime/credentials.json",
      "apps/storytime/node_modules/x/index.js",
      "apps/storytime/.next/server/app.js",
      "apps/accounting/app/page.tsx",
    ];
    expect(keptBy(rules(), earlier)).toEqual([]);
  });

  describe("judge rows: the check kills its mutants", () => {
    const NEW_RULES = [
      "**/*.p12",
      "**/*.pfx",
      "**/service-account*.json",
      "**/*-key.json",
      "**/.npmrc",
      "**/.netrc",
      "**/.docker/",
      "**/id_rsa*",
      "**/id_ed25519*",
      "**/id_ecdsa*",
      "**/*.ppk",
    ];
    const BASE = readFileSync(resolve(repoRoot, IGNORE_REL), "utf8")
      .split("\n")
      .filter((line) => !NEW_RULES.includes(line))
      .join("\n")
      .trimEnd();
    const withRules = (rulesList: string[]): string => `${BASE}\n${rulesList.join("\n")}\n`;
    const REFERENCE = withRules(NEW_RULES);

    it("j0 a reference file with the eleven rules passes the check", () => {
      counts.upload_rule_inputs += 1;
      expect(checkShapes(REFERENCE)).toEqual([]);
    });

    const without = (...names: string[]): string[] => NEW_RULES.filter((rule) => !names.includes(rule));
    const mutants: Array<[string, string]> = [
      ["j1 the base file with no new rule", withRules([])],
      ["j2 no PKCS rules", withRules(without("**/*.p12", "**/*.pfx"))],
      ["j3 no service-account rules", withRules(without("**/service-account*.json", "**/*-key.json"))],
      ["j4 no *-key.json rule", withRules(without("**/*-key.json"))],
      ["j5 no token-config rules", withRules(without("**/.npmrc", "**/.netrc", "**/.docker/"))],
      ["j6 a root-anchored .npmrc rule", withRules([...without("**/.npmrc"), "/.npmrc"])],
      ["j7 no .docker folder rule", withRules(without("**/.docker/"))],
      ["j8 no private-key rules", withRules(without("**/id_rsa*", "**/id_ed25519*", "**/id_ecdsa*", "**/*.ppk"))],
      ["j9 no id_ecdsa rule", withRules(without("**/id_ecdsa*"))],
      ["j10 a rule that drops every json file", `${REFERENCE}**/*.json\n`],
      ["j11 a rule that drops every file with key in the name", `${REFERENCE}**/*key*\n`],
      ["j12 a rule that drops every docker folder", `${REFERENCE}**/docker/\n`],
    ];
    for (const [name, text] of mutants) {
      it(`${name} fails the check`, () => {
        counts.upload_rule_inputs += 1;
        expect(text, "the mutant must differ from the reference").not.toBe(REFERENCE);
        expect(checkShapes(text).length, "the check must report a problem").toBeGreaterThan(0);
      });
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Row group 3: N1, the declared dependency
// ---------------------------------------------------------------------------------------------

/**
 * Reads the version that the lock resolves for a dev dependency of an importer.
 * @param lock The text of pnpm-lock.yaml.
 * @param importer The importer path, for example `apps/storytime`.
 * @param name The package name.
 * @returns The resolved version without the peer suffix, or null when the importer has none.
 */
function lockedDevVersion(lock: string, importer: string, name: string): string | null {
  const lines = lock.split("\n");
  const start = lines.indexOf(`  ${importer}:`);
  if (start < 0) return null;
  let inDev = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^ {2}[^ ]/.test(line)) break;
    if (/^ {4}\S/.test(line)) inDev = line.trim() === "devDependencies:";
    if (inDev && line === `      ${name}:`) {
      const version = /^ {8}version: (.+)$/.exec(lines[i + 2] ?? "");
      return version ? version[1].replace(/\(.*$/, "") : null;
    }
  }
  return null;
}

describe("P7 r4 N1: the app declares the ignore package that its tests import", () => {
  const manifest = JSON.parse(readFileSync(resolve(app, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const lock = readFileSync(resolve(repoRoot, "pnpm-lock.yaml"), "utf8");

  it("d1 apps/storytime/package.json lists ignore in devDependencies with an exact version", () => {
    expect(manifest.devDependencies?.ignore, "devDependencies must name ignore").toBeDefined();
    expect(manifest.devDependencies?.ignore, "the version must be exact, with no range prefix").toMatch(
      /^\d+\.\d+\.\d+$/,
    );
  });

  it("d2 pnpm-lock.yaml resolves ignore for the app at the version of the manifest", () => {
    const locked = lockedDevVersion(lock, "apps/storytime", "ignore");
    expect(locked, "the importer apps/storytime must hold ignore in devDependencies").not.toBeNull();
    expect(locked, "the locked version must equal the manifest version").toBe(manifest.devDependencies?.ignore);
  });

  it("d3 the test files that import ignore live in the app that declares it (characterization)", () => {
    const importers = readdirSync(resolve(app, "__tests__")).filter((name) => {
      if (!/\.(ts|tsx)$/.test(name)) return false;
      return /from ["']ignore["']/.test(readFileSync(resolve(app, "__tests__", name), "utf8"));
    });
    expect(importers, "the app tests that import ignore").toEqual(
      expect.arrayContaining(["p7-r3-release-guards.test.ts", "p7-r4-archive-upload.test.ts"]),
    );
  });

  it("d4 control: the lock reader finds a version for a package that the app does declare", () => {
    const locked = lockedDevVersion(lock, "apps/storytime", "vitest");
    expect(locked, "the reader must find vitest for the app").toBe(manifest.devDependencies?.vitest);
  });
});
