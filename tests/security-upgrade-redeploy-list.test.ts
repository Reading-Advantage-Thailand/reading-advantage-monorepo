/**
 * Red test for track security_upgrade_20261026, phase 3.
 *
 * The test reads the Phase 3 redeploy list.
 * The list file is absent at the Red run. The live test fails for that reason.
 * The refutation fixtures use synthetic documents in memory. They read no file.
 *
 * The document names ten Cloud Run services.
 * Nine services are covered by this commit. Each covered row holds `app=`, `commit=`, `order=` and `check=`.
 * The tenth service, `reading-advantage-web`, is not covered by this commit.
 * Its row holds `reason=`, `owner=`, the mark `NOT COVERED by this commit`, the legacy image source
 * `web/Dockerfile` line 2 and the live base image `node:20.18`.
 * The not-covered row holds no `app=apps/reading-advantage`, no `commit=`, no `order=` and no `check=`.
 *
 * The entry is one markdown table row. The row starts with the service name.
 * A row may hold extra labels such as `live=` or `precondition=`. The validator accepts every extra label.
 *
 * The commit check runs as a live Git command in the live test. It reads the local repository only.
 * The document path sits outside the track directory. It stays the same after the archive move (A9).
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRACK_ID = "security_upgrade_20261026";

/** The path of the redeploy list. The path does not change after the archive move (A9). */
const DOC_RELATIVE_PATH = "docs/deployment/security-upgrade-2026-10.md";

/** The service that this commit does not cover. */
const NOT_COVERED_SERVICE = "reading-advantage-web";

/** The mark that the not-covered entry holds. */
const NOT_COVERED_MARK = "NOT COVERED by this commit";

/** The path of the legacy Dockerfile that holds the live image of the not-covered service. */
const LEGACY_DOCKERFILE_PATH = "web/Dockerfile";

/** The live base image of the not-covered service. */
const LEGACY_BASE_IMAGE = "node:20.18";

/** The base image that the covered apps use after the upgrade. */
const RUNTIME_IMAGE = "node:22-alpine";

/** The lockfile that a covered commit must change. */
const LOCKFILE = "pnpm-lock.yaml";

/** The commands that the document must not hold. The check uses the exact strings. */
const FORBIDDEN_COMMANDS = ["git push", "gcloud builds submit"];

/** The labels that every covered entry holds. */
const COVERED_LABELS = ["app", "commit", "order", "check"];

/** The labels that the not-covered entry must not hold. */
const NOT_COVERED_FORBIDDEN_LABELS = ["app=apps/reading-advantage", "commit=", "order=", "check="];

/** One covered service of the redeploy list. */
interface CoveredService {
  /** The Cloud Run service name. */
  service: string;
  /** The app folder of the service. */
  app: string;
  /** The deploy order of the service. */
  order: number;
}

/** The nine covered services. The order runs the lowest-traffic services first. */
const COVERED_SERVICES: CoveredService[] = [
  { service: "accounting", app: "apps/accounting", order: 1 },
  { service: "accounts", app: "apps/accounts", order: 2 },
  { service: "workbooks", app: "apps/workbooks", order: 3 },
  { service: "sales-advantage", app: "apps/sales-advantage", order: 4 },
  { service: "storytime-app", app: "apps/storytime", order: 5 },
  { service: "marketing", app: "apps/marketing", order: 6 },
  { service: "codecamp-advantage", app: "apps/codecamp-advantage", order: 7 },
  { service: "www-reading-advantage", app: "apps/www-reading-advantage", order: 8 },
  { service: "primary-advantage-app", app: "apps/primary-advantage", order: 9 },
];

/** The commit that the good fixture holds. The fixture checker accepts it. */
const FIXTURE_COMMIT = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

/** The commit that the fixture checker rejects as an ancestor. */
const FIXTURE_NO_ANCESTOR_COMMIT = "b1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

/** The commit that the fixture checker rejects as a lockfile change. */
const FIXTURE_NO_LOCKFILE_COMMIT = "c1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

/** One table row of the redeploy list. */
interface TableRow {
  /** The cells of the row. */
  cells: string[];
  /** The text of the row. The text holds no backtick. */
  text: string;
}

/** The git facts of one commit. */
interface CommitFacts {
  /** True when the commit is an ancestor of HEAD. */
  ancestor: boolean;
  /** True when the commit changes the lockfile. */
  touchesLockfile: boolean;
}

