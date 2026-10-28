/**
 * Adversarial tests for track security_upgrade_20261026, Phase 2.
 *
 * The role of this file is to break the Phase 2 claim. The claim is that the
 * upgrade adds no new failure to the ten app folders of the matrix. The
 * amendment of 2026-10-28 states the rule for a check that predates the track.
 *
 * The Phase 1 file attacks the version guard. The Red ledger test attacks the
 * shape of a ledger row. This file attacks four things that both miss.
 *
 * Attack one is the amendment attack. It checks the predates-track verdict of
 * every predates row. A new failure must not take the class predates-track.
 * The verdict needs four things. The row holds a non-zero exit code. The row
 * names a master log under the run path that holds a `master_sha=` label and
 * the pre-upgrade versions. The master log shows the same failing tests, the
 * same error count or the same failure signature. The row has an owner in
 * `measure/tech-debt.md`.
 *
 * Attack two is the ledger coverage. Every matrix pair holds exactly one row.
 * No row names a package outside the matrix. The Red test checks presence. It
 * does not check the count of the rows of one pair.
 *
 * Attack three is the exit masking. A pass row holds `exit_code=0` and a log
 * that shows no failure summary. The log holds one exit code label. The Red
 * test checks that the log holds the label. It does not check that the log
 * shows a pass.
 *
 * Attack four is the guard false pass. The real guard code fails a lockfile
 * that holds two copies of one package where one copy sits below the floor.
 * The real guard code fails a peer suffixed key. The real guard code fails a
 * workspace file that lost a required pin.
 *
 * Every checker reads the real ledger, the real logs, the real tech-debt file
 * and git. Every checker also runs on an in-memory fixture. A checker that
 * passes both inputs is vacuous. The file writes no file. The file changes no
 * production code.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";
import { GUARD_ENTRIES, type GuardEntry } from "./security-upgrade-guard-list";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRACK_ID = "security_upgrade_20261026";
const LEDGER_FILE_NAME = "verification-ledger.json";
const LOG_ROOT = `measure/runs/${TRACK_ID}`;
const P2_ROOT = `${LOG_ROOT}/p2`;
const TECH_DEBT_PATH = resolve(ROOT, "measure/tech-debt.md");
const PLAN_PATH = resolve(ROOT, "measure/tracks", TRACK_ID, "plan.md");
const GUARD_TEST_PATH = resolve(ROOT, "tests/security-upgrade-version-guard.test.ts");
const WORKSPACE_PATH = resolve(ROOT, "pnpm-workspace.yaml");
const LOCKFILE_PATH = resolve(ROOT, "pnpm-lock.yaml");

/** The four checks of the Phase 2 matrix. */
const MATRIX_CHECKS = ["check-types", "lint", "test", "build"] as const;

/** The check of a Phase 2 matrix pair. */
type MatrixCheck = (typeof MATRIX_CHECKS)[number];

/** The ten app folders of the Phase 2 matrix. */
const APP_MATRIX = [
  "accounting",
  "accounts",
  "workbooks",
  "sales-advantage",
  "storytime",
  "marketing",
  "codecamp-advantage",
  "www-reading-advantage",
  "primary-advantage",
  "reading-advantage",
] as const;

/** The seven shared packages of the Phase 2 matrix. */
const SHARED_MATRIX = [
  "@reading-advantage/utils",
  "@reading-advantage/ui",
  "@reading-advantage/db",
  "@reading-advantage/auth",
  "@reading-advantage/backend",
  "@reading-advantage/domain",
  "@reading-advantage/api",
] as const;

/** The five packages outside the app matrix. Each one holds a check-types row. */
const OUTSIDE_MATRIX = [
  "@reading-advantage/activity-runtime",
  "@reading-advantage/advantage-play-kit",
  "@reading-advantage/advantage-play-kit-3d",
  "@reading-advantage/activity-react",
  "@reading-advantage/auth-client",
] as const;

/** The packages that the ledger must cover, with the checks that each one needs. */
const REQUIRED_PAIRS: { pkg: string; check: MatrixCheck }[] = [
  ...APP_MATRIX.flatMap((app) => MATRIX_CHECKS.map((check) => ({ pkg: app, check }))),
  ...SHARED_MATRIX.flatMap((pkg) => MATRIX_CHECKS.map((check) => ({ pkg, check }))),
  ...OUTSIDE_MATRIX.map((pkg) => ({ pkg, check: "check-types" as MatrixCheck })),
];

/** The pre-upgrade version of next. A master commit holds this version. */
const PRE_UPGRADE_NEXT = "16.2.9";

/** The pre-upgrade version of sharp. A master commit holds this version. */
const PRE_UPGRADE_SHARP = "0.34.5";

/** The upgraded version of next. A master commit must not hold this version. */
const POST_UPGRADE_NEXT = "16.4.1";

/** The upgraded version of sharp. A master commit must not hold this version. */
const POST_UPGRADE_SHARP = "0.35.5";

/** One ledger row. Every field is untyped because the checker reads the value. */
interface LedgerRow {
  package?: unknown;
  check?: unknown;
  command?: unknown;
  exit_code?: unknown;
  class?: unknown;
  log?: unknown;
  evidence?: unknown;
}

/** One row with the values that the checkers need. */
interface ResolvedRow {
  /** The index of the row in the ledger. */
  index: number;
  /** The package name of the row. */
  pkg: string;
  /** The check of the row. */
  check: MatrixCheck;
  /** The class of the row. */
  cls: string;
  /** The exit code of the row. */
  exitCode: number | null;
  /** The path of the branch log of the row. */
  log: string | null;
  /** The evidence text of the row. */
  evidence: string;
}

/** The readers that the predates checker uses. */
interface PredatesContext {
  /** Reads a log. It returns null when the file is absent. */
  readLog: (path: string) => string | null;
  /** Reads the versions of a commit. It returns null when the commit is absent. */
  readCommitVersions: (sha: string) => { next: string | null; sharp: string | null } | null;
  /** The tech-debt rows that may own a ledger row. */
  techDebtEntries: TechDebtEntry[];
}

