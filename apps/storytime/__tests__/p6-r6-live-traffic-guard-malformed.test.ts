// @vitest-environment node
/**
 * The live traffic guard fails closed on a malformed describe document (track
 * storytime_app_rebuild_20261025; plan task 6.6, Phase 6 remediation group r1).
 *
 * Source: Review B of Phase 6, finding B601 [Blocker]: "apps/storytime/scripts/review/live-traffic-guard.ts:84-110
 * and 232-238 treats a malformed revision or service describe document as an empty environment and
 * exits 0 ... A valid JSON document such as {} therefore passes without environment inspection. This can
 * move live traffic while a review switch remains set. Require the expected describe structure and fail
 * closed on malformed input; keep a valid container with no env entries as clean."
 *
 * The contract that this file pins (command line `tsx apps/storytime/scripts/review/live-traffic-guard.ts`,
 * both the `--revision-json`/`--service-json` form and the `--revision` gcloud form):
 * - The guard exits 1, prints a reason, and prints no clean verdict, when either describe document is
 *   malformed. The nine classes of the input table (below) apply to the revision document and to the
 *   service document alike.
 * - A valid container with no `env` key, and a valid container with `env: []`, stay clean (exit 0).
 * - A valid container with a review switch stays blocked (exit 1, the switch name in the output).
 * - Class 9 decision (PM default): an env entry that is no object, or has no string `name`, fails
 *   closed. A malformed entry could hide a switch, so the guard does not skip it.
 *
 * The old rows of `p6-r4b-live-traffic-guard.test.ts` stay: `envOfRevision` and `envOfService` stay
 * lenient (an absent list gives `[]`). The structure check is a separate step of the guard.
 *
 * A4: every malformed row asserts exit 1, so a guard that exits 0 fails the row with an assertion. The
 * rows run fixtures only, with a stand-in `gcloud` on the PATH for the live form: no network.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The path of the guard module. */
const MODULE = resolve(app, "scripts/review/live-traffic-guard.ts");

/** The tsx binary of the monorepo. */
const TSX = resolve(repoRoot, "node_modules/.bin/tsx");

const DRAFT_WEEKS = "STORYTIME_REVIEW_DRAFT_WEEKS";

/** An env value that the output must never print. */
const SECRET = "secret-value-p6r6-do-not-print";

/** The two describe documents that the guard reads. */
type Kind = "revision" | "service";
const KINDS: readonly Kind[] = ["revision", "service"];

/** The output must hold no clean verdict on a malformed document. */
const CLEAN_VERDICT = /no review switch/i;

/** The output of a failure must not be a crash or a missing module. */
const CRASH = /Cannot find|MODULE_NOT_FOUND|SyntaxError|TypeError|ReferenceError/;

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
  const folder = mkdtempSync(join(tmpdir(), "storytime-traffic-guard-r6-"));
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

/**
 * Builds a describe document that holds the given containers value.
 * @param kind The document kind.
 * @param containers The containers value, valid or not.
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
 * @param container The first container, valid or not.
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
function cleanDoc(kind: Kind): unknown {
  return withContainer(kind, { env: [{ name: "NODE_ENV", value: "production" }] });
}

/** One malformed document of the input table. */
interface Malformed {
  klass: number;
  label: string;
  doc: (kind: Kind) => unknown;
}