/** The reader that the validator uses for the git facts. */
interface ValidateOptions {
  /** Reports the git facts of a commit. */
  checkCommit: (sha: string) => CommitFacts;
}

/** Returns the cells of a markdown table row. */
function splitCells(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  return text.split("|").map((cell) => cell.trim());
}

/** Returns true when the row is a table separator row. */
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && /^[:\-|\s]+$/.test(cells.join(""));
}

/** Returns the table rows of a document. */
function tableRows(content: string): TableRow[] {
  const rows: TableRow[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = splitCells(trimmed);
    if (cells.length === 0 || isSeparatorRow(cells)) continue;
    rows.push({ cells, text: cells.join(" ").replace(/`/g, "") });
  }
  return rows;
}

/** Removes the markdown decoration of a cell. */
function normalizeCell(cell: string): string {
  let text = cell.trim();
  const link = text.match(/^\[([^\]]+)\]\([^)]*\)$/);
  if (link) text = link[1].trim();
  text = text.replace(/^[`*]+/, "").replace(/[`*]+$/, "");
  text = text.replace(/[:;,]+$/, "");
  return text.trim();
}

/** Returns true when the cell names the service. */
function cellNamesService(cell: string, service: string): boolean {
  const normalized = normalizeCell(cell);
  if (normalized === service) return true;
  if (normalized.startsWith(service)) {
    const next = normalized.charAt(service.length);
    return next === " " || next === "\t";
  }
  return false;
}

/** Returns the row that names the service. Null when no row names it. */
function rowForService(rows: TableRow[], service: string): TableRow | null {
  for (const row of rows) {
    if (row.cells.length > 0 && cellNamesService(row.cells[0], service)) return row;
  }
  return null;
}

/** Returns the value of a label in a row. The value ends at the next label. Null when the label is absent. */
function labelSegment(rowText: string, label: string): string | null {
  const pattern = new RegExp(`(?:^|\\s)${label}=`);
  const match = pattern.exec(rowText);
  if (!match) return null;
  const rest = rowText.slice(match.index + match[0].length);
  const next = rest.search(/\s[A-Za-z][A-Za-z0-9_]*=/);
  const segment = (next === -1 ? rest : rest.slice(0, next)).replace(/[|\s]+$/, "").trim();
  return segment.length === 0 ? null : segment;
}

/** Returns the first token of a label value. */
function firstToken(value: string): string {
  const token = value.trim().split(/\s+/)[0];
  return token ?? "";
}

/** Returns true when the failures hold a reason label. */
function hasReason(failures: string[], reason: string): boolean {
  return failures.some((failure) => failure.includes(`reason=${reason}`));
}

/** Checks one covered entry against the labels of the Phase 3 strategy. */
function validateCoveredRow(covered: CoveredService, row: TableRow, options: ValidateOptions): string[] {
  const failures: string[] = [];
  const label = `service=${covered.service}`;

  for (const name of COVERED_LABELS) {
    if (labelSegment(row.text, name) === null) {
      failures.push(`${label} reason=missing_label label=${name}`);
    }
  }

  const order = labelSegment(row.text, "order");
  if (order !== null) {
    const token = firstToken(order);
    if (!/^\d+$/.test(token)) {
      failures.push(`${label} reason=order_not_an_integer order=${token}`);
    } else {
      const value = Number.parseInt(token, 10);
      if (value < 1 || value > COVERED_SERVICES.length) {
        failures.push(`${label} reason=order_out_of_range order=${value}`);
      }
    }
  }

  const commit = labelSegment(row.text, "commit");
  if (commit !== null) {
    const token = firstToken(commit);
    if (token === "HEAD") {
      failures.push(`${label} reason=commit_is_head`);
    } else if (token === "latest") {
      failures.push(`${label} reason=commit_is_latest`);
    } else if (!/^[0-9a-f]+$/i.test(token)) {
      failures.push(`${label} reason=commit_not_hex commit=${token}`);
    } else if (token.length < 7) {
      failures.push(`${label} reason=commit_too_short commit=${token}`);
    } else {
      const facts = options.checkCommit(token);
      if (!facts.ancestor) {
        failures.push(`${label} reason=commit_not_ancestor commit=${token}`);
      }
      if (!facts.touchesLockfile) {
        failures.push(`${label} reason=commit_does_not_touch_lockfile commit=${token}`);
      }
    }
  }

  const check = labelSegment(row.text, "check");
  if (check !== null && !check.includes("/")) {
    failures.push(`${label} reason=check_has_no_path check=${firstToken(check)}`);
  }

  return failures;
}

/** Checks the not-covered entry against the labels of the Phase 3 strategy. */
function validateNotCoveredRow(row: TableRow): string[] {
  const failures: string[] = [];
  const label = `service=${NOT_COVERED_SERVICE}`;

  if (!row.text.includes(NOT_COVERED_MARK)) {
    failures.push(`${label} reason=not_covered_mark_missing mark=${NOT_COVERED_MARK}`);
  }
  if (labelSegment(row.text, "reason") === null) {
    failures.push(`${label} reason=not_covered_reason_missing`);
  }
  if (labelSegment(row.text, "owner") === null) {
    failures.push(`${label} reason=not_covered_owner_missing`);
  }
  if (!row.text.includes(LEGACY_DOCKERFILE_PATH)) {
    failures.push(`${label} reason=not_covered_legacy_path_missing path=${LEGACY_DOCKERFILE_PATH}`);
  }
  if (!row.text.includes(LEGACY_BASE_IMAGE)) {
    failures.push(`${label} reason=not_covered_legacy_base_missing base=${LEGACY_BASE_IMAGE}`);
  }
  for (const forbidden of NOT_COVERED_FORBIDDEN_LABELS) {
    if (row.text.includes(forbidden)) {
      failures.push(`${label} reason=not_covered_has_covered_label label=${forbidden}`);
    }
  }

  return failures;
}

/** Checks the redeploy list against the Phase 3 contract. Each failure names the reason. */
function validateDoc(content: string, options: ValidateOptions): string[] {
  const failures: string[] = [];

  if (content.trim() === "") {
    failures.push(`reason=doc_file_empty path=${DOC_RELATIVE_PATH}`);
    return failures;
  }

  if (!content.includes(RUNTIME_IMAGE)) {
    failures.push(`reason=doc_missing_runtime_note missing=${RUNTIME_IMAGE}`);
  }
  if (!content.includes(LEGACY_BASE_IMAGE)) {
    failures.push(`reason=doc_missing_runtime_note missing=${LEGACY_BASE_IMAGE}`);
  }
  for (const command of FORBIDDEN_COMMANDS) {
    if (content.includes(command)) {
      failures.push(`reason=doc_forbidden_command command=${command}`);
    }
  }

  const rows = tableRows(content);
  const orders = new Map<string, number>();

  for (const covered of COVERED_SERVICES) {
    const row = rowForService(rows, covered.service);
    if (row === null) {
      failures.push(`service=${covered.service} reason=missing_service`);
      continue;
    }
    failures.push(...validateCoveredRow(covered, row, options));
    const order = labelSegment(row.text, "order");
    if (order !== null && /^\d+$/.test(firstToken(order))) {
      orders.set(covered.service, Number.parseInt(firstToken(order), 10));
    }
  }

  const seen = new Set<number>();
  for (const value of orders.values()) {
    if (seen.has(value)) {
      failures.push(`reason=order_duplicate order=${value}`);
    }
    seen.add(value);
  }
  for (let expected = 1; expected <= COVERED_SERVICES.length; expected++) {
    if (!seen.has(expected)) {
      failures.push(`reason=order_missing order=${expected}`);
    }
  }
  const primaryOrder = orders.get("primary-advantage-app");
  if (primaryOrder !== undefined && orders.size > 0) {
    const highest = Math.max(...orders.values());
    if (primaryOrder !== highest) {
      failures.push(`service=primary-advantage-app reason=primary_not_last order=${primaryOrder} highest=${highest}`);
    }
  }

  const notCoveredRow = rowForService(rows, NOT_COVERED_SERVICE);
  if (notCoveredRow === null) {
    failures.push(`service=${NOT_COVERED_SERVICE} reason=missing_not_covered_entry`);
  } else {
    failures.push(...validateNotCoveredRow(notCoveredRow));
  }

  return failures;
}

/** Builds the covered row of a service. */
function coveredRow(service: string, app: string, commit: string, order: string, check: string, extra = ""): string {
  return `| ${service} | app=${app} commit=${commit} order=${order} check=${check}${extra} |`;
}

/** The not-covered row of the good document. */
const DEFAULT_NOT_COVERED_ROW =
  `| ${NOT_COVERED_SERVICE} | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel | ${NOT_COVERED_MARK}; do not deploy apps/reading-advantage to this service |`;

/** The options of the document builder. */
interface DocOptions {
  /** The covered rows of the table. Null removes every covered row. */
  rows?: string[] | null;
  /** The not-covered row. Null removes the row. */
  notCoveredRow?: string | null;
  /** Extra prose lines. The lines sit at the end of the document. */
  extra?: string[];
}

/** Builds a synthetic redeploy list. The fixture changes one part of the document. */
function buildDoc(options: DocOptions = {}): string {
  const rows =
    options.rows ??
    COVERED_SERVICES.map((covered) =>
      coveredRow(covered.service, covered.app, FIXTURE_COMMIT, String(covered.order), "GET /api/health"),
    );
  const notCoveredRow = options.notCoveredRow === undefined ? DEFAULT_NOT_COVERED_ROW : options.notCoveredRow;
  const lines: string[] = [];
  lines.push("# Security upgrade redeploy list, October 2026");
  lines.push("");
  lines.push(`Runtime note: \`${RUNTIME_IMAGE}\` needs no tag change. A rebuild pulls Node \`22.23.4\`.`);
  lines.push(`\`apps/reading-advantage/Dockerfile\` stays on \`${LEGACY_BASE_IMAGE}\` until Daniel decides.`);
  lines.push("");
  lines.push("| service | deploy |");
  lines.push("| --- | --- |");
  for (const row of rows) lines.push(row);
  if (notCoveredRow !== null) lines.push(notCoveredRow);
  lines.push("");
  lines.push("The order runs the lowest-traffic services first.");
  for (const line of options.extra ?? []) lines.push(line);
  return `${lines.join("\n")}\n`;
}

/** Returns the covered rows with one row replaced. A null replacement removes the row. */
function rowsWith(service: string, replacement: string | null): string[] {
  const rows = COVERED_SERVICES.map((covered) =>
    coveredRow(covered.service, covered.app, FIXTURE_COMMIT, String(covered.order), "GET /api/health"),
  );
  if (replacement === null) return rows.filter((row) => !row.startsWith(`| ${service} |`));
  return rows.map((row) => (row.startsWith(`| ${service} |`) ? replacement : row));
}

/** Returns the covered rows with several rows replaced. */
function rowsWithChanges(changes: { service: string; row: string }[]): string[] {
  return COVERED_SERVICES.map((covered) => {
    const change = changes.find((item) => item.service === covered.service);
    if (change) return change.row;
    return coveredRow(covered.service, covered.app, FIXTURE_COMMIT, String(covered.order), "GET /api/health");
  });
}

/** Reports the git facts of a commit from the fixture. */
function fixtureCommitFacts(sha: string): CommitFacts {
  if (sha === FIXTURE_NO_ANCESTOR_COMMIT) return { ancestor: false, touchesLockfile: true };
  if (sha === FIXTURE_NO_LOCKFILE_COMMIT) return { ancestor: true, touchesLockfile: false };
  return { ancestor: true, touchesLockfile: true };
}

/** Runs a git command in the repository. It returns the exit code and the output. */
function runGit(args: string[]): { code: number; out: string } {
  try {
    const out = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (error) {
    const status = (error as { status?: number }).status;
    return { code: typeof status === "number" ? status : 1, out: "" };
  }
}

/** Reports the git facts of a commit. It reads the local repository only. */
function liveCommitFacts(sha: string): CommitFacts {
  const ancestor = runGit(["merge-base", "--is-ancestor", sha, "HEAD"]).code === 0;
  const listed = runGit(["show", "--name-only", "--pretty=format:", "-m", sha]).out;
  const touchesLockfile = listed.split("\n").some((line) => line.trim() === LOCKFILE);
  return { ancestor, touchesLockfile };
}

/** Returns the newest commit that changes a path. An empty string when no commit changes the path. */
function latestCommitForPath(path: string): string {
  return runGit(["log", "-1", "--format=%H", "--", path]).out.trim();
}

describe("phase 3 redeploy list", () => {
  it("holds the redeploy list contract in the real document", () => {
    const docPath = resolve(ROOT, DOC_RELATIVE_PATH);
    if (!existsSync(docPath)) {
      throw new Error(`redeploy-list: reason=doc_file_absent path=${DOC_RELATIVE_PATH}`);
    }
    let content: string;
    try {
      content = readFileSync(docPath, "utf8");
    } catch (error) {
      throw new Error(`redeploy-list: reason=doc_file_unreadable path=${DOC_RELATIVE_PATH} detail=${(error as Error).message}`);
    }
    const failures = validateDoc(content, { checkCommit: liveCommitFacts });
    console.log(`redeploy-list summary: services=${COVERED_SERVICES.length + 1} failures=${failures.length}`);
    if (failures.length > 0) {
      throw new Error(`redeploy-list failures count=${failures.length}:\n${failures.join("\n")}`);
    }
  });
});

describe("live git commit facts", () => {
  it("reports the lockfile commit as an ancestor that changes the lockfile", () => {
    const sha = latestCommitForPath(LOCKFILE);
    expect(sha).not.toBe("");
    const facts = liveCommitFacts(sha);
    expect(facts.ancestor).toBe(true);
    expect(facts.touchesLockfile).toBe(true);
  });

  it("reports a measure commit as an ancestor that does not change the lockfile", () => {
    const sha = latestCommitForPath(`measure/tracks/${TRACK_ID}/plan.md`);
    expect(sha).not.toBe("");
    const facts = liveCommitFacts(sha);
    expect(facts.ancestor).toBe(true);
    expect(facts.touchesLockfile).toBe(false);
  });

  it("reports an absent commit as no ancestor", () => {
    const facts = liveCommitFacts("1".repeat(40));
    expect(facts.ancestor).toBe(false);
    expect(facts.touchesLockfile).toBe(false);
  });
});

describe("redeploy list refutation fixtures", () => {
  it("a complete redeploy list holds no failure", () => {
    expect(validateDoc(buildDoc(), { checkCommit: fixtureCommitFacts })).toEqual([]);
  });

  it("a redeploy list with extra labels holds no failure", () => {
    const rows = rowsWith("accounts", coveredRow("accounts", "apps/accounts", FIXTURE_COMMIT, "2", "GET /api/health", " | live=yes | precondition=drain the queue"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(failures).toEqual([]);
  });

  it("an empty document fails (A4)", () => {
    const failures = validateDoc("", { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "doc_file_empty")).toBe(true);
  });

  it("a document without a covered service fails", () => {
    const failures = validateDoc(buildDoc({ rows: rowsWith("marketing", null) }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_service")).toBe(true);
    expect(failures.some((failure) => failure.includes("service=marketing"))).toBe(true);
  });

  it("a document without the not-covered entry fails", () => {
    const failures = validateDoc(buildDoc({ notCoveredRow: null }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_not_covered_entry")).toBe(true);
    expect(failures.some((failure) => failure.includes(`service=${NOT_COVERED_SERVICE}`))).toBe(true);
  });

  it("a covered entry without the app label fails", () => {
    const rows = rowsWith("accounts", "| accounts | commit=" + FIXTURE_COMMIT + " order=2 check=GET /api/health |");
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=app"))).toBe(true);
  });

  it("a covered entry without the commit label fails", () => {
    const rows = rowsWith("accounts", "| accounts | app=apps/accounts order=2 check=GET /api/health |");
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=commit"))).toBe(true);
  });

  it("a covered entry without the order label fails", () => {
    const rows = rowsWith("accounts", "| accounts | app=apps/accounts commit=" + FIXTURE_COMMIT + " check=GET /api/health |");
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=order"))).toBe(true);
  });

  it("a covered entry without the check label fails", () => {
    const rows = rowsWith("accounts", "| accounts | app=apps/accounts commit=" + FIXTURE_COMMIT + " order=2 |");
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "missing_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=check"))).toBe(true);
  });

  it("a covered order of 2026 fails (A3)", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", FIXTURE_COMMIT, "2026", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "order_out_of_range")).toBe(true);
    expect(failures.some((failure) => failure.includes("order=2026"))).toBe(true);
  });

  it("a covered order that is not an integer fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", FIXTURE_COMMIT, "two", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "order_not_an_integer")).toBe(true);
  });

  it("two covered services with the same order fail", () => {
    const rows = rowsWith("workbooks", coveredRow("workbooks", "apps/workbooks", FIXTURE_COMMIT, "2", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "order_duplicate")).toBe(true);
    expect(hasReason(failures, "order_missing")).toBe(true);
  });

  it("a covered service without the highest order fails", () => {
    const rows = rowsWithChanges([
      { service: "primary-advantage-app", row: coveredRow("primary-advantage-app", "apps/primary-advantage", FIXTURE_COMMIT, "8", "GET /api/health") },
      { service: "codecamp-advantage", row: coveredRow("codecamp-advantage", "apps/codecamp-advantage", FIXTURE_COMMIT, "9", "GET /api/health") },
    ]);
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "primary_not_last")).toBe(true);
  });

  it("a not-covered entry without the mark fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_mark_missing")).toBe(true);
  });

  it("a not-covered entry without the reason label fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | owner=Daniel | ${NOT_COVERED_MARK}; do not deploy apps/reading-advantage to this service | the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_reason_missing")).toBe(true);
  });

  it("a not-covered entry without the owner label fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | ${NOT_COVERED_MARK}; do not deploy apps/reading-advantage to this service |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_owner_missing")).toBe(true);
  });

  it("a not-covered entry without the legacy image source fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | reason=the live image comes from the legacy repository | owner=Daniel | ${NOT_COVERED_MARK}; do not deploy apps/reading-advantage to this service |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_legacy_path_missing")).toBe(true);
    expect(hasReason(failures, "not_covered_legacy_base_missing")).toBe(true);
  });

  it("a not-covered entry with the app of the reading advantage fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | app=apps/reading-advantage | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel | ${NOT_COVERED_MARK} |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_has_covered_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=app=apps/reading-advantage"))).toBe(true);
  });

  it("a not-covered entry with a commit label fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | commit=${FIXTURE_COMMIT} | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel | ${NOT_COVERED_MARK} |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_has_covered_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=commit="))).toBe(true);
  });

  it("a not-covered entry with an order label fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | order=1 | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel | ${NOT_COVERED_MARK} |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_has_covered_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=order="))).toBe(true);
  });

  it("a not-covered entry with a check label fails", () => {
    const row = `| ${NOT_COVERED_SERVICE} | check=GET /api/health | reason=the live image comes from the legacy repository file ${LEGACY_DOCKERFILE_PATH} line 2 (FROM ${LEGACY_BASE_IMAGE}) | owner=Daniel | ${NOT_COVERED_MARK} |`;
    const failures = validateDoc(buildDoc({ notCoveredRow: row }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "not_covered_has_covered_label")).toBe(true);
    expect(failures.some((failure) => failure.includes("label=check="))).toBe(true);
  });

  it("a document without the runtime note fails", () => {
    const doc = buildDoc().replaceAll(RUNTIME_IMAGE, "the new base image");
    const failures = validateDoc(doc, { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "doc_missing_runtime_note")).toBe(true);
    expect(failures.some((failure) => failure.includes(`missing=${RUNTIME_IMAGE}`))).toBe(true);
  });

  it("a document without the legacy base image fails", () => {
    const doc = buildDoc().replaceAll(LEGACY_BASE_IMAGE, "the old base image");
    const failures = validateDoc(doc, { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "doc_missing_runtime_note")).toBe(true);
    expect(failures.some((failure) => failure.includes(`missing=${LEGACY_BASE_IMAGE}`))).toBe(true);
  });

  it("a document with the git push command fails (A7)", () => {
    const failures = validateDoc(buildDoc({ extra: ["Run git push after the review."] }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "doc_forbidden_command")).toBe(true);
    expect(failures.some((failure) => failure.includes("command=git push"))).toBe(true);
  });

  it("a document with the cloud build command fails (A7)", () => {
    const failures = validateDoc(buildDoc({ extra: ["Run gcloud builds submit after the review."] }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "doc_forbidden_command")).toBe(true);
    expect(failures.some((failure) => failure.includes("command=gcloud builds submit"))).toBe(true);
  });

  it("a covered commit of HEAD fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", "HEAD", "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_is_head")).toBe(true);
  });

  it("a covered commit of latest fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", "latest", "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_is_latest")).toBe(true);
  });

  it("a covered commit of six hex digits fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", "abc123", "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_too_short")).toBe(true);
  });

  it("a covered commit that is not a hex value fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", "notasha", "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_not_hex")).toBe(true);
  });

  it("a covered commit that is not an ancestor fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", FIXTURE_NO_ANCESTOR_COMMIT, "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_not_ancestor")).toBe(true);
  });

  it("a covered commit that does not change the lockfile fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", FIXTURE_NO_LOCKFILE_COMMIT, "6", "GET /api/health"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "commit_does_not_touch_lockfile")).toBe(true);
  });

  it("a covered check without a path fails", () => {
    const rows = rowsWith("marketing", coveredRow("marketing", "apps/marketing", FIXTURE_COMMIT, "6", "deploy succeeded"));
    const failures = validateDoc(buildDoc({ rows }), { checkCommit: fixtureCommitFacts });
    expect(hasReason(failures, "check_has_no_path")).toBe(true);
  });
});