/** One tech-debt table row. */
interface TechDebtEntry {
  /** The tracks column of the row. */
  tracks: string;
  /** The body of the row. */
  body: string;
}

/** The reader for the logs of the repository. */
function readRunLog(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Returns the value of a labeled token in a text field. Null when the label is absent. */
function labeledValue(text: string | null, label: string): string | null {
  if (text === null) return null;
  const match = text.match(new RegExp(`(?:^|\\s)${label}=([^\\s]+)`));
  return match ? match[1] : null;
}

/** The labels that the evidence text of a ledger row uses. */
const EVIDENCE_LABELS = [
  "source",
  "tests",
  "test",
  "eslint_error_count",
  "warnings",
  "first_error",
  "recheck_log",
  "master_sha",
  "owner",
];

/** The marker tokens that end a failure signature in the evidence text. */
const EVIDENCE_MARKERS = [
  "same_tests_fail_on_master",
  "same_failure_on_master",
  "same_error_count_on_master",
];

/**
 * Returns the value of a labeled token that holds spaces. The value ends at
 * the next evidence label or at the next marker token.
 */
function labeledText(text: string | null, label: string): string | null {
  if (text === null) return null;
  const match = text.match(new RegExp(`(?:^|\\s)${label}=([^\\s].*)$`));
  if (!match) return null;
  let value = match[1];
  let cut = value.length;
  for (const token of [...EVIDENCE_LABELS, ...EVIDENCE_MARKERS]) {
    const at = value.indexOf(` ${token}`);
    if (at !== -1 && at < cut) cut = at;
  }
  return value.slice(0, cut).trim();
}

/** Returns the absolute path of a run log. A relative path starts at the repository root. */
function resolveLogPath(value: string): string {
  if (value.startsWith("/")) return value;
  return resolve(ROOT, value);
}

/** Compares two dotted versions as numeric segments. It returns -1, 0, or 1. */
function compareVersions(a: string, b: string): number {
  const as = a.split(".");
  const bs = b.split(".");
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const av = as[i] ?? "0";
    const bv = bs[i] ?? "0";
    const an = Number.parseInt(av, 10);
    const bn = Number.parseInt(bv, 10);
    if (Number.isNaN(an) || Number.isNaN(bn)) {
      const r = av.localeCompare(bv);
      if (r !== 0) return r < 0 ? -1 : 1;
      continue;
    }
    if (an !== bn) return an < bn ? -1 : 1;
  }
  return 0;
}

/** Returns the ledger path and the searched candidates. The archive path comes first. */
function resolveLedgerPath(): { path: string; candidates: string[] } {
  const candidates = [
    resolve(ROOT, "measure/archive", TRACK_ID, LEDGER_FILE_NAME),
    resolve(ROOT, "measure/tracks", TRACK_ID, LEDGER_FILE_NAME),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return { path: candidate, candidates };
  }
  return { path: candidates[0], candidates };
}

/** Returns the rows of a ledger. An empty array holds no row. */
function ledgerRows(ledger: unknown): unknown[] {
  if (ledger === null || typeof ledger !== "object" || Array.isArray(ledger)) return [];
  const rows = (ledger as Record<string, unknown>).rows;
  return Array.isArray(rows) ? rows : [];
}

/** Returns the string value of a ledger field. Null when the field is absent or not a string. */
function stringField(row: LedgerRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

/** Returns the resolved row values of a ledger. */
function resolveRows(ledger: unknown): ResolvedRow[] {
  const out: ResolvedRow[] = [];
  const raw = ledgerRows(ledger);
  for (let index = 0; index < raw.length; index++) {
    const value = raw[index];
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as LedgerRow;
    const check = stringField(row, "check");
    const exitCode = row.exit_code;
    out.push({
      index,
      pkg: stringField(row, "package") ?? "",
      check: (MATRIX_CHECKS as readonly string[]).includes(check ?? "") ? (check as MatrixCheck) : "check-types",
      cls: stringField(row, "class") ?? "",
      exitCode: typeof exitCode === "number" && Number.isInteger(exitCode) ? exitCode : null,
      log: stringField(row, "log"),
      evidence: stringField(row, "evidence") ?? "",
    });
  }
  return out;
}

/** Returns the tech-debt rows of the repository. */
function readTechDebtEntries(): TechDebtEntry[] {
  const text = readFileSync(TECH_DEBT_PATH, "utf8");
  const entries: TechDebtEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 7) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cells[1])) continue;
    entries.push({ tracks: cells[2], body: cells.slice(3).join(" | ") });
  }
  return entries;
}

/** Returns the versions that a commit holds in its lockfile. Null when the commit is absent. */
const COMMIT_VERSION_CACHE = new Map<string, { next: string | null; sharp: string | null } | null>();

function readCommitVersions(sha: string): { next: string | null; sharp: string | null } | null {
  if (COMMIT_VERSION_CACHE.has(sha)) return COMMIT_VERSION_CACHE.get(sha) ?? null;
  let text: string;
  try {
    text = execFileSync("git", ["show", `${sha}:pnpm-lock.yaml`], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    COMMIT_VERSION_CACHE.set(sha, null);
    return null;
  }
  const versions = {
    next: firstLockedVersion(text, "next"),
    sharp: firstLockedVersion(text, "sharp"),
  };
  COMMIT_VERSION_CACHE.set(sha, versions);
  return versions;
}

/** Returns the first locked version of a package in the packages section of a lockfile. */
function firstLockedVersion(lockfileText: string, packageName: string): string | null {
  const lines = lockfileText.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimEnd() === "packages:") {
      start = i + 1;
    } else if (start !== -1 && lines[i].trim() !== "" && !/^\s/.test(lines[i]) && lines[i].endsWith(":")) {
      end = i;
      break;
    }
  }
  if (start === -1) return null;
  for (const raw of lines.slice(start, end)) {
    if (!raw.startsWith("  ") || raw.startsWith("   ")) continue;
    let key = raw.slice(2).trimEnd();
    if (key.startsWith("'")) key = key.slice(1);
    if (key.endsWith(":")) key = key.slice(0, -1);
    if (key.endsWith("'")) key = key.slice(0, -1);
    const paren = key.indexOf("(");
    if (paren !== -1) key = key.slice(0, paren);
    const at = key.lastIndexOf("@");
    if (at <= 0) continue;
    const version = key.slice(at + 1);
    if (!/^\d/.test(version)) continue;
    if (key.slice(0, at) === packageName) return version;
  }
  return null;
}