/** The malformed documents. A string result is written as raw text. */
const MALFORMED: Malformed[] = [
  { klass: 1, label: "empty object", doc: () => ({}) },

  { klass: 2, label: "spec without containers", doc: (k) => (k === "revision" ? { spec: {} } : { spec: { template: { spec: {} } } }) },
  { klass: 2, label: "metadata only", doc: () => ({ metadata: { name: "x" } }) },
  { klass: 2, label: "spec only", doc: () => ({ spec: {} }) },
  { klass: 2, label: "template without spec", doc: () => ({ spec: { template: {} } }) },
  { klass: 2, label: "the other kind's shape", doc: (k) => cleanDoc(k === "revision" ? "service" : "revision") },

  { klass: 3, label: "containers is an object", doc: (k) => withContainers(k, { env: [] }) },
  { klass: 3, label: "containers is a string", doc: (k) => withContainers(k, "containers") },
  { klass: 3, label: "containers is a number", doc: (k) => withContainers(k, 7) },
  { klass: 3, label: "containers is null", doc: (k) => withContainers(k, null) },

  { klass: 4, label: "containers is an empty array", doc: (k) => withContainers(k, []) },

  { klass: 5, label: "first container is null", doc: (k) => withContainer(k, null) },
  { klass: 5, label: "first container is a string", doc: (k) => withContainer(k, "container") },
  { klass: 5, label: "first container is a number", doc: (k) => withContainer(k, 7) },
  { klass: 5, label: "first container is an array", doc: (k) => withContainer(k, []) },

  { klass: 6, label: "env is an object", doc: (k) => withContainer(k, { env: { name: "NODE_ENV" } }) },
  { klass: 6, label: "env is a string", doc: (k) => withContainer(k, { env: "NODE_ENV" }) },
  { klass: 6, label: "env is a number", doc: (k) => withContainer(k, { env: 7 }) },
  { klass: 6, label: "env is null", doc: (k) => withContainer(k, { env: null }) },

  { klass: 7, label: "top level is an array", doc: () => [] },
  { klass: 7, label: "top level is null", doc: () => "null" },
  { klass: 7, label: "top level is a number", doc: () => "7" },
  { klass: 7, label: "top level is a string", doc: () => JSON.stringify("just a string") },
  { klass: 7, label: "top level is true", doc: () => "true" },

  { klass: 8, label: "not JSON", doc: () => "this is not json" },
  { klass: 8, label: "empty input", doc: () => "" },
  { klass: 8, label: "blank input", doc: () => "  \n" },
  { klass: 8, label: "truncated JSON", doc: () => '{"spec": {"containers": [' },

  { klass: 9, label: "env entry is null", doc: (k) => withContainer(k, { env: [null] }) },
  { klass: 9, label: "env entry is a string", doc: (k) => withContainer(k, { env: ["NODE_ENV"] }) },
  { klass: 9, label: "env entry is a number", doc: (k) => withContainer(k, { env: [7] }) },
  { klass: 9, label: "env entry is an array", doc: (k) => withContainer(k, { env: [[]] }) },
  { klass: 9, label: "env entry is an empty object", doc: (k) => withContainer(k, { env: [{}] }) },
  { klass: 9, label: "env entry has a value and no name", doc: (k) => withContainer(k, { env: [{ value: SECRET }] }) },
  { klass: 9, label: "env entry name is a number", doc: (k) => withContainer(k, { env: [{ name: 5, value: SECRET }] }) },
  { klass: 9, label: "env entry name is null", doc: (k) => withContainer(k, { env: [{ name: null, value: SECRET }] }) },
  {
    klass: 9,
    label: "a bad entry after a valid entry",
    doc: (k) => withContainer(k, { env: [{ name: "NODE_ENV", value: "production" }, { value: SECRET }] }),
  },
];

/** The result of one command-line run. */
interface Run {
  status: number | null;
  output: string;
}

/**
 * Runs the command line of the guard.
 * @param args The arguments.
 * @param env The environment of the child process.
 * @returns The exit status and the joined output.
 */
