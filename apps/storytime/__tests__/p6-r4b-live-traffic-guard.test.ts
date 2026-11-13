// @vitest-environment node
/**
 * The live traffic guard (track storytime_app_rebuild_20261025; plan task 6.2, round 4b).
 *
 * PM decision, 2026-11-14: "B2: STORYTIME_REVIEW_DRAFT_WEEKS=1 on the no-traffic review revision:
 * accepted, WITH a guard: add a check line to the deploy list AND a test or script check that
 * fails a live deploy (traffic move) while the service still has STORYTIME_REVIEW_DRAFT_WEEKS; the
 * live deploy uses --remove-env-vars."
 *
 * The guard is a script, because two older scans forbid the switch name in the runbooks
 * (look-adversarial-runbook-scan.test.ts) and in the build files (look-draft-week-switch.test.ts
 * row (f)). The runbook calls the script before the traffic move of step 4.
 *
 * The contract that this file pins (module `apps/storytime/scripts/review/live-traffic-guard.ts`):
 * - `REVIEW_SWITCH_NAMES`: the names of the review switches that the guard covers. The default
 *   list holds `STORYTIME_REVIEW_DRAFT_WEEKS` and `STORYTIME_SHOW_DRAFT_MEDIA`. It does not hold
 *   `STORYTIME_TEACHER_ROUTES` (the PM may change the list; the orchestrator default stands).
 * - `removeEnvVarsArg(names)`: the `--remove-env-vars=<A>,<B>` argument of the live deploy. It
 *   throws on an empty list.
 * - `envOfRevision(describeJson)` reads `spec.containers[0].env` of a revision, and
 *   `envOfService(describeJson)` reads `spec.template.spec.containers[0].env` of a service. Both
 *   return a list of `{ name, value?, valueFrom? }`, and a missing env gives `[]`.
 * - `checkLiveTrafficGuard({ revisionEnv, templateEnv })` returns `{ ok, message }`. It fails when
 *   the target revision env or the service template env holds a switch name, with any value, an
 *   empty value, or a `valueFrom`. The message names the switch names that it found, says
 *   "revision" for a revision hit and "service" for a template hit, and holds no env value and no
 *   other env name.
 * - The command line `tsx apps/storytime/scripts/review/live-traffic-guard.ts` takes
 *   `--revision-json <file> --service-json <file>` (the `--format=json` output of two read-only
 *   gcloud describe commands) and exits 0 on a pass and 1 on a fail. A file that is missing or
 *   holds no JSON fails closed with exit 1. `--revision <name>` reads the same two documents
 *   through gcloud (the runbook form; no row here runs it). `--print-remove-arg` prints
 *   `removeEnvVarsArg(REVIEW_SWITCH_NAMES)` and exits 0. A call with no input exits with a code
 *   other than 0.
 *
 * The rows use fixtures only: no gcloud call, no network. A4: every failing row asserts the switch
 * name in the output, so a missing module or a crash cannot pass a row.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The path of the guard module. */
const MODULE = resolve(app, "scripts/review/live-traffic-guard.ts");

/** The tsx binary of the monorepo. */
const TSX = resolve(repoRoot, "node_modules/.bin/tsx");

/** The runbook that must call the guard. */
const RUNBOOK = resolve(repoRoot, "docs/runbooks/storytime-deploy.md");

const DRAFT_WEEKS = "STORYTIME_REVIEW_DRAFT_WEEKS";
const DRAFT_MEDIA = "STORYTIME_SHOW_DRAFT_MEDIA";
const TEACHER_ROUTES = "STORYTIME_TEACHER_ROUTES";

/** The env names that the guard message must never hold (they are not review switches). */
const OTHER_NAMES = [
  "NODE_ENV",
  "NEXT_PUBLIC_STORAGE_BUCKET_NAME",
  "STORYTIME_MEDIA_BASE",
  TEACHER_ROUTES,
];

/** The names that no runbook may hold (the old scans). */
const RUNBOOK_BANNED = [DRAFT_WEEKS, DRAFT_MEDIA, "NEXT_PUBLIC_STORYTIME_REVIEW"];

/** One env entry of a gcloud describe document. */
interface EnvEntry {
  name: string;
  value?: string;
  valueFrom?: unknown;
}

/** The input of the guard. */
interface GuardInput {
  revisionEnv: EnvEntry[];
  templateEnv: EnvEntry[];
}

/** The result of the guard. */
interface GuardResult {
  ok: boolean;
  message: string;
}