/** Returns the significant words of a failure signature. A word holds four letters or more. */
function signatureWords(signature: string): string[] {
  return signature
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9-]/g, ""))
    .filter((word) => word.length >= 4);
}

/** Returns true when every significant word of a signature sits in a log. */
function signatureInLog(signature: string, logText: string): boolean {
  const words = signatureWords(signature);
  if (words.length < 4) return false;
  const haystack = logText.toLowerCase();
  return words.every((word) => haystack.includes(word.toLowerCase()));
}

/** Returns the labeled error count that a log shows. Null when the log shows no count. */
function logErrorCount(logText: string): number | null {
  const labeled = labeledValue(logText, "eslint_error_count");
  if (labeled !== null && /^\d+$/.test(labeled)) return Number.parseInt(labeled, 10);
  const summary = logText.match(/\((\d+) errors?\b/);
  if (summary) return Number.parseInt(summary[1], 10);
  return null;
}

/**
 * Checks the predates-track verdict of one ledger row. Each failure names the
 * reason. The checker reads the branch log, the master log, the master commit
 * and the tech-debt file.
 */
function checkPredatesRow(item: ResolvedRow, context: PredatesContext): string[] {
  const failures: string[] = [];
  const label = `row=${item.index} package=${item.pkg} check=${item.check}`;

  if (item.exitCode === null) {
    failures.push(`${label} reason=predates_row_has_no_exit_code`);
  } else if (item.exitCode === 0) {
    failures.push(`${label} exit_code=${item.exitCode} reason=predates_row_exit_code_is_zero`);
  }

  const source = labeledValue(item.evidence, "source");
  if (source === null) {
    failures.push(`${label} reason=predates_row_has_no_source`);
    return failures;
  }
  if (!source.startsWith(`${P2_ROOT}/`)) {
    failures.push(`${label} source=${source} reason=predates_source_outside_run_root expected_root=${P2_ROOT}`);
    return failures;
  }
  const masterText = context.readLog(resolveLogPath(source));
  if (masterText === null) {
    failures.push(`${label} source=${source} reason=predates_master_log_missing`);
    return failures;
  }

  const masterSha = labeledValue(masterText, "master_sha");
  if (masterSha === null) {
    failures.push(`${label} source=${source} reason=predates_master_log_has_no_master_sha`);
  } else {
    const versions = context.readCommitVersions(masterSha);
    if (versions === null) {
      failures.push(`${label} master_sha=${masterSha} reason=predates_master_commit_is_absent`);
    } else {
      const nextVersion = versions.next;
      const sharpVersion = versions.sharp;
      if (nextVersion === null || sharpVersion === null) {
        failures.push(`${label} master_sha=${masterSha} reason=predates_master_commit_holds_no_lockfile_versions`);
      } else {
        if (compareVersions(nextVersion, POST_UPGRADE_NEXT) >= 0) {
          failures.push(
            `${label} master_sha=${masterSha} next=${nextVersion} reason=predates_master_sha_is_post_upgrade expected_next=${PRE_UPGRADE_NEXT}`,
          );
        }
        if (compareVersions(sharpVersion, POST_UPGRADE_SHARP) >= 0) {
          failures.push(
            `${label} master_sha=${masterSha} sharp=${sharpVersion} reason=predates_master_sha_is_post_upgrade expected_sharp=${PRE_UPGRADE_SHARP}`,
          );
        }
      }
    }
  }

  const branchText = item.log === null ? null : context.readLog(resolveLogPath(item.log));
  if (branchText === null) {
    failures.push(`${label} log=${item.log ?? "<none>"} reason=predates_branch_log_missing`);
  }

  const testNames = labeledValue(item.evidence, "tests");
  const singleTest = labeledValue(item.evidence, "test");
  const names = testNames !== null ? testNames.split(",") : singleTest !== null ? [singleTest] : [];
  const errorCount = labeledValue(item.evidence, "eslint_error_count");
  const signature = labeledText(item.evidence, "first_error");

  if (names.length === 0 && errorCount === null && signature === null) {
    failures.push(`${label} reason=predates_row_names_no_failure`);
    return failures;
  }

  for (const name of names) {
    if (branchText !== null && !branchText.includes(name)) {
      failures.push(`${label} test=${name} reason=predates_test_missing_on_branch`);
    }
    if (!masterText.includes(name)) {
      failures.push(`${label} test=${name} reason=predates_test_missing_on_master`);
    }
  }

  if (errorCount !== null) {
    if (!/^\d+$/.test(errorCount)) {
      failures.push(`${label} eslint_error_count=${errorCount} reason=predates_error_count_is_not_a_number`);
    } else {
      const expected = Number.parseInt(errorCount, 10);
      const masterCount = logErrorCount(masterText);
      if (masterCount === null) {
        failures.push(`${label} eslint_error_count=${errorCount} reason=predates_master_log_shows_no_error_count`);
      } else if (masterCount !== expected) {
        failures.push(
          `${label} eslint_error_count=${errorCount} master_error_count=${masterCount} reason=predates_error_count_differs`,
        );
      }
      const branchCount = branchText === null ? null : logErrorCount(branchText);
      if (branchCount !== null && branchCount !== expected) {
        failures.push(
          `${label} eslint_error_count=${errorCount} branch_error_count=${branchCount} reason=predates_branch_error_count_differs`,
        );
      }
    }
  }

  if (signature !== null && names.length === 0 && errorCount === null) {
    if (branchText !== null && !signatureInLog(signature, branchText)) {
      failures.push(`${label} first_error=${signature} reason=predates_signature_missing_on_branch`);
    }
    if (!signatureInLog(signature, masterText)) {
      failures.push(`${label} first_error=${signature} reason=predates_signature_missing_on_master`);
    }
  }

  const recheckLog = labeledValue(item.evidence, "recheck_log");
  if (recheckLog !== null && context.readLog(resolveLogPath(recheckLog)) === null) {
    failures.push(`${label} recheck_log=${recheckLog} reason=predates_recheck_log_missing`);
  }

  const needle = `\`${item.pkg}\` / ${item.check}`;
  const owned = context.techDebtEntries.some(
    (entry) => entry.tracks.includes(TRACK_ID) && entry.body.includes(needle),
  );
  if (!owned) {
    failures.push(`${label} reason=predates_row_has_no_owner`);
  }

  return failures;
}

/** Checks the coverage of the ledger. Each failure names the reason. */
function checkLedgerCoverage(ledger: unknown): string[] {
  const failures: string[] = [];
  const rows = resolveRows(ledger);
  const counts = new Map<string, number>();
  for (const item of rows) {
    const key = `${item.pkg} / ${item.check}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const pair of REQUIRED_PAIRS) {
    const key = `${pair.pkg} / ${pair.check}`;
    const count = counts.get(key) ?? 0;
    if (count === 0) {
      failures.push(`package=${pair.pkg} check=${pair.check} reason=missing_row`);
    } else if (count > 1) {
      failures.push(`package=${pair.pkg} check=${pair.check} rows=${count} reason=duplicate_row`);
    }
  }
  const known = new Set(REQUIRED_PAIRS.map((pair) => `${pair.pkg} / ${pair.check}`));
  for (const item of rows) {
    const key = `${item.pkg} / ${item.check}`;
    if (!known.has(key)) {
      failures.push(`row=${item.index} package=${item.pkg} check=${item.check} reason=row_outside_matrix`);
    }
  }
  return failures;
}

/** The failure markers that a pass log must not hold. */
const FAILURE_MARKERS: { name: string; pattern: RegExp }[] = [
  { name: "vitest_test_files_failed", pattern: /\bTest Files:?\s+\d+\s+failed\b/i },
  { name: "tests_failed", pattern: /\bTests:?\s+\d+\s+failed\b/i },
  { name: "jest_test_suites_failed", pattern: /\bTest Suites:?\s+\d+\s+failed\b/i },
  { name: "fail_marker", pattern: /(?:^|\s)FAIL(?:\s|$)/ },
  { name: "failed_marker", pattern: /(?:^|\s)failed(?:\s|$)/i },
  { name: "npm_error", pattern: /npm ERR!/ },
  { name: "lifecycle_error", pattern: /ELIFECYCLE/ },
];

/**
 * Checks the log of a pass row. The log holds one exit code label and no
 * failure marker. Each failure names the reason.
 */
function checkPassLog(logText: string): string[] {
  const failures: string[] = [];
  const labels = logText.match(/(?:^|\s)exit_code=(\S+)/g) ?? [];
  if (labels.length === 0) {
    failures.push("reason=pass_log_has_no_exit_code");
  } else if (labels.length > 1) {
    const values = labels.map((label) => label.replace(/^\s*exit_code=/, ""));
    failures.push(`exit_codes=${values.join(",")} reason=pass_log_has_two_exit_codes`);
  }
  for (const marker of FAILURE_MARKERS) {
    if (marker.pattern.test(logText)) {
      failures.push(`marker=${marker.name} reason=pass_log_holds_failure_summary`);
    }
  }
  return failures;
}

/** Checks the logs of every pass row of a ledger. */
function checkPassLogs(ledger: unknown, readLog: (path: string) => string | null): string[] {
  const failures: string[] = [];
  for (const item of resolveRows(ledger)) {
    if (item.cls !== "pass") continue;
    if (item.log === null) {
      failures.push(`row=${item.index} package=${item.pkg} check=${item.check} reason=pass_row_has_no_log`);
      continue;
    }
    const text = readLog(resolveLogPath(item.log));
    if (text === null) {
      failures.push(`row=${item.index} package=${item.pkg} check=${item.check} reason=pass_log_missing`);
      continue;
    }
    for (const failure of checkPassLog(text)) {
      failures.push(`row=${item.index} package=${item.pkg} check=${item.check} ${failure}`);
    }
  }
  return failures;
}

/** Returns the class counts of a ledger. */
function classCounts(ledger: unknown): Record<string, number> {
  const counts: Record<string, number> = {
    pass: 0,
    "predates-track": 0,
    "upgrade-defect": 0,
    "not-run": 0,
    "script-absent": 0,
    other: 0,
  };
  for (const item of resolveRows(ledger)) {
    if (item.cls in counts) counts[item.cls]++;
    else counts.other++;
  }
  return counts;
}

/**
 * Checks the plan text of the track. The plan must not claim that all checks
 * pass. The plan must name the class counts of the ledger.
 */
function checkPlanText(planText: string, counts: Record<string, number>): string[] {
  const failures: string[] = [];
  const forbidden = ["all checks pass", "all tests pass", "everything passes"];
  const lower = planText.toLowerCase();
  for (const phrase of forbidden) {
    if (lower.includes(phrase)) {
      failures.push(`phrase=${phrase} reason=plan_claims_all_checks_pass`);
    }
  }
  const claims: { label: string; value: number }[] = [
    { label: "pass", value: counts.pass },
    { label: "predates-track", value: counts["predates-track"] },
    { label: "upgrade-defect", value: counts["upgrade-defect"] },
    { label: "not-run", value: counts["not-run"] },
    { label: "script-absent", value: counts["script-absent"] },
  ];
  for (const claim of claims) {
    const pattern = new RegExp(`\\b${claim.value}\\s+${claim.label}\\b`);
    if (!pattern.test(planText)) {
      failures.push(`count=${claim.value} class=${claim.label} reason=plan_does_not_name_the_class_count`);
    }
  }
  return failures;
}

/* -------------------------------------------------------------------------- */
/* The guard harness                                                          */
/* -------------------------------------------------------------------------- */

/** The names of the guard functions that the harness loads. */
const GUARD_FUNCTION_NAMES = [
  "compareVersions",
  "extractPackagesSection",
  "parseLockedVersions",
  "evaluateGuard",
  "parseFlatBlock",
  "evaluateOverrideContract",
];

/** Extracts a top level block from the source of the guard test. */
function extractBlock(src: string, header: string): string {
  const at = src.indexOf(header);
  if (at === -1) throw new Error(`the guard source holds no block ${header}`);
  const lineStart = src.lastIndexOf("\n", at) + 1;
  const bodyStart = src.indexOf("{", at);
  if (bodyStart === -1) throw new Error(`the guard source holds no body for ${header}`);
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(lineStart, i + 1);
    }
  }
  throw new Error(`the guard source holds no end for ${header}`);
}

/**
 * Loads the real guard code from the source file of the guard test. The code
 * is not copied and not edited. The TypeScript compiler removes the type
 * marks. The function bodies stay the same as the ones that the guard runs.
 */
function loadGuardImplementation(): Record<string, unknown> {
  const src = readFileSync(GUARD_TEST_PATH, "utf8");
  const parts = GUARD_FUNCTION_NAMES.map((name) => extractBlock(src, `function ${name}(`));
  const code = parts.join("\n\n");
  const require = createRequire(import.meta.url);
  const ts = require("typescript") as typeof import("typescript");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/m, "");
  const factory = new Function(
    `${transpiled}\nreturn { ${GUARD_FUNCTION_NAMES.join(", ")} };`,
  ) as () => Record<string, unknown>;
  return factory();
}

/** The type of the loaded guard code. */
type GuardImplementation = {
  extractPackagesSection: (src: string) => string;
  parseLockedVersions: (section: string) => Map<string, string[]>;
  evaluateGuard: (locked: Map<string, string[]>, entries: GuardEntry[]) => string[];
  parseFlatBlock: (src: string, blockName: string) => Record<string, string>;
  evaluateOverrideContract: (
    actual: Record<string, string>,
    required: Record<string, string>,
    entries: GuardEntry[],
  ) => string[];
};

/** The ten override pins that the guard contract requires. */
const REQUIRED_OVERRIDE_PINS: Record<string, string> = {
  "drizzle-orm": "0.45.2",
  next: "16.4.1",
  react: "19.2.9",
  "react-dom": "19.2.9",
  vitest: "4.1.8",
  vite: "8.1.6",
  typescript: "5.9.3",
  "@types/react": "19.2.2",
  "@types/react-dom": "19.2.2",
  "@vitejs/plugin-react": "6.0.3",
};

/* -------------------------------------------------------------------------- */
/* The in-memory fixtures                                                     */
/* -------------------------------------------------------------------------- */

/** Builds a ledger that holds one pass row for every matrix pair. */
function buildGoodLedger(): { ledger: Record<string, unknown>; logs: Map<string, string> } {
  const logs = new Map<string, string>();
  const rows: Record<string, unknown>[] = [];
  for (const pair of REQUIRED_PAIRS) {
    const logPath = `${P2_ROOT}/fixture-${pair.pkg}-${pair.check}.log`;
    logs.set(resolve(ROOT, logPath), `command=fixture\nexit_code=0\n`);
    rows.push({
      package: pair.pkg,
      check: pair.check,
      command: `pnpm --filter ${pair.pkg} run ${pair.check}`,
      exit_code: 0,
      class: "pass",
      log: logPath,
    });
  }
  return { ledger: { track: TRACK_ID, phase: "phase-2", rows }, logs };
}

/** Returns a copy of a synthetic ledger. */
function copyLedger(ledger: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(ledger)) as Record<string, unknown>;
}

/** Returns the reader for a synthetic log store. */
function syntheticReader(logs: Map<string, string>): (path: string) => string | null {
  return (path: string) => logs.get(path) ?? null;
}

/** Returns the row of a synthetic ledger for a package and a check. */
function rowOf(ledger: Record<string, unknown>, pkg: string, check: MatrixCheck): Record<string, unknown> {
  const rows = ledgerRows(ledger) as Record<string, unknown>[];
  const row = rows.find((candidate) => candidate.package === pkg && candidate.check === check);
  if (!row) throw new Error(`fixture: no row for package=${pkg} check=${check}`);
  return row;
}

/** Returns the resolved row of a synthetic ledger for a package and a check. */
function resolvedRowOf(ledger: Record<string, unknown>, pkg: string, check: MatrixCheck): ResolvedRow {
  const row = resolveRows(ledger).find((item) => item.pkg === pkg && item.check === check);
  if (!row) throw new Error(`fixture: no resolved row for package=${pkg} check=${check}`);
  return row;
}

/** Builds a predates-track fixture with a branch log and a master log. */
function buildPredatesFixture(options: {
  /** The names of the failing tests. */
  tests?: string[];
  /** The labeled error count of the evidence. */
  errorCount?: number;
  /** The failure signature of the evidence. */
  signature?: string;
  /** The master log text. The default holds the master_sha label and the tests. */
  masterText?: string;
  /** The branch log text. The default holds the exit code and the tests. */
  branchText?: string;
  /** The evidence text. The default names the source, the tests and the master commit. */
  evidence?: string;
  /** The versions that the master commit holds. */
  commitVersions?: { next: string | null; sharp: string | null } | null;
  /** The tech-debt rows. The default holds one owner row. */
  techDebtEntries?: TechDebtEntry[];
}): { row: ResolvedRow; context: PredatesContext; logs: Map<string, string> } {
  const masterPath = `${P2_ROOT}/fixture-master.log`;
  const branchPath = `${P2_ROOT}/fixture-branch.log`;
  const sha = "1111111111111111111111111111111111111111";
  const tests = options.tests ?? [];
  const names = tests.join(",");
  const masterText =
    options.masterText ??
    `master_sha=${sha}\n${tests.map((name) => `FAIL ${name}`).join("\n")}\nexit_code=1\n`;
  const branchText = options.branchText ?? `exit_code=1\n${tests.map((name) => `FAIL ${name}`).join("\n")}\n`;
  const evidence =
    options.evidence ??
    `source=${masterPath} ${tests.length > 0 ? `tests=${names} ` : ""}${
      options.errorCount !== undefined ? `eslint_error_count=${options.errorCount} ` : ""
    }${options.signature !== undefined ? `first_error=${options.signature} ` : ""}master_sha=${sha}`;
  const logs = new Map<string, string>([
    [resolve(ROOT, masterPath), masterText],
    [resolve(ROOT, branchPath), branchText],
  ]);
  const row: ResolvedRow = {
    index: 0,
    pkg: "accounting",
    check: "test",
    cls: "predates-track",
    exitCode: 1,
    log: branchPath,
    evidence,
  };
  const commitVersions = options.commitVersions === undefined
    ? { next: PRE_UPGRADE_NEXT, sharp: PRE_UPGRADE_SHARP }
    : options.commitVersions;
  const context: PredatesContext = {
    readLog: syntheticReader(logs),
    readCommitVersions: () => commitVersions,
    techDebtEntries:
      options.techDebtEntries ?? [{ tracks: TRACK_ID, body: "`accounting` / test some failure" }],
  };
  return { row, context, logs };
}

/** Returns true when the failures hold a reason label. */
function hasReason(failures: string[], reason: string): boolean {
  return failures.some((failure) => failure.includes(`reason=${reason}`));
}

/* -------------------------------------------------------------------------- */
/* The live inputs                                                            */
/* -------------------------------------------------------------------------- */

const LEDGER = resolveLedgerPath();
const LEDGER_TEXT = existsSync(LEDGER.path) ? readFileSync(LEDGER.path, "utf8") : "";
const LEDGER_JSON = LEDGER_TEXT ? (JSON.parse(LEDGER_TEXT) as unknown) : null;
const TECH_DEBT_ENTRIES = readTechDebtEntries();

/* -------------------------------------------------------------------------- */
/* The tests                                                                  */
/* -------------------------------------------------------------------------- */

describe("the predates-track verdict of the amendment", () => {
  const context: PredatesContext = {
    readLog: readRunLog,
    readCommitVersions: readCommitVersions,
    techDebtEntries: TECH_DEBT_ENTRIES,
  };

  it("holds the real ledger and the real tech-debt file", () => {
    expect(existsSync(LEDGER.path)).toBe(true);
    expect(LEDGER_JSON).not.toBeNull();
    expect(TECH_DEBT_ENTRIES.length).toBeGreaterThan(0);
  });

  it("fails a synthetic row whose master log is missing", () => {
    const { row, context: local } = buildPredatesFixture({ tests: ["one.test.ts"] });
    local.readLog = (path: string) => (path.endsWith("fixture-master.log") ? null : "exit_code=1\n");
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_master_log_missing")).toBe(true);
  });

  it("fails a synthetic row whose master log holds no master_sha label", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      masterText: "FAIL one.test.ts\nexit_code=1\n",
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_master_log_has_no_master_sha")).toBe(true);
  });

  it("fails a synthetic row whose master commit holds post-upgrade versions", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      commitVersions: { next: POST_UPGRADE_NEXT, sharp: POST_UPGRADE_SHARP },
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_master_sha_is_post_upgrade")).toBe(true);
  });

  it("fails a synthetic row whose master log shows another failure", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      masterText: "master_sha=1111111111111111111111111111111111111111\nFAIL another.test.ts\nexit_code=1\n",
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_test_missing_on_master")).toBe(true);
  });

  it("fails a synthetic row whose master log shows another error count", () => {
    const { row, context: local } = buildPredatesFixture({
      errorCount: 13,
      masterText:
        "master_sha=1111111111111111111111111111111111111111\n✖ 900 problems (12 errors, 864 warnings)\nexit_code=1\n",
      branchText: "exit_code=1\n✖ 877 problems (13 errors, 864 warnings)\n",
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_error_count_differs")).toBe(true);
  });

  it("fails a synthetic row whose error count holds no label", () => {
    const { row, context: local } = buildPredatesFixture({
      evidence: `source=${P2_ROOT}/fixture-master.log master_sha=1111111111111111111111111111111111111111`,
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_row_names_no_failure")).toBe(true);
  });

  it("fails a synthetic row that has no owner in the tech-debt file", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      techDebtEntries: [{ tracks: TRACK_ID, body: "`accounting` / lint some failure" }],
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_row_has_no_owner")).toBe(true);
  });

  it("fails a synthetic row whose source sits outside the run path", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      evidence: "source=measure/tracks/security_upgrade_20261026/notes.log tests=one.test.ts master_sha=1111111111111111111111111111111111111111",
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_source_outside_run_root")).toBe(true);
  });

  it("fails a synthetic row whose exit code is zero", () => {
    const { row, context: local } = buildPredatesFixture({ tests: ["one.test.ts"] });
    row.exitCode = 0;
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_row_exit_code_is_zero")).toBe(true);
  });

  it("fails a synthetic row whose recheck log is missing", () => {
    const { row, context: local } = buildPredatesFixture({
      tests: ["one.test.ts"],
      evidence: `source=${P2_ROOT}/fixture-master.log recheck_log=${P2_ROOT}/fixture-recheck.log tests=one.test.ts master_sha=1111111111111111111111111111111111111111`,
    });
    const failures = checkPredatesRow(row, local);
    expect(hasReason(failures, "predates_recheck_log_missing")).toBe(true);
  });

  it("passes a synthetic row that holds every condition", () => {
    const { row, context: local } = buildPredatesFixture({ tests: ["one.test.ts"] });
    expect(checkPredatesRow(row, local)).toEqual([]);
  });

  it("passes every predates row of the real ledger", () => {
    const rows = resolveRows(LEDGER_JSON).filter((item) => item.cls === "predates-track");
    expect(rows.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const item of rows) {
      failures.push(...checkPredatesRow(item, context));
    }
    if (failures.length > 0) {
      throw new Error(`predates verdict failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });

  it("holds the master commit of every real predates row at the pre-upgrade versions", () => {
    const rows = resolveRows(LEDGER_JSON).filter((item) => item.cls === "predates-track");
    const shas = new Set<string>();
    for (const item of rows) {
      const source = labeledValue(item.evidence, "source");
      if (source === null) continue;
      const text = readRunLog(resolveLogPath(source));
      if (text === null) continue;
      const sha = labeledValue(text, "master_sha");
      if (sha !== null) shas.add(sha);
    }
    expect(shas.size).toBeGreaterThan(0);
    for (const sha of shas) {
      const versions = readCommitVersions(sha);
      expect(versions).not.toBeNull();
      expect(versions?.next).toBe(PRE_UPGRADE_NEXT);
      expect(versions?.sharp).toBe(PRE_UPGRADE_SHARP);
    }
  });
});

