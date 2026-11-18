// @vitest-environment node
/**
 * Adversarial cases for the Phase 6 r1 work (track storytime_app_rebuild_20261025; plan task
 * 6.7, role measure-adversarial-testing, round r1).
 *
 * Targets:
 * - `apps/storytime/scripts/review/live-traffic-guard.ts` must fail closed on a hostile describe
 *   document before the live traffic move of 2026-11-20.
 * - `apps/storytime/__tests__/phase2b-browser-gate.sh` must fail on an empty real-database
 *   collection and must not be fooled by a crafted vitest log.
 *
 * Groups:
 * 1. Guard documents: BOM, trailing garbage, nested nulls, a `__proto__` entry, a switch behind
 *    `valueFrom`, empty and "false" switch values, duplicate entries, a huge document, deep
 *    nesting outside the judged path, and an injected tag in the traffic section.
 * 2. Switch lookalikes: case, spacing, and homoglyph variants of the switch names must NOT
 *    trigger a block (the app reads the exact names, so a looser match would block clean
 *    deploys; these rows pin the exact-match contract).
 * 3. Traffic-section noise: duplicate entries and percent sums that are not 100 are outside the
 *    guard contract (the guard judges the environment only); the rows pin that the noise never
 *    masks an environment hit and never prints its content.
 * 4. Gate verdict: the mixed pass/skip rows of Review A finding A611 (the plan decides: at
 *    least one passed row, 0 failed, exit 0 is a pass), a CRLF log, a fake `Tests` line before
 *    the real summary, and an empty log file.
 *
 * Known weaknesses and defects:
 * - F1 (defect, routed to Green, rows stay failing): the guard reads and validates only the
 *   FIRST container of a revision or service document. A review switch in a second container
 *   passes with exit 0 and the clean verdict, and a malformed second container passes the
 *   structure check. Cloud Run supports multi-container services; fail closed means judge every
 *   container.
 * - F2 (known weakness, it.fails): `--print-remove-arg` short-circuits the command line, so a
 *   call that combines print mode with document flags exits 0 without judging the documents.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The path of the guard module. */
const MODULE = resolve(app, "scripts/review/live-traffic-guard.ts");

/** The tsx binary of the monorepo. */
const TSX = resolve(repoRoot, "node_modules/.bin/tsx");

/** The gate script. */
const GATE = resolve(app, "__tests__/phase2b-browser-gate.sh");

const DRAFT_WEEKS = "STORYTIME_REVIEW_DRAFT_WEEKS";
const SHOW_DRAFT_MEDIA = "STORYTIME_SHOW_DRAFT_MEDIA";
const TEACHER_ROUTES = "STORYTIME_TEACHER_ROUTES";

/** A secret-shaped value that the output must never print. */
const SECRET = "secret-value-p6adv-do-not-print";

/** The output must hold no clean verdict on a rejected document. */
const CLEAN_VERDICT = /no review switch/i;

/** The output of a failure must not be a crash or a missing module. */
const CRASH = /Cannot find|MODULE_NOT_FOUND|SyntaxError|TypeError|ReferenceError|RangeError/;

/** The temp folders of the rows. */
const folders: string[] = [];

afterAll(() => {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

/**
 * Makes a new temp folder.
 * @returns The folder path.
 */
function tempFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "storytime-adv-p6-"));
  folders.push(folder);
  return folder;
}

/**
 * Writes a fixture file into a new temp folder.
 * @param value A JSON value, or a string that is written as raw text.
 * @returns The path of the file.
 */
function fixtureFile(value: unknown): string {
  const path = join(tempFolder(), "doc.json");
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
  return path;
}

/** The two describe documents that the guard reads. */
type Kind = "revision" | "service";

/**
 * Builds a describe document that holds the given containers value.
 * @param kind The document kind.
 * @param containers The containers value.
 * @returns The document.
 */
function withContainers(kind: Kind, containers: unknown): unknown {
  return kind === "revision"
    ? { metadata: { name: "storytime-app-00099-xyz" }, spec: { containers } }
    : { metadata: { name: "storytime-app" }, spec: { template: { spec: { containers } } } };
}

/**
 * Builds a describe document with one container of the given value.
 * @param kind The document kind.
 * @param container The first container.
 * @returns The document.
 */
function withContainer(kind: Kind, container: unknown): unknown {
  return withContainers(kind, [container]);
}

/**
 * Builds a clean, valid describe document.
 * @param kind The document kind.
 * @returns The document.
 */
function cleanDoc(kind: Kind): Record<string, unknown> {
  return withContainer(kind, { env: [{ name: "NODE_ENV", value: "production" }] }) as Record<string, unknown>;
}