/** A guard function: the real one, the reference, or a mutant. */
type GuardFn = (input: GuardInput) => GuardResult;

/** The secret-like values of the fixtures. No output may hold one of them. */
const SECRET = {
  draft: "sekret-draft-5f3a91",
  media: "sekret-media-8c1d47",
  node: "sekret-node-2b7e63",
  base: "https://sekret-bucket-71ac.example/media",
  teacher: "sekret-teacher-93bd05",
  ref: "sekret-ref-4d9e18",
};

/**
 * Makes one env entry.
 * @param name The env name.
 * @param value The env value, or undefined for an entry with no value field.
 * @returns The entry.
 */
function env(name: string, value?: string): EnvEntry {
  return value === undefined ? { name } : { name, value };
}

/** The env of the live revision: no switch. */
function cleanEnv(): EnvEntry[] {
  return [
    env("NODE_ENV", SECRET.node),
    env("NEXT_PUBLIC_STORAGE_BUCKET_NAME", SECRET.node),
    env("STORYTIME_MEDIA_BASE", SECRET.base),
  ];
}

/** One judged case of the guard. */
interface Case {
  id: string;
  input: GuardInput;
  ok: boolean;
  /** The switch names that the message must hold. */
  names: string[];
  /** A word that the message must hold (lower case), or null. */
  word: "revision" | "service" | null;
}

const CASES: Case[] = [
  {
    id: "1a the revision holds the draft weeks switch",
    input: { revisionEnv: [...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft)], templateEnv: cleanEnv() },
    ok: false,
    names: [DRAFT_WEEKS],
    word: "revision",
  },
  {
    id: "1b the revision holds the draft media switch",
    input: { revisionEnv: [...cleanEnv(), env(DRAFT_MEDIA, SECRET.media)], templateEnv: cleanEnv() },
    ok: false,
    names: [DRAFT_MEDIA],
    word: "revision",
  },
  {
    id: "1c an empty value still fails",
    input: { revisionEnv: [...cleanEnv(), env(DRAFT_WEEKS, "")], templateEnv: cleanEnv() },
    ok: false,
    names: [DRAFT_WEEKS],
    word: "revision",
  },
  {
    id: "1d a switch with a valueFrom reference and no value fails",
    input: {
      revisionEnv: [
        ...cleanEnv(),
        { name: DRAFT_WEEKS, valueFrom: { secretKeyRef: { name: SECRET.ref, key: "k" } } },
      ],
      templateEnv: cleanEnv(),
    },
    ok: false,
    names: [DRAFT_WEEKS],
    word: "revision",
  },
  {
    id: "1e both switches in the revision are both named",
    input: {
      revisionEnv: [...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft), env(DRAFT_MEDIA, SECRET.media)],
      templateEnv: cleanEnv(),
    },
    ok: false,
    names: [DRAFT_WEEKS, DRAFT_MEDIA],
    word: "revision",
  },
  {
    id: "2a a clean revision and a service template with the draft weeks switch fails",
    input: { revisionEnv: cleanEnv(), templateEnv: [...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft)] },
    ok: false,
    names: [DRAFT_WEEKS],
    word: "service",
  },
  {
    id: "2b a clean revision and a service template with the draft media switch fails",
    input: { revisionEnv: cleanEnv(), templateEnv: [...cleanEnv(), env(DRAFT_MEDIA, SECRET.media)] },
    ok: false,
    names: [DRAFT_MEDIA],
    word: "service",
  },
  {
    id: "2c a switch in the template with an empty value fails",
    input: { revisionEnv: cleanEnv(), templateEnv: [...cleanEnv(), env(DRAFT_WEEKS, "")] },
    ok: false,
    names: [DRAFT_WEEKS],
    word: "service",
  },
  {
    id: "3a a clean revision and a clean template pass",
    input: { revisionEnv: cleanEnv(), templateEnv: cleanEnv() },
    ok: true,
    names: [],
    word: null,
  },
  {
    id: "3b the teacher routes flag is not a review switch and passes",
    input: {
      revisionEnv: [...cleanEnv(), env(TEACHER_ROUTES, SECRET.teacher)],
      templateEnv: [...cleanEnv(), env(TEACHER_ROUTES, SECRET.teacher)],
    },
    ok: true,
    names: [],
    word: null,
  },
  {
    id: "3c two empty env lists pass",
    input: { revisionEnv: [], templateEnv: [] },
    ok: true,
    names: [],
    word: null,
  },
  {
    id: "4 a revision and a template with secret-like values: the output holds none",
    input: {
      revisionEnv: [...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft), env(TEACHER_ROUTES, SECRET.teacher)],
      templateEnv: [
        ...cleanEnv(),
        env(DRAFT_MEDIA, SECRET.media),
        { name: DRAFT_WEEKS, valueFrom: { secretKeyRef: { name: SECRET.ref, key: "k" } } },
      ],
    },
    ok: false,
    names: [DRAFT_WEEKS, DRAFT_MEDIA],
    word: "revision",
  },
];