describe("the ledger covers every matrix pair exactly once", () => {
  it("fails a synthetic ledger that holds two rows for one pair", () => {
    const { ledger } = buildGoodLedger();
    const rows = ledgerRows(ledger) as Record<string, unknown>[];
    const copy = { ...rowOf(ledger, "accounting", "test") };
    rows.push(copy);
    const failures = checkLedgerCoverage(ledger);
    expect(hasReason(failures, "duplicate_row")).toBe(true);
    expect(failures.some((failure) => failure.includes("package=accounting") && failure.includes("check=test"))).toBe(true);
  });

  it("fails a synthetic ledger that holds a row outside the matrix", () => {
    const { ledger } = buildGoodLedger();
    const rows = ledgerRows(ledger) as Record<string, unknown>[];
    rows.push({
      package: "apps/not-in-the-matrix",
      check: "test",
      command: "pnpm --filter not-in-the-matrix run test",
      exit_code: 0,
      class: "pass",
      log: `${P2_ROOT}/fixture-not-in-the-matrix-test.log`,
    });
    const failures = checkLedgerCoverage(ledger);
    expect(hasReason(failures, "row_outside_matrix")).toBe(true);
  });

  it("fails a synthetic ledger without the row of a matrix pair", () => {
    const { ledger } = buildGoodLedger();
    ledger.rows = (ledgerRows(ledger) as Record<string, unknown>[]).filter(
      (row) => !(row.package === "marketing" && row.check === "build"),
    );
    const failures = checkLedgerCoverage(ledger);
    expect(hasReason(failures, "missing_row")).toBe(true);
  });

  it("passes a synthetic ledger that holds one row for every pair", () => {
    const { ledger } = buildGoodLedger();
    expect(checkLedgerCoverage(ledger)).toEqual([]);
  });

  it("passes the real ledger", () => {
    const failures = checkLedgerCoverage(LEDGER_JSON);
    if (failures.length > 0) {
      throw new Error(`ledger coverage failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });

  it("holds one row for each of the 73 matrix pairs of the real ledger", () => {
    const rows = resolveRows(LEDGER_JSON);
    expect(rows.length).toBe(REQUIRED_PAIRS.length);
    expect(REQUIRED_PAIRS.length).toBe(73);
  });
});

describe("a pass row cannot hide a failure behind an exit code of zero", () => {
  it("fails a synthetic log that holds a vitest test file failure", () => {
    const failures = checkPassLog("exit_code=0\n Test Files  1 failed (1)\n");
    expect(hasReason(failures, "pass_log_holds_failure_summary")).toBe(true);
    expect(failures.join("\n")).toContain("marker=vitest_test_files_failed");
  });

  it("fails a synthetic log that holds a jest test suite failure", () => {
    const failures = checkPassLog("exit_code=0\nTest Suites: 2 failed, 5 passed\n");
    expect(hasReason(failures, "pass_log_holds_failure_summary")).toBe(true);
  });

  it("fails a synthetic log that holds a FAIL marker", () => {
    const failures = checkPassLog("exit_code=0\nFAIL src/one.test.ts\n");
    expect(hasReason(failures, "pass_log_holds_failure_summary")).toBe(true);
  });

  it("fails a synthetic log that holds two exit code labels", () => {
    const failures = checkPassLog("exit_code=0\nexit_code=1\n");
    expect(hasReason(failures, "pass_log_has_two_exit_codes")).toBe(true);
  });

  it("fails a synthetic log that holds no exit code label", () => {
    const failures = checkPassLog("command=next build\n");
    expect(hasReason(failures, "pass_log_has_no_exit_code")).toBe(true);
  });

  it("passes a synthetic log that holds one exit code and no failure", () => {
    expect(checkPassLog("command=next build\nexit_code=0\n")).toEqual([]);
  });

  it("passes every pass row of the real ledger", () => {
    const failures = checkPassLogs(LEDGER_JSON, readRunLog);
    if (failures.length > 0) {
      throw new Error(`pass log failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });

  it("holds one exit code label in every pass log of the real ledger", () => {
    const rows = resolveRows(LEDGER_JSON).filter((item) => item.cls === "pass");
    expect(rows.length).toBeGreaterThan(0);
    for (const item of rows) {
      const text = item.log === null ? null : readRunLog(resolveLogPath(item.log));
      expect(text, `row=${item.index} package=${item.pkg}`).not.toBeNull();
      const labels = text?.match(/(?:^|\s)exit_code=(\S+)/g) ?? [];
      expect(labels.length, `row=${item.index} package=${item.pkg} log=${item.log}`).toBe(1);
    }
  });
});

describe("the plan names the class counts and holds no pass claim", () => {
  it("fails a synthetic plan that claims that all checks pass", () => {
    const failures = checkPlanText("All checks pass for the ten app folders.", classCounts(LEDGER_JSON));
    expect(hasReason(failures, "plan_claims_all_checks_pass")).toBe(true);
  });

  it("fails a synthetic plan that does not name the class counts", () => {
    const failures = checkPlanText("The ledger holds some rows.", classCounts(LEDGER_JSON));
    expect(hasReason(failures, "plan_does_not_name_the_class_count")).toBe(true);
  });

  it("passes the real plan of the track", () => {
    const planText = readFileSync(PLAN_PATH, "utf8");
    const failures = checkPlanText(planText, classCounts(LEDGER_JSON));
    if (failures.length > 0) {
      throw new Error(`plan text failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });
});

describe("the real guard code fails the false passes of the guard", () => {
  let guard: GuardImplementation;

  beforeAll(() => {
    const loaded = loadGuardImplementation();
    for (const name of GUARD_FUNCTION_NAMES) {
      if (loaded[name] === undefined) throw new Error(`the guard source holds no ${name}`);
    }
    guard = loaded as unknown as GuardImplementation;
  });

  it("fails a lockfile that holds two copies of next and one sits below the floor", () => {
    const text = [
      "packages:",
      "",
      "  next@16.4.1:",
      "    resolution: {integrity: sha512-x}",
      "",
      "  next@16.2.9:",
      "    resolution: {integrity: sha512-y}",
      "",
    ].join("\n");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "next");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("locked=16.2.9");
    expect(message).toContain("fixed=16.4.1");
  });

  it("fails a lockfile that holds two copies of sharp and one sits below the floor", () => {
    const text = [
      "packages:",
      "",
      "  sharp@0.35.5:",
      "    resolution: {integrity: sha512-x}",
      "",
      "  sharp@0.34.5:",
      "    resolution: {integrity: sha512-y}",
      "",
    ].join("\n");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "sharp");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("locked=0.34.5");
    expect(message).toContain("fixed=0.35.5");
  });

  it("fails a lockfile that holds a peer suffixed key below the floor", () => {
    const text = [
      "packages:",
      "",
      "  sharp@0.34.5(@types/node@20.19.43):",
      "    resolution: {integrity: sha512-x}",
      "",
    ].join("\n");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "sharp");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("locked=0.34.5");
  });

  it("fails closed on a lockfile that holds an npm alias key below the floor", () => {
    const text = [
      "packages:",
      "",
      "  next@npm:next@16.2.9:",
      "    resolution: {integrity: sha512-x}",
      "",
    ].join("\n");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "next");
    const failures = guard.evaluateGuard(locked, entries);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("next");
  });

  it("records that an npm alias copy hides below the floor when a good copy is present", () => {
    // The guard reads the package key before the last at sign. The key
    // `next@npm:next@16.2.9` names the package `next@npm:next`, so the copy
    // stays outside the floor of next. The guard passes. The workspace
    // override pins next to the exact version 16.4.1, so pnpm cannot write
    // this key form. The limitation is a nonblocking finding of this pass.
    const text = [
      "packages:",
      "",
      "  next@16.4.1:",
      "    resolution: {integrity: sha512-x}",
      "",
      "  next@npm:next@16.2.9:",
      "    resolution: {integrity: sha512-y}",
      "",
    ].join("\n");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "next");
    const failures = guard.evaluateGuard(locked, entries);
    expect(failures).toEqual([]);
    expect(locked.get("next")).toEqual(["16.4.1"]);
  });

  it("fails a workspace file that lost the next pin", () => {
    const text = [
      "overrides:",
      "  drizzle-orm: 0.45.2",
      "  react: 19.2.9",
      "  react-dom: 19.2.9",
      "",
    ].join("\n");
    const overrides = guard.parseFlatBlock(text, "overrides");
    const message = guard.evaluateOverrideContract(overrides, REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES).join("\n");
    expect(message).toContain("key=next");
    expect(message).toContain("actual=missing");
  });

  it("fails a workspace file that lost the react-dom pin", () => {
    const text = Object.entries(REQUIRED_OVERRIDE_PINS)
      .filter(([key]) => key !== "react-dom")
      .map(([key, value]) => `  ${key}: ${value}`)
      .join("\n");
    const overrides = guard.parseFlatBlock(`overrides:\n${text}\n`, "overrides");
    const message = guard.evaluateOverrideContract(overrides, REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES).join("\n");
    expect(message).toContain("key=react-dom");
    expect(message).toContain("actual=missing");
  });

  it("passes the real workspace file of the repository", () => {
    const text = readFileSync(WORKSPACE_PATH, "utf8");
    const overrides = guard.parseFlatBlock(text, "overrides");
    expect(guard.evaluateOverrideContract(overrides, REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES)).toEqual([]);
  });

  it("passes the real lockfile of the repository", () => {
    const text = readFileSync(LOCKFILE_PATH, "utf8");
    const locked = guard.parseLockedVersions(guard.extractPackagesSection(text));
    expect(guard.evaluateGuard(locked, GUARD_ENTRIES)).toEqual([]);
  });
});