/** The result of one command-line run. */
interface Run {
  status: number | null;
  output: string;
}

/**
 * Runs the command line of the guard.
 * @param args The arguments.
 * @returns The exit status and the joined output.
 */
function runCli(args: string[]): Run {
  const result = spawnSync(TSX, [MODULE, ...args], { cwd: app, encoding: "utf8", timeout: 90_000 });
  return { status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

/**
 * Runs the guard on two document files.
 * @param revision The revision document value.
 * @param service The service document value.
 * @returns The run.
 */
function runFiles(revision: unknown, service: unknown): Run {
  return runCli(["--revision-json", fixtureFile(revision), "--service-json", fixtureFile(service)]);
}

/**
 * Asserts that a run failed closed.
 * @param run The run.
 * @param what A label for the failure message.
 */
function expectFailedClosed(run: Run, what: string): void {
  expect(run.status, `${what}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  expect(run.output, `${what}: the output must hold no clean verdict`).not.toMatch(CLEAN_VERDICT);
  expect(run.output, `${what}: the output must not be a crash`).not.toMatch(CRASH);
  expect(run.output.trim().length, `${what}: the failure must print a reason`).toBeGreaterThan(0);
  expect(run.output, `${what}: the output must hold no secret value`).not.toContain(SECRET);
}

/**
 * Asserts that a run passed clean.
 * @param run The run.
 * @param what A label for the failure message.
 */
function expectClean(run: Run, what: string): void {
  expect(run.status, `${what}: the guard must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
  expect(run.output, `${what}: the output must hold the clean verdict`).toMatch(CLEAN_VERDICT);
  expect(run.output, `${what}: the output must hold no secret value`).not.toContain(SECRET);
}

/* ------------------------------------------------------------------ */
/* Group 1: hostile documents.                                        */
/* ------------------------------------------------------------------ */

/** The labeled counts of the adversarial evidence (A3, A4). */
let hostileCases = 0;
let hostileRejected = 0;

describe("P6 adversarial: hostile describe documents fail closed", () => {
  const BOM = "\uFEFF";
  const cleanRevision = JSON.stringify(cleanDoc("revision"));
  const cleanService = JSON.stringify(cleanDoc("service"));

  const hostile: Array<[string, unknown, unknown]> = [
    ["a BOM before the revision JSON", `${BOM}${cleanRevision}`, cleanDoc("service")],
    ["a BOM before the service JSON", cleanDoc("revision"), `${BOM}${cleanService}`],
    ["trailing garbage after the revision JSON", `${cleanRevision}\n garbage`, cleanDoc("service")],
    ["trailing garbage after the service JSON", cleanDoc("revision"), `${cleanService} {`],
    ["a second JSON document after the first", cleanDoc("revision"), `${cleanService}\n${cleanService}`],
    ["spec is null (revision)", { spec: null }, cleanDoc("service")],
    ["template is null (service)", cleanDoc("revision"), { spec: { template: null } }],
    ["template spec is null (service)", cleanDoc("revision"), { spec: { template: { spec: null } } }],
    [
      "an env entry with only __proto__",
      { spec: { containers: [{ env: [{ __proto__: { name: DRAFT_WEEKS, value: SECRET } }] }] } },
      cleanDoc("service"),
    ],
  ];

  for (const [label, revision, service] of hostile) {
    it(`rejects ${label}`, () => {
      hostileCases += 1;
      expectFailedClosed(runFiles(revision, service), label);
      hostileRejected += 1;
    });
  }

  it("rejects a huge document that holds a switch deep in a long env list", () => {
    hostileCases += 1;
    const env = [];
    for (let index = 0; index < 50_000; index += 1) {
      env.push({ name: `VAR_${index}`, value: "x" });
    }
    env.push({ name: TEACHER_ROUTES, value: SECRET });
    const run = runFiles(cleanDoc("revision"), withContainer("service", { env }));
    expect(run.status, `a switch in a huge document must block, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "the output must name the switch").toContain(TEACHER_ROUTES);
    expect(run.output, "the output must hold no secret value").not.toContain(SECRET);
    hostileRejected += 1;
  });

  it("judges a document with deep nesting outside the env path", () => {
    let nested: Record<string, unknown> = { leaf: true };
    for (let depth = 0; depth < 200; depth += 1) nested = { level: depth, next: nested };
    const doc = withContainer("service", { env: [{ name: "NODE_ENV", value: "production" }] });
    (doc as { metadata: Record<string, unknown> }).metadata.annotations = nested;
    const run = runFiles(cleanDoc("revision"), doc);
    expect(run.status, `deep nesting elsewhere must not break the verdict, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.status === 0 ? run.output : "", "a broken parse must fail closed, and this run passed").toMatch(
      CLEAN_VERDICT,
    );
  });
});

describe("P6 adversarial: a held switch blocks with any value shape", () => {
  const held: Array<[string, Record<string, unknown>]> = [
    ["an empty string value", { name: DRAFT_WEEKS, value: "" }],
    ["the value 0 as a string", { name: DRAFT_WEEKS, value: "0" }],
    ["the value false as a string", { name: SHOW_DRAFT_MEDIA, value: "false" }],
    ["a valueFrom secret reference", { name: TEACHER_ROUTES, valueFrom: { secretKeyRef: { name: SECRET } } }],
  ];
  for (const [label, entry] of held) {
    it(`blocks on ${label}`, () => {
      hostileCases += 1;
      const run = runFiles(cleanDoc("revision"), withContainer("service", { env: [entry] }));
      expect(run.status, `${label}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
      expect(run.output, `${label}: the output must name the switch`).toContain(String(entry.name));
      expect(run.output, `${label}: the output must hold no secret value`).not.toContain(SECRET);
      hostileRejected += 1;
    });
  }

  it("blocks on a duplicated switch entry", () => {
    hostileCases += 1;
    const env = [
      { name: DRAFT_WEEKS, value: "1" },
      { name: DRAFT_WEEKS, value: SECRET },
    ];
    const run = runFiles(withContainer("revision", { env }), cleanDoc("service"));
    expect(run.status, `a duplicated switch must block, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "the output must name the switch").toContain(DRAFT_WEEKS);
    expect(run.output, "the output must hold no secret value").not.toContain(SECRET);
    hostileRejected += 1;
  });
});

/* ------------------------------------------------------------------ */
/* Group 2: switch lookalikes must NOT block (exact-match contract).  */
/* ------------------------------------------------------------------ */

describe("P6 adversarial: lookalike names do not block (the app reads the exact names)", () => {
  const lookalikes: Array<[string, string]> = [
    ["lower case", DRAFT_WEEKS.toLowerCase()],
    ["a trailing space", `${DRAFT_WEEKS} `],
    ["a leading space", ` ${DRAFT_WEEKS}`],
    ["a missing final letter", DRAFT_WEEKS.slice(0, -1)],
    ["an extra suffix", `${DRAFT_WEEKS}_EXTRA`],
    ["a Cyrillic homoglyph", "STORYTIME_TЕACHER_ROUTES"],
    ["a newline inside the name", `${SHOW_DRAFT_MEDIA}\nX`],
    ["a tab around the name", `\t${TEACHER_ROUTES}\t`],
  ];
  for (const [label, name] of lookalikes) {
    it(`passes clean on ${label}`, () => {
      const run = runFiles(withContainer("revision", { env: [{ name, value: SECRET }] }), cleanDoc("service"));
      expectClean(run, `lookalike ${label}`);
    });
  }
});

/* ------------------------------------------------------------------ */
/* Group 3: the traffic section is out of scope, and noise there      */
/* must neither mask an env hit nor reach the output.                 */
/* ------------------------------------------------------------------ */

describe("P6 adversarial: the traffic section never masks the environment", () => {
  /** A service document with a hostile traffic section. */
  const noisyTraffic = {
    status: {
      traffic: [
        { revisionName: "storytime-app-00098-abc", percent: 60, tag: `st-x"; ${SHOW_DRAFT_MEDIA}="${SECRET}"` },
        { revisionName: "storytime-app-00098-abc", percent: 60 },
        { revisionName: "storytime-app-00099-xyz", percent: 70 },
      ],
    },
  };

  it("passes clean when the env is clean and the traffic section is hostile", () => {
    const service = { ...cleanDoc("service"), ...noisyTraffic } as Record<string, unknown>;
    const run = runFiles(cleanDoc("revision"), service);
    expectClean(run, "hostile traffic section with clean env");
    expect(run.output, "the tag content must not reach the output").not.toContain(SHOW_DRAFT_MEDIA);
  });

  it("still blocks when the traffic section is hostile and the env holds a switch", () => {
    const base = withContainer("service", { env: [{ name: TEACHER_ROUTES, value: "1" }] }) as Record<string, unknown>;
    const run = runFiles(cleanDoc("revision"), { ...base, ...noisyTraffic });
    expect(run.status, `traffic noise must not mask a switch, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "the output must name the switch").toContain(TEACHER_ROUTES);
  });
});

/* ------------------------------------------------------------------ */
/* F1: the guard reads only the first container (defect, to Green).   */
/* ------------------------------------------------------------------ */

describe("P6 adversarial F1: a review switch outside the first container (defect, routed to Green)", () => {
  it("F1 service: a switch in the second container must block the traffic move", () => {
    const service = withContainers("service", [
      { env: [{ name: "NODE_ENV", value: "production" }] },
      { env: [{ name: TEACHER_ROUTES, value: SECRET }] },
    ]);
    const run = runFiles(cleanDoc("revision"), service);
    expect(run.status, `F1: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "F1: the output must hold no clean verdict").not.toMatch(CLEAN_VERDICT);
    expect(run.output, "F1: the output must name the switch").toContain(TEACHER_ROUTES);
    expect(run.output, "F1: the output must hold no secret value").not.toContain(SECRET);
  });

  it("F1 revision: a switch in the second container must block the traffic move", () => {
    const revision = withContainers("revision", [
      { env: [{ name: "NODE_ENV", value: "production" }] },
      { env: [{ name: DRAFT_WEEKS, value: SECRET }] },
    ]);
    const run = runFiles(revision, cleanDoc("service"));
    expect(run.status, `F1: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "F1: the output must hold no clean verdict").not.toMatch(CLEAN_VERDICT);
    expect(run.output, "F1: the output must name the switch").toContain(DRAFT_WEEKS);
    expect(run.output, "F1: the output must hold no secret value").not.toContain(SECRET);
  });

  it("F1 structure: a malformed second container must fail closed", () => {
    const service = withContainers("service", [{ env: [] }, null]);
    const run = runFiles(cleanDoc("revision"), service);
    expect(run.status, `F1: a malformed second container must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
    expect(run.output, "F1: the output must hold no clean verdict").not.toMatch(CLEAN_VERDICT);
  });
});

/* ------------------------------------------------------------------ */
/* F2: --print-remove-arg short-circuits the document check (known    */
/* weakness, it.fails).                                               */
/* ------------------------------------------------------------------ */

describe("P6 adversarial F2: the print mode of the command line", () => {
  it.fails(
    "print mode combined with document flags must judge the documents (today it prints and exits 0)",
    () => {
      const run = runCli(["--print-remove-arg", "--revision-json", fixtureFile({}), "--service-json", fixtureFile({})]);
      expect(
        run.status,
        `F2: a combined call must not exit 0 without judging, output: ${run.output.slice(0, 300)}`,
      ).toBe(1);
    },
  );

  it("print mode alone prints the remove argument and exits 0", () => {
    const run = runCli(["--print-remove-arg"]);
    expect(run.status, `print mode must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output).toContain(`--remove-env-vars=${DRAFT_WEEKS}`);
  });
});

/* ------------------------------------------------------------------ */
/* Group 4: the phase 2b gate verdict on crafted logs.                */
/* ------------------------------------------------------------------ */

/** The first line of the verdict block. */
const START = "REAL_DB_SUMMARY=";

/** The line before which the verdict block ends. */
const END = 'echo "=== Seed the accounts of the gate ==="';

/**
 * Cuts the verdict block out of the gate script.
 * @returns The block text.
 * @throws When an anchor line is missing.
 */
function verdictBlock(): string {
  const text = readFileSync(GATE, "utf8");
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(START));
  const end = lines.findIndex((line) => line.trim() === END);
  if (start < 0) throw new Error(`the gate script has no line that begins ${START}`);
  if (end < 0 || end <= start) throw new Error(`the gate script has no anchor line ${END} after the verdict block`);
  return lines.slice(start, end).join("\n");
}

/** The result of one verdict run. */
interface Verdict {
  status: number | null;
  passes: number;
  fails: number;
  output: string;
}

/**
 * Runs the real verdict block on a fake vitest log and a fake exit code.
 * @param log The fake vitest log text.
 * @param rc The fake exit code of the vitest run: 0 or 1.
 * @returns The exit status of the harness, the count of pass calls, the count of fail calls, and the output.
 */
function runVerdict(log: string, rc: number): Verdict {
  const folder = tempFolder();
  const logPath = join(folder, "real-db.log");
  writeFileSync(logPath, log);
  const script = [
    "set -uo pipefail",
    "pass() { echo \"VERDICT_PASS: $1\"; }",
    "fail() { echo \"VERDICT_FAIL: $1\"; }",
    `REAL_DB_LOG='${logPath}'`,
    `REAL_DB_RC=${rc}`,
    verdictBlock(),
    "",
  ].join("\n");
  const run = spawnSync("bash", ["-c", script], { encoding: "utf8", timeout: 30_000 });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  return {
    status: run.status,
    passes: (output.match(/^VERDICT_PASS:/gm) ?? []).length,
    fails: (output.match(/^VERDICT_FAIL:/gm) ?? []).length,
    output,
  };
}

/**
 * Builds a vitest log with a summary.
 * @param summary The text of the `Tests` summary line, or null for a log with no summary line.
 * @param tail Text after the summary.
 * @returns The log text.
 */
function vitestLog(summary: string | null, tail = ""): string {
  const head = " RUN  v3.2.4 /repo/packages/backend\n\n";
  if (summary === null) return `${head}No test files found, exiting with code 0\n${tail}`;
  return `${head} Test Files  1 passed (1)\n      Tests  ${summary}\n   Start at  10:00:00\n   Duration  1.20s\n${tail}`;
}

describe("P6 adversarial A611: the mixed pass/skip rows pin the plan decision", () => {
  it("4 passed and 1 skipped with exit 0 passes (plan 6.7 mixed-case choice)", () => {
    const run = runVerdict(vitestLog("4 passed | 1 skipped (5)"), 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.fails, `the decided mixed case must give no fail, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.passes, "the decided mixed case must give a pass").toBeGreaterThanOrEqual(1);
  });

  it("1 passed and 8 skipped with exit 0 passes under the same rule (A611)", () => {
    const run = runVerdict(vitestLog("1 passed | 8 skipped (9)"), 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output, "the block must print its labeled counts").toMatch(/real_db_tests=9 real_db_failed=0/);
    expect(run.fails, `one passed row passes under the plan rule, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.passes, "one passed row gives a pass").toBeGreaterThanOrEqual(1);
  });
});

describe("P6 adversarial: crafted gate logs", () => {
  it("a CRLF log with passed rows and exit 0 passes", () => {
    const run = runVerdict(vitestLog("5 passed (5)").replace(/\n/g, "\r\n"), 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.fails, `a CRLF pass log must give no fail, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.passes, "a CRLF pass log must give a pass").toBeGreaterThanOrEqual(1);
  });

  it("a CRLF log with 0 passed and exit 0 fails", () => {
    const run = runVerdict(vitestLog("3 skipped (3)").replace(/\n/g, "\r\n"), 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.fails, `a CRLF skipped-only log must fail, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
    expect(run.passes, "a CRLF skipped-only log must give no pass").toBe(0);
  });

  it("an empty log file fails", () => {
    const run = runVerdict("", 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.fails, `an empty log must fail, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
    expect(run.passes, "an empty log must give no pass").toBe(0);
  });

  it("a fake Tests line before the real summary does not mask an empty collection", () => {
    const log = ` RUN  v3.2.4 /repo/packages/backend\n  Tests  99 passed (99)\n      Tests  3 skipped (3)\n   Duration  1.20s\n`;
    const run = runVerdict(log, 0);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output, "the block must use the LAST Tests line").toMatch(/real_db_tests=3 real_db_failed=0/);
    expect(run.fails, `the real (last) summary rules, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
  });

  it("a lowercase tests line is not a summary and fails closed", () => {
    const log = " RUN  v3.2.4 /repo/packages/backend\n      tests  5 passed (5)\n   Duration  1.20s\n";
    const run = runVerdict(log, 0);
    expect(run.fails, `a lowercase line must read as no summary, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
    expect(run.passes, "a lowercase line must give no pass").toBe(0);
  });

  it("an all-passed summary with exit 1 still fails (the exit code rules)", () => {
    const run = runVerdict(vitestLog("5 passed (5)"), 1);
    expect(run.status, `the harness must exit 0, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.fails, `exit 1 must give a fail, output: ${run.output.slice(0, 300)}`).toBeGreaterThanOrEqual(1);
  });

  it.fails(
    "a fake Tests line after the real summary must not mask an empty collection (today the last line wins)",
    () => {
      const log = vitestLog("3 skipped (3)", "  Tests  99 passed (99)\n");
      const run = runVerdict(log, 0);
      expect(
        run.fails,
        `a stray Tests line after the summary masks the empty collection, output: ${run.output.slice(0, 300)}`,
      ).toBeGreaterThanOrEqual(1);
    },
  );
});

/* ------------------------------------------------------------------ */
/* The labeled counts (A3, A4).                                       */
/* ------------------------------------------------------------------ */

describe("P6 adversarial: the labeled counts", () => {
  it("labels the adversarial counts with floors", () => {
    console.log(`hostile_cases=${hostileCases}`);
    console.log(`hostile_rejected=${hostileRejected}`);
    expect(hostileCases, "hostile_cases floor 12").toBeGreaterThanOrEqual(12);
    expect(hostileRejected, "hostile_rejected equals hostile_cases").toBe(hostileCases);
  });
});