/**
 * Lists every value and reference text of one case. No output may hold any of them.
 * @param input The case input.
 * @returns The secret texts.
 */
function secretsOf(input: GuardInput): string[] {
  const texts: string[] = [];
  for (const entry of [...input.revisionEnv, ...input.templateEnv]) {
    if (entry.value) texts.push(entry.value);
    if (entry.valueFrom !== undefined) texts.push(JSON.stringify(entry.valueFrom));
  }
  texts.push(...Object.values(SECRET));
  return texts;
}

/**
 * Judges one guard on one case.
 * @param guard The guard under judgment.
 * @param item The case.
 * @returns The violation text, or null when the guard satisfies the case.
 */
function judgeCase(guard: GuardFn, item: Case): string | null {
  let result: GuardResult;
  try {
    result = guard(item.input);
  } catch (error) {
    return `case "${item.id}": the guard threw: ${String(error)}`;
  }
  if (typeof result?.ok !== "boolean" || typeof result?.message !== "string") {
    return `case "${item.id}": the result must be { ok: boolean, message: string }`;
  }
  if (result.ok !== item.ok) {
    return `case "${item.id}": ok must be ${item.ok}, received ${result.ok}`;
  }
  for (const secret of secretsOf(item.input)) {
    if (result.message.includes(secret)) {
      return `case "${item.id}": the message holds an env value or a reference`;
    }
  }
  if (!item.ok) {
    for (const name of item.names) {
      if (!result.message.includes(name)) {
        return `case "${item.id}": the message must name ${name}, received "${result.message}"`;
      }
    }
    for (const other of OTHER_NAMES) {
      if (result.message.includes(other)) {
        return `case "${item.id}": the message must hold only switch names, but it holds ${other}`;
      }
    }
    if (item.word && !result.message.toLowerCase().includes(item.word)) {
      return `case "${item.id}": the message must say "${item.word}", received "${result.message}"`;
    }
  }
  return null;
}

/**
 * Judges one guard on every case.
 * @param guard The guard under judgment.
 * @returns The violation texts. An empty list means the guard satisfies every case.
 */
function judgeAll(guard: GuardFn): string[] {
  return CASES.map((item) => judgeCase(guard, item)).filter((text): text is string => text !== null);
}

/** The switch names of the reference guard and of the mutants. */
const NAMES = [DRAFT_WEEKS, DRAFT_MEDIA];

/**
 * Lists the switch names of one env.
 * @param entries The env entries.
 * @returns The switch names, in the order of the entries.
 */
function hitsOf(entries: EnvEntry[]): string[] {
  return entries.filter((entry) => NAMES.includes(entry.name)).map((entry) => entry.name);
}

/** The reference guard: the behavior that the rows demand. It proves the judge is not over strict. */
const referenceGuard: GuardFn = ({ revisionEnv, templateEnv }) => {
  const revision = hitsOf(revisionEnv);
  const template = hitsOf(templateEnv);
  if (revision.length === 0 && template.length === 0) {
    return { ok: true, message: "live traffic guard: no review switch in the revision or the service" };
  }
  const parts: string[] = [];
  if (revision.length) parts.push(`the revision holds ${revision.join(", ")}`);
  if (template.length) parts.push(`the service still has ${template.join(", ")}`);
  return { ok: false, message: `live traffic guard failed: ${parts.join("; ")}` };
};

/** Mutant 1: a guard that checks only the revision. */
const revisionOnlyMutant: GuardFn = ({ revisionEnv }) => referenceGuard({ revisionEnv, templateEnv: [] });

/** Mutant 2: a guard that checks only the service template. */
const templateOnlyMutant: GuardFn = ({ templateEnv }) => referenceGuard({ revisionEnv: [], templateEnv });

