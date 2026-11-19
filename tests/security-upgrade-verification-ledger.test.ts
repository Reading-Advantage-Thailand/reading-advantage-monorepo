/**
 * Red test for track security_upgrade_20261026, phase 2.
 *
 * The test reads the Phase 2 verification ledger.
 * The ledger file is absent at the Red run. The live test fails for that reason.
 * The refutation fixtures use synthetic ledgers in memory. They read no file.
 *
 * The ledger is an artifact. The live app logs are the proof of AC-5.
 * A green ledger test does not close AC-5.
 *
 * The row fields follow the Phase 2 strategy.
 * Each row holds `package`, `command`, `exit_code`, `class` and `log`.
 * A row holds `check` when its `command` names the run and not the matrix check.
 * A row holds `evidence` with a `source=` label when the class is not `pass`.
 * A row holds `script_heap` and `run_heap` when the package script sets a heap.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRACK_ID = "security_upgrade_20261026";
const LEDGER_FILE_NAME = "verification-ledger.json";
const LOG_ROOT = `measure/runs/${TRACK_ID}`;

/** The five classes that the Phase 2 strategy allows for a ledger row. */
const ALLOWED_CLASSES = ["pass", "predates-track", "upgrade-defect", "not-run", "script-absent"] as const;

/** The four checks of the Phase 2 matrix. */
const MATRIX_CHECKS = ["check-types", "lint", "test", "build"] as const;

/** The class of a ledger row. */
type LedgerClass = (typeof ALLOWED_CLASSES)[number];

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

/** The heap that a package script requests. The key names the package and the check. */
const SCRIPT_HEAPS: Record<string, number> = {
  "primary-advantage|check-types": 6144,
  "primary-advantage|build": 4096,
  "reading-advantage|build": 8192,
};

/** The exit code of a command that reaches its time bound. */
const TIMEOUT_EXIT_CODE = 124;

/** The exit code of a command that the kernel kills. */
const MACHINE_HEAP_EXIT_CODE = 137;

/** The three sources that a not-run row may carry. */
const NOT_RUN_SOURCES = ["timeout", "machine_heap", "not-run"] as const;

/** A key name that holds a hash. The ledger holds no hash field. */
const HASH_KEY_PATTERN = /hash|checksum|digest|sha256/i;

/** One pair of the Phase 2 matrix. */
interface MatrixPair {
  /** The canonical package key of the pair. */
  key: string;
  /** The values that the row `package` field may hold for this package. */
  aliases: string[];
  /** The check of the pair. */
  check: MatrixCheck;
  /** The heap that the package script requests. Null when the script sets no heap. */
  scriptHeap: number | null;
}

/** One ledger row. Every field is untyped because the test checks the value. */
interface LedgerRow {
  package?: unknown;
  check?: unknown;
  command?: unknown;
  exit_code?: unknown;
  class?: unknown;
  log?: unknown;
  evidence?: unknown;
  script_heap?: unknown;
  run_heap?: unknown;
}

/** One row with the pair that it names. */
interface ResolvedRow {
  /** The index of the row in the ledger. */
  index: number;
  /** The row itself. */
  row: LedgerRow;
  /** The matrix pair of the row. Null when the row names no pair. */
  pair: MatrixPair | null;
  /** The check of the row. Null when the row names no check. */
  check: MatrixCheck | null;
  /** The package name of the row. Null when the field is absent. */
  pkg: string | null;
  /** The class of the row. Null when the field is absent. */
  cls: string | null;
}

/** The reader that the validator uses for the run logs. */
interface ValidateOptions {
  /** Reads a run log. It returns null when the file is absent. */
  readLog: (path: string) => string | null;
  /**
   * True when the run logs are local only. `measure/runs/` is gitignored, so a
   * clean checkout holds no log. The row must then pass on the committed
   * record alone. A log that is present is still checked in full.
   */
  logFileOptional?: boolean;
}

/** Returns the accepted row `package` values of an app folder. */
function appAliases(name: string): string[] {
  return [name, `apps/${name}`];
}

/** Returns the accepted row `package` values of a workspace package. */
function packageAliases(name: string): string[] {
  const short = name.replace("@reading-advantage/", "");
  return [name, `packages/${short}`, short];
}

/** Returns true when the pair has no check script in the package manifest. */
function isScriptAbsentPair(pair: MatrixPair): boolean {
  if (pair.check !== "check-types") return false;
  return pair.key === "@reading-advantage/ui" || pair.key === "@reading-advantage/utils";
}

/** Builds the list of the required matrix pairs. */
function buildPairs(): MatrixPair[] {
  const pairs: MatrixPair[] = [];
  for (const app of APP_MATRIX) {
    for (const check of MATRIX_CHECKS) {
      pairs.push({
        key: app,
        aliases: appAliases(app),
        check,
        scriptHeap: SCRIPT_HEAPS[`${app}|${check}`] ?? null,
      });
    }
  }
  for (const pkg of SHARED_MATRIX) {
    for (const check of MATRIX_CHECKS) {
      pairs.push({ key: pkg, aliases: packageAliases(pkg), check, scriptHeap: null });
    }
  }
  for (const pkg of OUTSIDE_MATRIX) {
    pairs.push({ key: pkg, aliases: packageAliases(pkg), check: "check-types", scriptHeap: null });
  }
  return pairs;
}