function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Run {
  const result = spawnSync(TSX, [MODULE, ...args], { cwd: app, encoding: "utf8", timeout: 90_000, env });
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
 * Runs the live form of the guard with a stand-in `gcloud` on the PATH. The stand-in prints the
 * given text for `revisions describe` and for `services describe`, and runs no network call.
 * @param revision The revision describe output.
 * @param service The service describe output.
 * @returns The run.
 */
function runWithFakeGcloud(revision: unknown, service: unknown): Run {
  const folder = tempFolder();
  const text = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));
  writeFileSync(join(folder, "revision.json"), text(revision));
  writeFileSync(join(folder, "service.json"), text(service));
  const script = join(folder, "gcloud");
  writeFileSync(
    script,
    [
      "#!/bin/sh",
      'case "$*" in',
      `  *"revisions describe"*) cat "${join(folder, "revision.json")}" ;;`,
      `  *"services describe"*) cat "${join(folder, "service.json")}" ;;`,
      "  *) exit 2 ;;",
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(script, 0o755);
  return runCli(["--revision", "storytime-app-00099-xyz"], {
    ...process.env,
    PATH: `${folder}:${process.env.PATH ?? ""}`,
  });
}

/**
 * Asserts that a run failed closed on a malformed document.
 * @param run The run.
 * @param what A label for the failure message.
 */
function expectFailedClosed(run: Run, what: string): void {
  expect(run.status, `${what}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  expect(run.output, `${what}: the output must hold no clean verdict`).not.toMatch(CLEAN_VERDICT);
  expect(run.output, `${what}: the output must not be a crash`).not.toMatch(CRASH);
  expect(run.output.trim().length, `${what}: the failure must print a reason`).toBeGreaterThan(0);
  expect(run.output, `${what}: the output must hold no env value`).not.toContain(SECRET);
}

/** The labeled counts of the Red evidence (A3, A4). */
let malformedCases = 0;
let malformedRejected = 0;
let controlRuns = 0;

describe("P6 r6 the module exists (so a failing row is an assertion, not a load error)", () => {
  it("the guard module and the tsx binary are present", () => {
    expect(existsSync(MODULE), "the guard module must exist").toBe(true);
    expect(existsSync(TSX), "the tsx binary must exist").toBe(true);
  });

  it("the table covers the nine classes", () => {
    const classes = new Set(MALFORMED.map((item) => item.klass));
    expect([...classes].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("P6 r6 controls that stay as they were", () => {
  it("a valid container with no env key stays clean in both documents", () => {
    controlRuns += 1;
    const run = runFiles(withContainer("revision", {}), withContainer("service", {}));
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output).toMatch(CLEAN_VERDICT);
  });

  it("a valid container with env [] stays clean in both documents", () => {
    controlRuns += 1;
    const run = runFiles(withContainer("revision", { env: [] }), withContainer("service", { env: [] }));
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output).toMatch(CLEAN_VERDICT);
  });

  it("a valid container with a review switch stays blocked in each document", () => {
    for (const kind of KINDS) {
      controlRuns += 1;
      const dirty = withContainer(kind, { env: [{ name: "NODE_ENV", value: "production" }, { name: DRAFT_WEEKS, value: SECRET }] });
      const run =
        kind === "revision" ? runFiles(dirty, cleanDoc("service")) : runFiles(cleanDoc("revision"), dirty);
      expect(run.status, `${kind}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
      expect(run.output, `${kind}: the output must name the switch`).toContain(DRAFT_WEEKS);
      expect(run.output, `${kind}: the output must hold no env value`).not.toContain(SECRET);
    }
  });

  it("the live form with two clean documents passes (the stand-in gcloud works)", () => {
    controlRuns += 1;
    const run = runWithFakeGcloud(cleanDoc("revision"), cleanDoc("service"));
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output).toMatch(CLEAN_VERDICT);
  });
});

describe("P6 r6 the guard fails closed on a malformed document (files form)", () => {
  for (const item of MALFORMED) {
    for (const kind of KINDS) {
      it(`class ${item.klass} ${kind}: ${item.label}`, () => {
        malformedCases += 1;
        const bad = item.doc(kind);
        const run = kind === "revision" ? runFiles(bad, cleanDoc("service")) : runFiles(cleanDoc("revision"), bad);
        expectFailedClosed(run, `class ${item.klass} ${kind} ${item.label}`);
        malformedRejected += 1;
      });
    }
  }
});

describe("P6 r6 the guard fails closed on a malformed document (live form, stand-in gcloud)", () => {
  const live: Array<[string, unknown, unknown]> = [
    ["an empty revision document", {}, cleanDoc("service")],
    ["an empty service document", cleanDoc("revision"), {}],
    ["a revision with an empty containers list", withContainers("revision", []), cleanDoc("service")],
    ["a service with a malformed env entry", cleanDoc("revision"), withContainer("service", { env: [null] })],
    ["a service document that is an array", cleanDoc("revision"), []],
  ];
  for (const [label, revision, service] of live) {
    it(`class 1 to 9, live form: ${label}`, () => {
      malformedCases += 1;
      const run = runWithFakeGcloud(revision, service);
      expectFailedClosed(run, `live form ${label}`);
      malformedRejected += 1;
    });
  }
});

describe("P6 r6 the labeled counts (A3, A4)", () => {
  it("labels the Red counts with floors", () => {
    console.log(`malformed_cases=${malformedCases}`);
    console.log(`malformed_rejected=${malformedRejected}`);
    console.log(`control_runs=${controlRuns}`);
    expect(malformedCases, "malformed_cases floor 70").toBeGreaterThanOrEqual(70);
    expect(malformedRejected, "every malformed case must be rejected: malformed_rejected equals malformed_cases").toBe(
      malformedCases,
    );
    expect(controlRuns, "control_runs floor 5").toBeGreaterThanOrEqual(5);
  });
});