/** Mutant 3: a guard that prints the value of the hit. */
const valuePrinterMutant: GuardFn = (input) => {
  const base = referenceGuard(input);
  if (base.ok) return base;
  const values = [...input.revisionEnv, ...input.templateEnv]
    .filter((entry) => NAMES.includes(entry.name))
    .map((entry) => `${entry.name}=${entry.value ?? JSON.stringify(entry.valueFrom)}`);
  return { ok: false, message: `${base.message} (${values.join(", ")})` };
};

/** Mutant 4: a guard that treats an empty value as unset. */
const emptyIgnoredMutant: GuardFn = ({ revisionEnv, templateEnv }) =>
  referenceGuard({
    revisionEnv: revisionEnv.filter((entry) => entry.value !== ""),
    templateEnv: templateEnv.filter((entry) => entry.value !== ""),
  });

/** Mutant 5: a guard that prints every env name of the hit target. */
const namesDumperMutant: GuardFn = (input) => {
  const base = referenceGuard(input);
  if (base.ok) return base;
  const all = [...input.revisionEnv, ...input.templateEnv].map((entry) => entry.name);
  return { ok: false, message: `${base.message} [env: ${all.join(", ")}]` };
};

/** Mutant 6: a guard that never fails. */
const alwaysPassMutant: GuardFn = () => ({ ok: true, message: "live traffic guard: pass" });

/** The loaded guard module, as far as the rows need it. */
type GuardModule = Record<string, unknown>;

/**
 * Loads the guard module without a static import, so a missing module fails a row, not the file.
 * @returns The module.
 * @throws When the file is missing.
 */
async function loadModule(): Promise<GuardModule> {
  if (!existsSync(MODULE)) {
    throw new Error(`the guard module is missing: apps/storytime/scripts/review/live-traffic-guard.ts`);
  }
  return (await import(/* @vite-ignore */ new URL(`file://${MODULE}`).href)) as GuardModule;
}

/**
 * Takes one named function export of the module.
 * @param mod The module.
 * @param name The export name.
 * @returns The function.
 * @throws When the export is not a function.
 */
function fn<T extends (...args: never[]) => unknown>(mod: GuardModule, name: string): T {
  const value = mod[name];
  if (typeof value !== "function") throw new Error(`the guard module must export the function ${name}`);
  return value as T;
}

/**
 * Takes the guard function of the module.
 * @returns The guard.
 */
async function realGuard(): Promise<GuardFn> {
  return fn<GuardFn>(await loadModule(), "checkLiveTrafficGuard");
}

/** The result of one command-line run. */
interface Run {
  status: number | null;
  output: string;
}

/** The temp folders of the rows. */
const folders: string[] = [];