/** The pairs that the ledger must cover. */
const REQUIRED_PAIRS = buildPairs();

/** Returns the string value of a ledger field. Null when the field is absent or not a string. */
function stringField(row: LedgerRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

/** Returns the integer value of a ledger field. Null when the field is absent or not an integer. */
function integerField(row: LedgerRow, key: string): number | null {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

/** Returns the value of a labeled token in a text field. Null when the label is absent. */
function labeledValue(text: string | null, label: string): string | null {
  if (text === null) return null;
  const match = text.match(new RegExp(`(?:^|\\s)${label}=([^\\s]+)`));
  return match ? match[1] : null;
}

/** Returns the absolute path of a run log. A relative path starts at the repository root. */
function resolveLogPath(value: string): string {
  if (value.startsWith("/")) return value;
  return resolve(ROOT, value);
}

/** Returns the matrix pair and the check of a ledger row. */
function resolvePair(row: LedgerRow): { pair: MatrixPair | null; check: MatrixCheck | null } {
  const pkg = stringField(row, "package");
  const checkField = stringField(row, "check");
  const command = stringField(row, "command");
  let check: MatrixCheck | null = null;
  if (checkField !== null && (MATRIX_CHECKS as readonly string[]).includes(checkField)) {
    check = checkField as MatrixCheck;
  } else if (command !== null && (MATRIX_CHECKS as readonly string[]).includes(command)) {
    check = command as MatrixCheck;
  }
  if (pkg === null || check === null) return { pair: null, check };
  const candidates = REQUIRED_PAIRS.filter((pair) => pair.aliases.includes(pkg));
  const pair = candidates.find((candidate) => candidate.check === check) ?? null;
  return { pair, check };
}

/** Returns the failures for the hash fields of an object. The ledger holds no hash field. */
function hashFieldFailures(value: Record<string, unknown>, label: string): string[] {
  const failures: string[] = [];
  for (const key of Object.keys(value)) {
    if (HASH_KEY_PATTERN.test(key)) {
      failures.push(`${label} field=${key} reason=ledger_has_hash_field`);
    }
  }
  return failures;
}

/** Checks one ledger row against the class rules of the Phase 2 strategy. */
function validateRow(item: ResolvedRow, options: ValidateOptions): string[] {
  const failures: string[] = [];
  const label = `row=${item.index}`;
  const row = item.row;
  const pkg = item.pkg ?? "<none>";
  const check = item.check ?? "<none>";
  const cls = item.cls;

  if (item.pkg === null) failures.push(`${label} reason=missing_field field=package`);
  if (stringField(row, "command") === null) failures.push(`${label} reason=missing_field field=command`);
  if (!("exit_code" in row)) failures.push(`${label} reason=missing_field field=exit_code`);
  if (cls === null) {
    failures.push(`${label} package=${pkg} reason=missing_field field=class`);
    return failures;
  }
  if (!(ALLOWED_CLASSES as readonly string[]).includes(cls)) {
    failures.push(`${label} package=${pkg} check=${check} class=${cls} reason=class_not_allowed`);
    return failures;
  }

  const knownPackage = REQUIRED_PAIRS.some((pair) => pair.aliases.includes(pkg));
  if (item.pair === null && knownPackage) {
    failures.push(`${label} package=${pkg} reason=row_has_no_matrix_check checks=${MATRIX_CHECKS.join(",")}`);
  }

  const exitCode = integerField(row, "exit_code");
  const log = stringField(row, "log");
  const evidence = stringField(row, "evidence");
  const scriptHeap = integerField(row, "script_heap");
  const runHeap = integerField(row, "run_heap");
  const expectedHeap = item.pair ? item.pair.scriptHeap : null;

  if (expectedHeap !== null) {
    if (scriptHeap === null) {
      failures.push(`${label} package=${pkg} check=${check} reason=script_heap_missing expected_script_heap=${expectedHeap}`);
    } else if (scriptHeap !== expectedHeap) {
      failures.push(
        `${label} package=${pkg} check=${check} reason=script_heap_mismatch expected_script_heap=${expectedHeap} actual_script_heap=${scriptHeap}`,
      );
    }
    if (runHeap === null) {
      failures.push(`${label} package=${pkg} check=${check} reason=run_heap_missing expected_script_heap=${expectedHeap}`);
    } else if (runHeap <= 0) {
      failures.push(`${label} package=${pkg} check=${check} reason=run_heap_invalid run_heap=${runHeap}`);
    } else if (scriptHeap !== null && runHeap > scriptHeap) {
      failures.push(
        `${label} package=${pkg} check=${check} reason=run_heap_above_script_heap run_heap=${runHeap} script_heap=${scriptHeap}`,
      );
    }
  }

  if (cls === "pass") {
    if (exitCode === null) {
      failures.push(`${label} package=${pkg} check=${check} class=pass reason=pass_row_has_no_exit_code`);
    } else if (exitCode !== 0) {
      failures.push(
        `${label} package=${pkg} check=${check} class=pass exit_code=${exitCode} reason=pass_row_exit_code_not_zero`,
      );
    }
    if (log === null) {
      failures.push(`${label} package=${pkg} check=${check} class=pass reason=pass_row_has_no_log`);
    } else {
      const logPath = resolveLogPath(log);
      const logLabel = relative(ROOT, logPath);
      if (!logLabel.startsWith(`${LOG_ROOT}/`)) {
        failures.push(
          `${label} package=${pkg} check=${check} class=pass log=${logLabel} reason=log_outside_run_root expected_root=${LOG_ROOT}`,
        );
      }
      const content = options.readLog(logPath);
      if (content === null) {
        if (!options.logFileOptional) {
          failures.push(`${label} package=${pkg} check=${check} class=pass log=${logLabel} reason=pass_row_log_missing`);
        }
      } else {
        if (exitCode !== null && !content.includes(`exit_code=${exitCode}`)) {
          failures.push(
            `${label} package=${pkg} check=${check} class=pass exit_code=${exitCode} log=${logLabel} reason=pass_row_log_has_no_exit_code`,
          );
        }
        if (expectedHeap !== null && scriptHeap !== null && runHeap !== null) {
          if (!content.includes(`script_heap=${scriptHeap}`)) {
            failures.push(
              `${label} package=${pkg} check=${check} class=pass log=${logLabel} reason=log_has_no_script_heap_label expected=script_heap=${scriptHeap}`,
            );
          }
          if (!content.includes(`run_heap=${runHeap}`)) {
            failures.push(
              `${label} package=${pkg} check=${check} class=pass log=${logLabel} reason=log_has_no_run_heap_label expected=run_heap=${runHeap}`,
            );
          }
        }
      }
    }
  }

  if (cls !== "pass" && cls !== "script-absent" && log !== null) {
    const logPath = resolveLogPath(log);
    const logLabel = relative(ROOT, logPath);
    if (!logLabel.startsWith(`${LOG_ROOT}/`)) {
      failures.push(
        `${label} package=${pkg} check=${check} class=${cls} log=${logLabel} reason=log_outside_run_root expected_root=${LOG_ROOT}`,
      );
    }
    if (!options.logFileOptional && options.readLog(logPath) === null) {
      failures.push(`${label} package=${pkg} check=${check} class=${cls} log=${logLabel} reason=log_file_missing`);
    }
  }

  if (cls === "predates-track") {
    if (labeledValue(evidence, "source") === null) {
      failures.push(`${label} package=${pkg} check=${check} class=predates-track reason=predates_row_has_no_source`);
    }
    if (exitCode === null) {
      failures.push(`${label} package=${pkg} check=${check} class=predates-track reason=predates_row_has_no_exit_code`);
    } else if (exitCode === 0) {
      failures.push(
        `${label} package=${pkg} check=${check} class=predates-track exit_code=${exitCode} reason=predates_row_exit_code_is_zero`,
      );
    }
  }

  if (cls === "upgrade-defect") {
    failures.push(`${label} package=${pkg} check=${check} class=upgrade-defect reason=upgrade_defect_row`);
    if (labeledValue(evidence, "source") === null) {
      failures.push(`${label} package=${pkg} check=${check} class=upgrade-defect reason=evidence_has_no_source`);
    }
    if (exitCode === null || exitCode === 0) {
      failures.push(
        `${label} package=${pkg} check=${check} class=upgrade-defect exit_code=${exitCode ?? "<none>"} reason=upgrade_defect_row_has_no_exit_code`,
      );
    }
  }

  if (cls === "not-run") {
    failures.push(`${label} package=${pkg} check=${check} class=not-run reason=not_run_row`);
    const source = labeledValue(evidence, "source");
    if (source === null) {
      failures.push(`${label} package=${pkg} check=${check} class=not-run reason=evidence_has_no_source`);
    } else if (!(NOT_RUN_SOURCES as readonly string[]).includes(source)) {
      failures.push(
        `${label} package=${pkg} check=${check} class=not-run source=${source} reason=not_run_source_not_allowed allowed=${NOT_RUN_SOURCES.join(",")}`,
      );
    } else if (source === "timeout" && exitCode !== TIMEOUT_EXIT_CODE) {
      failures.push(
        `${label} package=${pkg} check=${check} class=not-run source=timeout expected_exit_code=${TIMEOUT_EXIT_CODE} actual_exit_code=${exitCode ?? "<none>"} reason=not_run_exit_code_mismatch`,
      );
    } else if (source === "machine_heap" && exitCode !== MACHINE_HEAP_EXIT_CODE) {
      failures.push(
        `${label} package=${pkg} check=${check} class=not-run source=machine_heap expected_exit_code=${MACHINE_HEAP_EXIT_CODE} actual_exit_code=${exitCode ?? "<none>"} reason=not_run_exit_code_mismatch`,
      );
    }
  }

  if (cls === "script-absent") {
    const allowed = item.pair !== null && isScriptAbsentPair(item.pair);
    if (!allowed) {
      failures.push(`${label} package=${pkg} check=${check} class=script-absent reason=script_absent_not_allowed`);
    }
    if (exitCode !== null && exitCode !== 0) {
      failures.push(
        `${label} package=${pkg} check=${check} class=script-absent exit_code=${exitCode} reason=script_absent_exit_code_not_zero`,
      );
    }
  }

  if (item.pair !== null && isScriptAbsentPair(item.pair) && cls !== "script-absent") {
    failures.push(`${label} package=${pkg} check=${check} class=${cls} reason=script_absent_expected`);
  }

  return failures;
}

/** Checks the ledger against the Phase 2 contract. Each failure names the reason. */
function validateLedger(ledger: unknown, options: ValidateOptions): string[] {
  const failures: string[] = [];
  if (ledger === null || typeof ledger !== "object" || Array.isArray(ledger)) {
    return ["reason=ledger_is_not_an_object"];
  }
  const root = ledger as Record<string, unknown>;
  failures.push(...hashFieldFailures(root, "ledger"));
  const rows = root.rows;
  if (!Array.isArray(rows)) {
    failures.push("reason=ledger_rows_missing");
    return failures;
  }
  if (rows.length === 0) {
    failures.push("reason=ledger_rows_empty");
    return failures;
  }

  const resolved: ResolvedRow[] = [];
  for (let index = 0; index < rows.length; index++) {
    const raw = rows[index];
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      failures.push(`row=${index} reason=row_is_not_an_object`);
      continue;
    }
    const row = raw as LedgerRow;
    failures.push(...hashFieldFailures(row as Record<string, unknown>, `row=${index}`));
    const info = resolvePair(row);
    const item: ResolvedRow = {
      index,
      row,
      pair: info.pair,
      check: info.check,
      pkg: stringField(row, "package"),
      cls: stringField(row, "class"),
    };
    resolved.push(item);
    failures.push(...validateRow(item, options));
  }

  for (const pair of REQUIRED_PAIRS) {
    const covered = resolved.some((item) => item.pair !== null && item.pair.key === pair.key && item.pair.check === pair.check);
    if (!covered) {
      failures.push(`package=${pair.key} check=${pair.check} reason=missing_row`);
    }
  }
  return failures;
}

/** Returns the rows of a ledger. An empty array holds no row. */
function ledgerRows(ledger: unknown): unknown[] {
  if (ledger === null || typeof ledger !== "object" || Array.isArray(ledger)) return [];
  const rows = (ledger as Record<string, unknown>).rows;
  return Array.isArray(rows) ? rows : [];
}

/** Returns the labeled class counts of a ledger. */
function summarize(ledger: unknown): string {
  const counts: Record<string, number> = {
    pass: 0,
    predates: 0,
    upgrade_defect: 0,
    not_run: 0,
    script_absent: 0,
    other: 0,
  };
  for (const raw of ledgerRows(ledger)) {
    const cls = raw === null || typeof raw !== "object" ? null : stringField(raw as LedgerRow, "class");
    if (cls === "pass") counts.pass++;
    else if (cls === "predates-track") counts.predates++;
    else if (cls === "upgrade-defect") counts.upgrade_defect++;
    else if (cls === "not-run") counts.not_run++;
    else if (cls === "script-absent") counts.script_absent++;
    else counts.other++;
  }
  const rows = ledgerRows(ledger).length;
  return `pass=${counts.pass} predates=${counts.predates} upgrade_defect=${counts.upgrade_defect} not_run=${counts.not_run} script_absent=${counts.script_absent} other=${counts.other} rows=${rows}`;
}

/** Reads a run log from the repository. It returns null when the file is absent. */
function readRunLog(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Returns the committed track folder. The archive folder comes first (A9). */
function resolveTrackDir(): string {
  const archived = resolve(ROOT, "measure/archive", TRACK_ID);
  return existsSync(archived) ? archived : resolve(ROOT, "measure/tracks", TRACK_ID);
}

/** Returns the ledger path and the searched candidates. The archive path comes first (A9). */
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

/** Builds a synthetic ledger that holds every required pair with a pass row. */
function buildGoodLedger(): { ledger: Record<string, unknown>; logs: Map<string, string> } {
  const logs = new Map<string, string>();
  const rows: Record<string, unknown>[] = [];
  for (const pair of REQUIRED_PAIRS) {
    const command = `pnpm --filter ${pair.key} run ${pair.check}`;
    if (isScriptAbsentPair(pair)) {
      rows.push({
        package: pair.key,
        check: pair.check,
        command,
        exit_code: null,
        class: "script-absent",
        log: null,
      });
      continue;
    }
    const logPath = `${LOG_ROOT}/p2/${pair.key.replace("@reading-advantage/", "")}-${pair.check}.log`;
    let content = `command=${command}\nexit_code=0\n`;
    if (pair.scriptHeap !== null) {
      content += `script_heap=${pair.scriptHeap}\nrun_heap=${pair.scriptHeap}\n`;
    }
    logs.set(resolve(ROOT, logPath), content);
    const row: Record<string, unknown> = {
      package: pair.key,
      check: pair.check,
      command,
      exit_code: 0,
      class: "pass",
      log: logPath,
    };
    if (pair.scriptHeap !== null) {
      row.script_heap = pair.scriptHeap;
      row.run_heap = pair.scriptHeap;
    }
    rows.push(row);
  }
  return { ledger: { track: TRACK_ID, phase: "phase-2", rows }, logs };
}

/** Returns a copy of a synthetic ledger. The fixture changes one field of the copy. */
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

/** Returns true when the failures hold a reason label. */
function hasReason(failures: string[], reason: string): boolean {
  return failures.some((failure) => failure.includes(`reason=${reason}`));
}

/**
 * The committed row set of the Phase 2 ledger. The PM decision of 2026-11-18
 * makes the run logs local only, so this list is the committed evidence.
 * Any lost row, changed class, or changed log path fails the check below.
 */
const LEDGER_ROW_FINGERPRINT = [
  "0|accounting|check-types|pass|measure/runs/security_upgrade_20261026/p2/accounting-check-types.log",
  "1|accounting|lint|pass|measure/runs/security_upgrade_20261026/p2/accounting-lint.log",
  "2|accounting|test|pass|measure/runs/security_upgrade_20261026/p2/accounting-test.log",
  "3|accounting|build|pass|measure/runs/security_upgrade_20261026/p2/accounting-build.log",
  "4|accounts|check-types|pass|measure/runs/security_upgrade_20261026/p2/accounts-check-types.log",
  "5|accounts|lint|pass|measure/runs/security_upgrade_20261026/p2/accounts-lint.log",
  "6|accounts|test|pass|measure/runs/security_upgrade_20261026/p2/accounts-test.log",
  "7|accounts|build|pass|measure/runs/security_upgrade_20261026/p2/accounts-build.log",
  "8|workbooks|check-types|pass|measure/runs/security_upgrade_20261026/p2/workbooks-check-types.log",
  "9|workbooks|lint|pass|measure/runs/security_upgrade_20261026/p2/workbooks-lint.log",
  "10|workbooks|build|pass|measure/runs/security_upgrade_20261026/p2/workbooks-build.log",
  "11|sales-advantage|check-types|pass|measure/runs/security_upgrade_20261026/p2/sales-advantage-check-types.log",
  "12|sales-advantage|lint|pass|measure/runs/security_upgrade_20261026/p2/sales-advantage-lint.log",
  "13|sales-advantage|build|pass|measure/runs/security_upgrade_20261026/p2/sales-advantage-build.log",
  "14|storytime|check-types|pass|measure/runs/security_upgrade_20261026/p2/storytime-check-types.log",
  "15|storytime|lint|pass|measure/runs/security_upgrade_20261026/p2/storytime-lint.log",
  "16|storytime|test|pass|measure/runs/security_upgrade_20261026/p2/storytime-test.log",
  "17|storytime|build|pass|measure/runs/security_upgrade_20261026/p2/storytime-build.log",
  "18|marketing|check-types|pass|measure/runs/security_upgrade_20261026/p2/marketing-check-types.log",
  "19|marketing|lint|pass|measure/runs/security_upgrade_20261026/p2/marketing-lint.log",
  "20|marketing|test|pass|measure/runs/security_upgrade_20261026/p2/marketing-test.log",
  "21|marketing|build|pass|measure/runs/security_upgrade_20261026/p2/marketing-build.log",
  "22|codecamp-advantage|check-types|pass|measure/runs/security_upgrade_20261026/p2/codecamp-advantage-check-types.log",
  "23|codecamp-advantage|lint|pass|measure/runs/security_upgrade_20261026/p2/codecamp-advantage-lint.log",
  "24|codecamp-advantage|build|pass|measure/runs/security_upgrade_20261026/p2/codecamp-advantage-build.log",
  "25|www-reading-advantage|check-types|pass|measure/runs/security_upgrade_20261026/p2/www-reading-advantage-check-types.log",
  "26|www-reading-advantage|test|pass|measure/runs/security_upgrade_20261026/p2/www-reading-advantage-test.log",
  "27|www-reading-advantage|build|pass|measure/runs/security_upgrade_20261026/p2/www-reading-advantage-build.log",
  "28|@reading-advantage/api|check-types|pass|measure/runs/security_upgrade_20261026/p2/api-check-types.log",
  "29|@reading-advantage/api|lint|pass|measure/runs/security_upgrade_20261026/p2/api-lint.log",
  "30|@reading-advantage/api|build|pass|measure/runs/security_upgrade_20261026/p2/api-build.log",
  "31|@reading-advantage/domain|check-types|pass|measure/runs/security_upgrade_20261026/p2/domain-check-types.log",
  "32|@reading-advantage/domain|lint|pass|measure/runs/security_upgrade_20261026/p2/domain-lint.log",
  "33|@reading-advantage/db|check-types|pass|measure/runs/security_upgrade_20261026/p2/db-check-types.log",
  "34|@reading-advantage/db|lint|pass|measure/runs/security_upgrade_20261026/p2/db-lint.log",
  "35|@reading-advantage/db|build|pass|measure/runs/security_upgrade_20261026/p2/db-build.log",
  "36|@reading-advantage/auth|check-types|pass|measure/runs/security_upgrade_20261026/p2/auth-check-types.log",
  "37|@reading-advantage/auth|lint|pass|measure/runs/security_upgrade_20261026/p2/auth-lint.log",
  "38|@reading-advantage/auth|test|pass|measure/runs/security_upgrade_20261026/p2/auth-test.log",
  "39|@reading-advantage/auth|build|pass|measure/runs/security_upgrade_20261026/p2/auth-build.log",
  "40|@reading-advantage/backend|lint|pass|measure/runs/security_upgrade_20261026/p2/backend-lint.log",
  "41|@reading-advantage/backend|build|pass|measure/runs/security_upgrade_20261026/p2/backend-build.log",
  "42|@reading-advantage/ui|check-types|script-absent|null",
  "43|@reading-advantage/ui|lint|pass|measure/runs/security_upgrade_20261026/p2/ui-lint.log",
  "44|@reading-advantage/ui|test|pass|measure/runs/security_upgrade_20261026/p2/ui-test.log",
  "45|@reading-advantage/ui|build|pass|measure/runs/security_upgrade_20261026/p2/ui-build.log",
  "46|@reading-advantage/utils|check-types|script-absent|null",
  "47|@reading-advantage/utils|lint|pass|measure/runs/security_upgrade_20261026/p2/utils-lint.log",
  "48|@reading-advantage/utils|test|pass|measure/runs/security_upgrade_20261026/p2/utils-test.log",
  "49|@reading-advantage/utils|build|pass|measure/runs/security_upgrade_20261026/p2/utils-build.log",
  "50|@reading-advantage/activity-runtime|check-types|pass|measure/runs/security_upgrade_20261026/p2/activity-runtime-check-types.log",
  "51|@reading-advantage/advantage-play-kit|check-types|pass|measure/runs/security_upgrade_20261026/p2/advantage-play-kit-check-types.log",
  "52|@reading-advantage/advantage-play-kit-3d|check-types|pass|measure/runs/security_upgrade_20261026/p2/advantage-play-kit-3d-check-types.log",
  "53|@reading-advantage/activity-react|check-types|pass|measure/runs/security_upgrade_20261026/p2/activity-react-check-types.log",
  "54|@reading-advantage/auth-client|check-types|pass|measure/runs/security_upgrade_20261026/p2/auth-client-check-types.log",
  "55|codecamp-advantage|test|predates-track|measure/runs/security_upgrade_20261026/p2/codecamp-advantage-test-green-r4.log",
  "56|@reading-advantage/db|test|predates-track|measure/runs/security_upgrade_20261026/p2/db-test-r4.log",
  "57|@reading-advantage/domain|build|pass|measure/runs/security_upgrade_20261026/p2/domain-build-r4.log",
  "58|@reading-advantage/domain|test|pass|measure/runs/security_upgrade_20261026/p2/domain-test-r4.log",
  "59|@reading-advantage/backend|check-types|predates-track|measure/runs/security_upgrade_20261026/p2/backend-check-types-r4.log",
  "60|@reading-advantage/backend|test|predates-track|measure/runs/security_upgrade_20261026/p2/backend-test-r4.log",
  "61|@reading-advantage/api|test|predates-track|measure/runs/security_upgrade_20261026/p2/api-test-r4.log",
  "62|sales-advantage|test|predates-track|measure/runs/security_upgrade_20261026/p2/sales-advantage-test-r4.log",
  "63|workbooks|test|predates-track|measure/runs/security_upgrade_20261026/p2/workbooks-test-r4.log",
  "64|primary-advantage|lint|predates-track|measure/runs/security_upgrade_20261026/p2/primary-advantage-lint-r4.log",
  "65|primary-advantage|test|predates-track|measure/runs/security_upgrade_20261026/p2/primary-advantage-test-r4.log",
  "66|primary-advantage|check-types|pass|measure/runs/security_upgrade_20261026/p2/primary-advantage-check-types-r4.log",
  "67|primary-advantage|build|pass|measure/runs/security_upgrade_20261026/p2/primary-advantage-build-r4.log",
  "68|www-reading-advantage|lint|predates-track|measure/runs/security_upgrade_20261026/p2/www-reading-advantage-lint-r4.log",
  "69|reading-advantage|check-types|predates-track|measure/runs/security_upgrade_20261026/p2/reading-advantage-check-types-r4.log",
  "70|reading-advantage|lint|predates-track|measure/runs/security_upgrade_20261026/p2/reading-advantage-lint-r4.log",
  "71|reading-advantage|test|predates-track|measure/runs/security_upgrade_20261026/p2/reading-advantage-test-r4.log",
  "72|reading-advantage|build|pass|measure/runs/security_upgrade_20261026/p2/reading-advantage-build-r4.log",
].join("\n");

describe("phase 2 verification ledger", () => {
  it("holds one row for every matrix pair with the phase 2 class contract", () => {
    const { path, candidates } = resolveLedgerPath();
    if (!existsSync(path)) {
      const searched = candidates.map((candidate) => relative(ROOT, candidate)).join(" ");
      throw new Error(`verification-ledger: reason=ledger_file_absent searched=${searched}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(`verification-ledger: reason=ledger_is_not_json path=${relative(ROOT, path)} detail=${(error as Error).message}`);
    }
    const failures = validateLedger(parsed, { readLog: readRunLog, logFileOptional: true });
    console.log(`verification-ledger summary: ${summarize(parsed)}`);
    const planPath = resolve(resolveTrackDir(), "plan.md");
    const plan = existsSync(planPath) ? readFileSync(planPath, "utf8") : "";
    if (!plan.includes(`${LOG_ROOT}/p2/`)) {
      failures.push("plan=absent-evidence the committed plan names no p2 log root");
    }
    if (!plan.includes("not run in CI")) {
      failures.push("plan=absent-evidence the committed plan states no local-only rule");
    }
    if (failures.length > 0) {
      throw new Error(`verification-ledger failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });

  it("holds the committed row set of the ledger and loses no row (A4)", () => {
    const { path } = resolveLedgerPath();
    if (!existsSync(path)) {
      throw new Error(`verification-ledger: reason=ledger_file_absent path=${relative(ROOT, path)}`);
    }
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const rows = ledgerRows(parsed);
    expect(rows.length).toBe(73);
    const fingerprint = rows
      .map((raw, index) => {
        const row = raw as LedgerRow;
        return [index, row.package, row.check, row.class, row.log ?? "null"].join("|");
      })
      .join("\n");
    expect(fingerprint).toBe(LEDGER_ROW_FINGERPRINT);
  });
});

describe("ledger refutation fixtures", () => {
  it("a complete ledger with pass rows holds no failure", () => {
    const { ledger, logs } = buildGoodLedger();
    expect(validateLedger(ledger, { readLog: syntheticReader(logs) })).toEqual([]);
  });

  it("a ledger without a rows key fails", () => {
    const failures = validateLedger({ track: TRACK_ID }, { readLog: syntheticReader(new Map()) });
    expect(hasReason(failures, "ledger_rows_missing")).toBe(true);
  });

  it("a ledger that is not an object fails", () => {
    const failures = validateLedger([], { readLog: syntheticReader(new Map()) });
    expect(hasReason(failures, "ledger_is_not_an_object")).toBe(true);
  });

  it("a ledger with zero rows fails (A4)", () => {
    const { ledger } = buildGoodLedger();
    ledger.rows = [];
    const failures = validateLedger(ledger, { readLog: syntheticReader(new Map()) });
    expect(hasReason(failures, "ledger_rows_empty")).toBe(true);
  });

  it("a ledger without the row of a matrix pair fails (A4)", () => {
    const { ledger, logs } = buildGoodLedger();
    const rows = ledgerRows(ledger) as Record<string, unknown>[];
    ledger.rows = rows.filter((row) => !(row.package === "marketing" && row.check === "build"));
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "missing_row")).toBe(true);
    expect(failures.some((failure) => failure.includes("package=marketing") && failure.includes("check=build"))).toBe(true);
  });

  it("a ledger without the activity-runtime check-types row fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const rows = ledgerRows(ledger) as Record<string, unknown>[];
    ledger.rows = rows.filter((row) => row.package !== "@reading-advantage/activity-runtime");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(
      failures.some(
        (failure) =>
          failure.includes("package=@reading-advantage/activity-runtime") &&
          failure.includes("check=check-types") &&
          failure.includes("reason=missing_row"),
      ),
    ).toBe(true);
  });

  it("a pass row with exit_code=1 fails (A5)", () => {
    const { ledger, logs } = buildGoodLedger();
    rowOf(ledger, "accounting", "check-types").exit_code = 1;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "pass_row_exit_code_not_zero")).toBe(true);
    expect(failures.some((failure) => failure.includes("exit_code=1"))).toBe(true);
  });

  it("a pass row with no log file fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "accounts", "lint");
    row.log = `${LOG_ROOT}/p2/absent.log`;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "pass_row_log_missing")).toBe(true);
  });

  it("a pass row whose log holds no exit_code label fails (A3)", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "workbooks", "test");
    logs.set(resolve(ROOT, row.log as string), "command=vitest run\nresult=0\n");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "pass_row_log_has_no_exit_code")).toBe(true);
  });

  it("a pass row whose log holds a non-zero exit code fails (A5)", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "sales-advantage", "build");
    logs.set(resolve(ROOT, row.log as string), "command=next build\nexit_code=1\n");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "pass_row_log_has_no_exit_code")).toBe(true);
  });

  it("a present log is checked in full even when the logs are local only", () => {
    // The live call marks the run logs optional because `measure/runs/` is
    // gitignored. A log that exists in the checkout must still pass the full
    // content check. The optional flag relaxes only the absence of a log.
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "accounting", "check-types");
    logs.set(resolve(ROOT, row.log as string), "command=fixture\nexit_code=1\n");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs), logFileOptional: true });
    expect(hasReason(failures, "pass_row_log_has_no_exit_code")).toBe(true);
    expect(failures.join("\n")).toContain("package=accounting");
  });

  it("a pass row whose log sits outside the run root fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "storytime", "check-types");
    row.log = `measure/tracks/${TRACK_ID}/storytime-check-types.log`;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "log_outside_run_root")).toBe(true);
  });

  it("an upgrade-defect row fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "marketing", "build");
    row.class = "upgrade-defect";
    row.exit_code = 1;
    row.evidence = "source=measure/runs/security_upgrade_20261026/p2/marketing-build.log";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "upgrade_defect_row")).toBe(true);
  });

  it("a not-run row with source=machine_heap fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "primary-advantage", "build");
    row.class = "not-run";
    row.exit_code = 137;
    row.evidence = "source=machine_heap";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "not_run_row")).toBe(true);
  });

  it("a not-run row with source=timeout and exit_code=0 fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "primary-advantage", "check-types");
    row.class = "not-run";
    row.exit_code = 0;
    row.evidence = "source=timeout";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "not_run_exit_code_mismatch")).toBe(true);
  });

  it("a not-run row with a source outside the three names fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "build");
    row.class = "not-run";
    row.exit_code = 137;
    row.evidence = "source=disk_full";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "not_run_source_not_allowed")).toBe(true);
  });

  it("a predates-track row without a source label fails (A3)", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "test");
    row.class = "predates-track";
    row.exit_code = 1;
    row.evidence = "the jest suite hangs above ten minutes";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "predates_row_has_no_source")).toBe(true);
  });

  it("a predates-track row with a source label holds the class failure", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "test");
    row.class = "predates-track";
    row.exit_code = 1;
    row.evidence = "source=measure/tech-debt.md:2026-05-23 test=lib/games/xp.test.ts";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "predates_row_has_no_source")).toBe(false);
  });

  it("a script-absent class on another pair fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "accounting", "check-types");
    row.class = "script-absent";
    row.exit_code = null;
    row.log = null;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "script_absent_not_allowed")).toBe(true);
  });

  it("a ui check-types row with class pass fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "@reading-advantage/ui", "check-types");
    row.class = "pass";
    row.exit_code = 0;
    row.log = `${LOG_ROOT}/p2/ui-check-types.log`;
    logs.set(resolve(ROOT, row.log as string), "exit_code=0\n");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "script_absent_expected")).toBe(true);
  });

  it("a free-text class fails (A1)", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "codecamp-advantage", "lint");
    row.class = "deferred";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "class_not_allowed")).toBe(true);
  });

  it("a row without a class fails", () => {
    const { ledger, logs } = buildGoodLedger();
    delete rowOf(ledger, "www-reading-advantage", "test").class;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "missing_field")).toBe(true);
  });

  it("a row that names no matrix check fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "marketing", "build");
    row.check = "coverage";
    row.command = "pnpm --filter marketing run coverage";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "row_has_no_matrix_check")).toBe(true);
  });

  it("a row with the wrong script heap fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "build");
    row.script_heap = 4096;
    row.run_heap = 4096;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "script_heap_mismatch")).toBe(true);
  });

  it("a row with a run heap above the script heap fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "build");
    row.run_heap = 16384;
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "run_heap_above_script_heap")).toBe(true);
  });

  it("a heap row whose log holds no heap labels fails", () => {
    const { ledger, logs } = buildGoodLedger();
    const row = rowOf(ledger, "reading-advantage", "build");
    logs.set(resolve(ROOT, row.log as string), "command=next build\nexit_code=0\n");
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "log_has_no_script_heap_label")).toBe(true);
    expect(hasReason(failures, "log_has_no_run_heap_label")).toBe(true);
  });

  it("a ledger with a hash field fails (A15)", () => {
    const { ledger, logs } = buildGoodLedger();
    ledger.sha256 = "0000000000000000000000000000000000000000000000000000000000000000";
    const failures = validateLedger(ledger, { readLog: syntheticReader(logs) });
    expect(hasReason(failures, "ledger_has_hash_field")).toBe(true);
  });
});