afterAll(() => {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

/**
 * Writes a fixture file into a new temp folder.
 * @param value The JSON value.
 * @returns The path of the file.
 */
function fixtureFile(value: unknown): string {
  const folder = mkdtempSync(join(tmpdir(), "storytime-traffic-guard-"));
  folders.push(folder);
  const path = join(folder, "doc.json");
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
  return path;
}

/**
 * Builds the describe document of a revision.
 * @param entries The env entries.
 * @returns The document.
 */
function revisionDoc(entries: EnvEntry[]): unknown {
  return { metadata: { name: "storytime-app-00099-xyz" }, spec: { containers: [{ env: entries }] } };
}

/**
 * Builds the describe document of a service.
 * @param entries The env entries of the template.
 * @returns The document.
 */
function serviceDoc(entries: EnvEntry[]): unknown {
  return {
    metadata: { name: "storytime-app" },
    spec: { template: { spec: { containers: [{ env: entries }] } } },
  };
}

/**
 * Runs the command line of the guard.
 * @param args The arguments.
 * @returns The exit status and the joined output.
 */
function runCli(args: string[]): Run {
  const result = spawnSync(TSX, [MODULE, ...args], {
    cwd: app,
    encoding: "utf8",
    timeout: 90_000,
  });
  return { status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

/**
 * Asserts the facts that every command-line failure shares.
 * @param run The run.
 * @param name The switch name that the output must hold.
 */
function expectNamedFailure(run: Run, name: string): void {
  expect(run.status, `the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  expect(run.output, "the output must name the switch").toContain(name);
  expect(run.output, "the output must not be a crash").not.toMatch(
    /Cannot find|MODULE_NOT_FOUND|SyntaxError|TypeError|ReferenceError/,
  );
  for (const secret of Object.values(SECRET)) {
    expect(run.output, "the output must hold no env value").not.toContain(secret);
  }
}

/** The labeled counts of the Red evidence (A4). */
let casesChecked = 0;
let mutantsRejected = 0;
let cliRuns = 0;

describe("P6 r4b the judge accepts the reference guard", () => {
  it("the reference guard satisfies every case", () => {
    expect(judgeAll(referenceGuard), "the reference guard must pass every case").toEqual([]);
    expect(CASES.length, "the case list must hold 11 or more cases").toBeGreaterThanOrEqual(11);
  });
});

describe("P6 r4b rows 1 to 4: the guard function", () => {
  for (const item of CASES) {
    it(`row ${item.id}`, async () => {
      casesChecked += 1;
      const guard = await realGuard();
      expect(judgeCase(guard, item), "the real guard must satisfy the case").toBeNull();
    });
  }
});

describe("P6 r4b row 5: the switch list and the remove argument", () => {
  it("lists exactly the two review switches and not the teacher routes flag", async () => {
    const mod = await loadModule();
    const names = mod.REVIEW_SWITCH_NAMES;
    expect(Array.isArray(names), "REVIEW_SWITCH_NAMES must be an array").toBe(true);
    expect([...(names as string[])].sort()).toEqual([DRAFT_MEDIA, DRAFT_WEEKS].sort());
    expect(names as string[]).not.toContain(TEACHER_ROUTES);
  });

  it("builds the --remove-env-vars argument from the list", async () => {
    const mod = await loadModule();
    const build = fn<(names: readonly string[]) => string>(mod, "removeEnvVarsArg");
    const names = mod.REVIEW_SWITCH_NAMES as string[];
    expect(build(names)).toBe(`--remove-env-vars=${names.join(",")}`);
    expect(build(["A_ONE", "B_TWO"])).toBe("--remove-env-vars=A_ONE,B_TWO");
    expect(build(names), "the argument holds no value and no space").not.toMatch(/\s|=1|=[^,]*=/);
    expect(() => build([]), "an empty list must throw").toThrow();
  });

  it("reads the env of a revision document and of a service document", async () => {
    const mod = await loadModule();
    const ofRevision = fn<(doc: unknown) => EnvEntry[]>(mod, "envOfRevision");
    const ofService = fn<(doc: unknown) => EnvEntry[]>(mod, "envOfService");
    const entries = [env("A_ONE", "x1"), env("B_TWO")];
    expect(ofRevision(revisionDoc(entries))).toEqual(entries);
    expect(ofService(serviceDoc(entries))).toEqual(entries);
    expect(ofRevision({ spec: { containers: [{}] } }), "no env gives []").toEqual([]);
    expect(ofService({ spec: { template: { spec: { containers: [] } } } }), "no container gives []").toEqual([]);
    expect(ofService(revisionDoc(entries)), "a revision shape is not a service shape").toEqual([]);
  });
});

describe("P6 r4b row 5 and 1 to 3: the command line", () => {
  it("--print-remove-arg prints the helper output (the live path uses the helper)", async () => {
    cliRuns += 1;
    const mod = await loadModule();
    const build = fn<(names: readonly string[]) => string>(mod, "removeEnvVarsArg");
    const run = runCli(["--print-remove-arg"]);
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output.trim()).toBe(build(mod.REVIEW_SWITCH_NAMES as string[]));
    expect(run.output).toContain(DRAFT_WEEKS);
  });

  it("fails when the revision document holds a switch, with no value in the output", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(revisionDoc([...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft)])),
      "--service-json",
      fixtureFile(serviceDoc(cleanEnv())),
    ]);
    expectNamedFailure(run, DRAFT_WEEKS);
  });

  it("fails when only the service template holds a switch", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(revisionDoc(cleanEnv())),
      "--service-json",
      fixtureFile(serviceDoc([...cleanEnv(), env(DRAFT_MEDIA, SECRET.media)])),
    ]);
    expectNamedFailure(run, DRAFT_MEDIA);
    expect(run.output.toLowerCase(), "a template hit says service").toContain("service");
  });

  it("passes a clean revision and a clean service, and prints no value", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(revisionDoc(cleanEnv())),
      "--service-json",
      fixtureFile(serviceDoc(cleanEnv())),
    ]);
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    expect(run.output, "a pass is not a crash").not.toMatch(/Cannot find|MODULE_NOT_FOUND|Error/);
    for (const secret of Object.values(SECRET)) expect(run.output).not.toContain(secret);
  });

  it("fails closed on a file that holds no JSON", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile("this is not json"),
      "--service-json",
      fixtureFile(serviceDoc(cleanEnv())),
    ]);
    expect(run.status, "unreadable input must exit 1").toBe(1);
    expect(run.output, "the failure must come from the guard, not from a missing module").not.toMatch(
      /Cannot find|MODULE_NOT_FOUND/,
    );
    expect(run.output.trim().length, "the failure must print a reason").toBeGreaterThan(0);
  });

  it("exits with a code other than 0 when no input is given", () => {
    cliRuns += 1;
    const run = runCli([]);
    expect(run.status, "a call with no input must not pass").not.toBe(0);
    expect(run.status, "a missing module must not pass for a usage error").not.toBeNull();
    expect(run.output, "the exit must come from the guard, not from a missing module").not.toMatch(
      /Cannot find|MODULE_NOT_FOUND/,
    );
    expect(run.output).toMatch(/--revision/);
  });
});

describe("P6 r4b row 6: the runbook calls the guard before the traffic move", () => {
  const runbook = (): string => readFileSync(RUNBOOK, "utf8");

  it("runs the guard command inside step 4, before its update-traffic line", () => {
    const text = runbook();
    const step4 = text.search(/^4\. Move the traffic/m);
    const step5 = text.search(/^5\. Rollback/m);
    expect(step4, "the runbook must hold step 4").toBeGreaterThanOrEqual(0);
    expect(step5, "the runbook must hold step 5").toBeGreaterThan(step4);
    const block = text.slice(step4, step5);
    const guardAt = block.indexOf("scripts/review/live-traffic-guard.ts");
    const trafficAt = block.indexOf("update-traffic");
    expect(guardAt, "step 4 must run scripts/review/live-traffic-guard.ts").toBeGreaterThanOrEqual(0);
    expect(trafficAt, "step 4 must hold the update-traffic line").toBeGreaterThanOrEqual(0);
    expect(guardAt, "the guard must come before the update-traffic line").toBeLessThan(trafficAt);
    const line = block.split("\n").find((entry) => entry.includes("live-traffic-guard.ts")) ?? "";
    expect(line, "the guard line must run tsx").toContain("tsx");
    expect(line, "the guard line must name the target revision").toContain("--revision");
  });

  it("tells step 4 to build the live revision with the printed remove argument", () => {
    const text = runbook();
    const step4 = text.search(/^4\. Move the traffic/m);
    const step5 = text.search(/^5\. Rollback/m);
    const block = text.slice(step4, step5);
    expect(block, "step 4 must use the helper output for the removal").toContain("--print-remove-arg");
    expect(block, "step 4 must name the removal flag").toContain("--remove-env-vars");
  });

  it("still holds no review switch name (the old scans stay green)", () => {
    const text = runbook();
    const hits = RUNBOOK_BANNED.filter((name) => text.includes(name));
    expect(hits, "the runbook must hold no review switch name").toEqual([]);
  });
});

describe("P6 r4b row 7: the mutants that the rows reject", () => {
  const mutants: Array<[string, GuardFn, string]> = [
    ["a guard that checks only the revision", revisionOnlyMutant, "2"],
    ["a guard that checks only the service template", templateOnlyMutant, "1"],
    ["a guard that prints the value", valuePrinterMutant, "4"],
    ["a guard that treats an empty value as unset", emptyIgnoredMutant, "1c"],
    ["a guard that prints every env name", namesDumperMutant, "1"],
    ["a guard that never fails", alwaysPassMutant, "1"],
  ];
  for (const [label, mutant, rowPrefix] of mutants) {
    it(`rejects ${label}`, () => {
      const violations = judgeAll(mutant);
      expect(violations.length, `the rows must reject ${label}`).toBeGreaterThan(0);
      expect(
        violations.some((text) => text.startsWith(`case "${rowPrefix}`)),
        `the row ${rowPrefix} must be among the rejecting rows, received ${violations.join(" | ")}`,
      ).toBe(true);
      mutantsRejected += 1;
    });
  }

  it("labels the Red counts with floors (A4)", () => {
    console.log(`cases_checked=${casesChecked}`);
    console.log(`cli_runs=${cliRuns}`);
    console.log(`mutants_rejected=${mutantsRejected}`);
    expect(casesChecked, "cases_checked floor 11").toBeGreaterThanOrEqual(11);
    expect(cliRuns, "cli_runs floor 6").toBeGreaterThanOrEqual(6);
    expect(mutantsRejected, "mutants_rejected floor 6").toBeGreaterThanOrEqual(6);
  });
});
