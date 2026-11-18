// @vitest-environment node
/**
 * The three review switches stay off for the release 1 traffic move (track
 * storytime_app_rebuild_20261025; plan task 7.7, group r2).
 *
 * PM decision, 2026-11-14: "Teacher routes off on live on 11-20: YES." The review builds of the
 * day put three switches on the service template: `STORYTIME_REVIEW_DRAFT_WEEKS`,
 * `STORYTIME_SHOW_DRAFT_MEDIA`, and `STORYTIME_TEACHER_ROUTES`. The guard of round 4b covers only
 * the first two, so a revision that still holds `STORYTIME_TEACHER_ROUTES` passes it.
 *
 * The contract that this file pins:
 * 1. The live traffic guard (`apps/storytime/scripts/review/live-traffic-guard.ts`) refuses a
 *    traffic move to a revision, and to a service template, that holds ANY of the three switches,
 *    with any value (also empty, also `0`, also a `valueFrom`). The refusal names each switch that
 *    it found. It passes a revision with none of them. The output holds no value and no other
 *    env name. `REVIEW_SWITCH_NAMES` lists the three names, and `--print-remove-arg` prints one
 *    `--remove-env-vars=` argument with the three names.
 * 2. The runbook `docs/runbooks/storytime-deploy.md`: step 4 holds one `--remove-env-vars=` list
 *    with the three names (the `=` form is the form that the guard prints; the older runbook rows
 *    read the first `--remove-env-vars <name>` with a space as the teacher flag removal). Item 3
 *    of the flag list, the env-name compare, names the three switches as absent on the live
 *    revision.
 * 3. Step 4 of the runbook runs the guard before the traffic move and stops on a refusal.
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

/** The deploy runbook. */
const RUNBOOK = resolve(repoRoot, "docs/runbooks/storytime-deploy.md");

const DRAFT_WEEKS = "STORYTIME_REVIEW_DRAFT_WEEKS";
const DRAFT_MEDIA = "STORYTIME_SHOW_DRAFT_MEDIA";
const TEACHER_ROUTES = "STORYTIME_TEACHER_ROUTES";

/** The three review switches, in a fixed order. */
const THREE = [DRAFT_WEEKS, DRAFT_MEDIA, TEACHER_ROUTES];

/** The env names that a refusal message must never hold (they are not review switches). */
const OTHER_NAMES = ["NODE_ENV", "NEXT_PUBLIC_STORAGE_BUCKET_NAME", "STORYTIME_MEDIA_BASE"];

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

/** A teacher routes entry that holds only a `valueFrom` reference. */
function teacherRef(): EnvEntry {
  return { name: TEACHER_ROUTES, valueFrom: { secretKeyRef: { name: SECRET.ref, key: "k" } } };
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
    id: "c01 the revision holds only the teacher routes flag",
    input: { revisionEnv: [...cleanEnv(), env(TEACHER_ROUTES, "1")], templateEnv: cleanEnv() },
    ok: false,
    names: [TEACHER_ROUTES],
    word: "revision",
  },
  {
    id: "c02 the service template holds only the teacher routes flag",
    input: { revisionEnv: cleanEnv(), templateEnv: [...cleanEnv(), env(TEACHER_ROUTES, "1")] },
    ok: false,
    names: [TEACHER_ROUTES],
    word: "service",
  },
  {
    id: "c03 a teacher routes value of 0 still fails (any value)",
    input: { revisionEnv: [...cleanEnv(), env(TEACHER_ROUTES, "0")], templateEnv: cleanEnv() },
    ok: false,
    names: [TEACHER_ROUTES],
    word: "revision",
  },
  {
    id: "c04 an empty teacher routes value still fails",
    input: { revisionEnv: [...cleanEnv(), env(TEACHER_ROUTES, "")], templateEnv: cleanEnv() },
    ok: false,
    names: [TEACHER_ROUTES],
    word: "revision",
  },
  {
    id: "c05 a teacher routes valueFrom reference with no value fails in the template",
    input: { revisionEnv: cleanEnv(), templateEnv: [...cleanEnv(), teacherRef()] },
    ok: false,
    names: [TEACHER_ROUTES],
    word: "service",
  },
  {
    id: "c06 all three switches in the revision are all named",
    input: {
      revisionEnv: [
        ...cleanEnv(),
        env(DRAFT_WEEKS, SECRET.draft),
        env(DRAFT_MEDIA, SECRET.media),
        env(TEACHER_ROUTES, SECRET.teacher),
      ],
      templateEnv: cleanEnv(),
    },
    ok: false,
    names: THREE,
    word: "revision",
  },
  {
    id: "c07 all three switches in the service template are all named",
    input: {
      revisionEnv: cleanEnv(),
      templateEnv: [
        ...cleanEnv(),
        env(DRAFT_WEEKS, SECRET.draft),
        env(DRAFT_MEDIA, SECRET.media),
        env(TEACHER_ROUTES, SECRET.teacher),
      ],
    },
    ok: false,
    names: THREE,
    word: "service",
  },
  {
    id: "c08 the draft weeks switch in the revision and the teacher flag in the template",
    input: {
      revisionEnv: [...cleanEnv(), env(DRAFT_WEEKS, SECRET.draft)],
      templateEnv: [...cleanEnv(), env(TEACHER_ROUTES, SECRET.teacher)],
    },
    ok: false,
    names: [DRAFT_WEEKS, TEACHER_ROUTES],
    word: "revision",
  },
  {
    id: "c09 a look-alike name passes (the guard matches the exact names)",
    input: {
      revisionEnv: [...cleanEnv(), env("NEXT_PUBLIC_STORYTIME_TEACHER_ROUTES", "1")],
      templateEnv: [...cleanEnv(), env("STORYTIME_TEACHER_ROUTES_DOCS", "1")],
    },
    ok: true,
    names: [],
    word: null,
  },
  {
    id: "c10 a clean revision and a clean template pass",
    input: { revisionEnv: cleanEnv(), templateEnv: cleanEnv() },
    ok: true,
    names: [],
    word: null,
  },
  {
    id: "c11 secret-like values on all three: the output holds none and no other env name",
    input: {
      revisionEnv: [...cleanEnv(), env(TEACHER_ROUTES, SECRET.teacher), env(DRAFT_WEEKS, SECRET.draft)],
      templateEnv: [...cleanEnv(), env(DRAFT_MEDIA, SECRET.media), teacherRef()],
    },
    ok: false,
    names: THREE,
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
    if (entry.value && entry.value.length >= 3) texts.push(entry.value);
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

/**
 * Lists the switch names of one env.
 * @param entries The env entries.
 * @param names The names that count as a hit.
 * @returns The switch names, in the order of the entries.
 */
function hitsOf(entries: EnvEntry[], names: readonly string[] = THREE): string[] {
  return entries.filter((entry) => names.includes(entry.name)).map((entry) => entry.name);
}

/**
 * Builds a reference guard over a list of entry filters.
 * @param keep The filter that decides which entries the guard looks at.
 * @param names The switch names.
 * @returns A guard.
 */
function makeGuard(keep: (entry: EnvEntry) => boolean, names: readonly string[] = THREE): GuardFn {
  return ({ revisionEnv, templateEnv }) => {
    const revision = hitsOf(revisionEnv.filter(keep), names);
    const template = hitsOf(templateEnv.filter(keep), names);
    if (revision.length === 0 && template.length === 0) {
      return { ok: true, message: "live traffic guard: no review switch in the revision or the service" };
    }
    const parts: string[] = [];
    if (revision.length) parts.push(`the revision holds ${revision.join(", ")}`);
    if (template.length) parts.push(`the service still has ${template.join(", ")}`);
    return { ok: false, message: `live traffic guard failed: ${parts.join("; ")}` };
  };
}

/** The reference guard: the behavior that the rows demand. It proves the judge is not over strict. */
const referenceGuard: GuardFn = makeGuard(() => true);

/** Mutant 1: the guard of round 4b, with the two draft switches only. */
const twoSwitchMutant: GuardFn = makeGuard(() => true, [DRAFT_WEEKS, DRAFT_MEDIA]);

/** Mutant 2: a guard that checks only the revision. */
const revisionOnlyMutant: GuardFn = ({ revisionEnv }) => referenceGuard({ revisionEnv, templateEnv: [] });

/** Mutant 3: a guard that checks only the service template. */
const templateOnlyMutant: GuardFn = ({ templateEnv }) => referenceGuard({ revisionEnv: [], templateEnv });

/** Mutant 4: a guard that prints the value of the hit. */
const valuePrinterMutant: GuardFn = (input) => {
  const base = referenceGuard(input);
  if (base.ok) return base;
  const values = [...input.revisionEnv, ...input.templateEnv]
    .filter((entry) => THREE.includes(entry.name))
    .map((entry) => `${entry.name}=${entry.value ?? JSON.stringify(entry.valueFrom)}`);
  return { ok: false, message: `${base.message} (${values.join(", ")})` };
};

/** Mutant 5: a guard that treats an empty value as unset. */
const emptyIgnoredMutant: GuardFn = makeGuard((entry) => entry.value !== "");

/** Mutant 6: a guard that treats the value 0 as off. */
const zeroIgnoredMutant: GuardFn = makeGuard((entry) => entry.value !== "0");

/** Mutant 7: a guard that ignores a valueFrom reference. */
const valueFromIgnoredMutant: GuardFn = makeGuard((entry) => entry.valueFrom === undefined);

/** Mutant 8: a guard that prints every env name of the hit target. */
const namesDumperMutant: GuardFn = (input) => {
  const base = referenceGuard(input);
  if (base.ok) return base;
  const all = [...input.revisionEnv, ...input.templateEnv].map((entry) => entry.name);
  return { ok: false, message: `${base.message} [env: ${all.join(", ")}]` };
};

/** Mutant 9: a guard that never fails. */
const alwaysPassMutant: GuardFn = () => ({ ok: true, message: "live traffic guard: pass" });

/** Mutant 10: a guard that matches a name prefix, so a look-alike name fails. */
const prefixMutant: GuardFn = ({ revisionEnv, templateEnv }) => {
  const near = (entries: EnvEntry[]): string[] =>
    entries.filter((entry) => THREE.some((name) => entry.name.includes(name))).map((entry) => entry.name);
  const revision = near(revisionEnv);
  const template = near(templateEnv);
  if (revision.length === 0 && template.length === 0) return { ok: true, message: "pass" };
  return { ok: false, message: `fail: the revision holds ${revision.join(", ")}; the service has ${template.join(", ")}` };
};

/** The loaded guard module, as far as the rows need it. */
type GuardModule = Record<string, unknown>;

/**
 * Loads the guard module without a static import, so a missing module fails a row, not the file.
 * @returns The module.
 * @throws When the file is missing.
 */
async function loadModule(): Promise<GuardModule> {
  if (!existsSync(MODULE)) {
    throw new Error("the guard module is missing: apps/storytime/scripts/review/live-traffic-guard.ts");
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
  const folder = mkdtempSync(join(tmpdir(), "storytime-r2-guard-"));
  folders.push(folder);
  const path = join(folder, "doc.json");
  writeFileSync(path, JSON.stringify(value));
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
  const result = spawnSync(TSX, [MODULE, ...args], { cwd: app, encoding: "utf8", timeout: 90_000 });
  return { status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

/**
 * Asserts the facts that every command-line refusal shares.
 * @param run The run.
 * @param names The switch names that the output must hold.
 */
function expectRefusal(run: Run, names: string[]): void {
  expect(run.status, `the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  for (const name of names) expect(run.output, `the output must name ${name}`).toContain(name);
  expect(run.output, "the output must not be a crash").not.toMatch(
    /Cannot find|MODULE_NOT_FOUND|SyntaxError|TypeError|ReferenceError/,
  );
  for (const secret of Object.values(SECRET)) {
    expect(run.output, "the output must hold no env value").not.toContain(secret);
  }
  for (const other of OTHER_NAMES) {
    expect(run.output, "the output must hold no other env name").not.toContain(other);
  }
}

/** The labeled counts of the Red evidence (A4). */
let casesChecked = 0;
let mutantsRejected = 0;
let cliRuns = 0;
let runbookRows = 0;

describe("P7 r2: the judge accepts the reference guard", () => {
  it("the reference guard satisfies every case", () => {
    expect(judgeAll(referenceGuard), "the reference guard must pass every case").toEqual([]);
    expect(CASES.length, "the case list must hold 11 or more cases").toBeGreaterThanOrEqual(11);
  });
});

describe("P7 r2 rows c01 to c11: the guard function covers the three switches", () => {
  for (const item of CASES) {
    it(`row ${item.id}`, async () => {
      casesChecked += 1;
      const guard = fn<GuardFn>(await loadModule(), "checkLiveTrafficGuard");
      expect(judgeCase(guard, item), "the real guard must satisfy the case").toBeNull();
    });
  }
});

describe("P7 r2 row s: the switch list and the remove argument", () => {
  it("lists exactly the three review switches", async () => {
    const mod = await loadModule();
    const names = mod.REVIEW_SWITCH_NAMES;
    expect(Array.isArray(names), "REVIEW_SWITCH_NAMES must be an array").toBe(true);
    expect([...(names as string[])].sort()).toEqual([...THREE].sort());
  });

  it("--print-remove-arg prints one --remove-env-vars= argument with the three names", async () => {
    cliRuns += 1;
    const mod = await loadModule();
    const build = fn<(names: readonly string[]) => string>(mod, "removeEnvVarsArg");
    const run = runCli(["--print-remove-arg"]);
    expect(run.status, `exit 0 expected, output: ${run.output.slice(0, 300)}`).toBe(0);
    const printed = run.output.trim();
    expect(printed, "the argument starts with --remove-env-vars=").toMatch(/^--remove-env-vars=\S+$/);
    const listed = printed.replace(/^--remove-env-vars=/, "").split(",");
    expect([...listed].sort(), "the argument names the three switches and nothing else").toEqual([...THREE].sort());
    expect(printed, "the argument is the helper output").toBe(build(mod.REVIEW_SWITCH_NAMES as string[]));
  });
});

describe("P7 r2 rows k: the command line refuses and passes", () => {
  it("fails when the revision document holds only the teacher routes flag", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(revisionDoc([...cleanEnv(), env(TEACHER_ROUTES, SECRET.teacher)])),
      "--service-json",
      fixtureFile(serviceDoc(cleanEnv())),
    ]);
    expectRefusal(run, [TEACHER_ROUTES]);
    expect(run.output.toLowerCase(), "a revision hit says revision").toContain("revision");
  });

  it("fails when only the service template holds the teacher routes flag", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(revisionDoc(cleanEnv())),
      "--service-json",
      fixtureFile(serviceDoc([...cleanEnv(), env(TEACHER_ROUTES, "1")])),
    ]);
    expectRefusal(run, [TEACHER_ROUTES]);
    expect(run.output.toLowerCase(), "a template hit says service").toContain("service");
  });

  it("names all three switches when the revision holds all three, with no value in the output", () => {
    cliRuns += 1;
    const run = runCli([
      "--revision-json",
      fixtureFile(
        revisionDoc([
          ...cleanEnv(),
          env(DRAFT_WEEKS, SECRET.draft),
          env(DRAFT_MEDIA, SECRET.media),
          env(TEACHER_ROUTES, SECRET.teacher),
        ]),
      ),
      "--service-json",
      fixtureFile(serviceDoc(cleanEnv())),
    ]);
    expectRefusal(run, THREE);
  });

  it("passes a revision and a service with none of the three switches, and prints no value", () => {
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
});

describe("P7 r2 rows r: the runbook removes the three switches and compares the names", () => {
  const runbook = (): string => readFileSync(RUNBOOK, "utf8");

  /**
   * Cuts step 4 out of the runbook.
   * @param text The runbook text.
   * @returns The text from the heading of step 4 to the heading of step 5.
   */
  function step4Of(text: string): string {
    const start = text.search(/^4\. Move the traffic/m);
    const stop = text.search(/^5\. Rollback/m);
    expect(start, "the runbook must hold step 4").toBeGreaterThanOrEqual(0);
    expect(stop, "the runbook must hold step 5 after step 4").toBeGreaterThan(start);
    return text.slice(start, stop);
  }

  /**
   * Cuts the teacher flag section out of the runbook.
   * @param text The runbook text.
   * @returns The section text.
   */
  function flagSectionOf(text: string): string {
    const start = text.indexOf("## The teacher routes flag");
    expect(start, "the runbook must hold the flag section").toBeGreaterThanOrEqual(0);
    const rest = text.slice(start + 3);
    const end = rest.indexOf("\n## ");
    return end === -1 ? rest : rest.slice(0, end);
  }

  /**
   * Returns the text of one numbered item of the flag list.
   * @param section The flag section text.
   * @param number The item number.
   * @returns The item text, or an empty text when the item is missing.
   */
  function itemOf(section: string, number: number): string {
    const match = new RegExp(
      `\\n {2}${number}\\. ([\\s\\S]*?)(?=\\n {2}${number + 1}\\. |\\n\\n {2}Find the new revision name|$)`,
    ).exec(section);
    return match?.[1] ?? "";
  }

  /**
   * Lists the name lists of every `--remove-env-vars=` argument of a text.
   * @param text The text to scan.
   * @returns One entry per argument, each a list of names.
   */
  function removeLists(text: string): string[][] {
    return [...text.matchAll(/--remove-env-vars=([A-Za-z0-9_,]+)/g)].map((match) => match[1]!.split(","));
  }

  it("r1: step 4 removes the three switches with one --remove-env-vars= list, and no partial list", () => {
    runbookRows += 1;
    const lists = removeLists(step4Of(runbook()));
    const full = lists.filter((names) => [...names].sort().join(",") === [...THREE].sort().join(","));
    expect(
      full.length,
      `remove_lists_in_step4=${lists.length} full_lists=${full.length}: step 4 must hold --remove-env-vars=${THREE.join(",")} (any order)`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      lists.filter((names) => !full.includes(names)),
      "no list in step 4 may leave one of the three switches out",
    ).toEqual([]);
  });

  it("r2: the env-name compare names the three switches as absent on the live revision", () => {
    runbookRows += 1;
    const item = itemOf(flagSectionOf(runbook()), 3).replace(/\s+/g, " ");
    expect(item, "item 3 of the flag list must hold the env-name compare").toContain("env.name");
    const sentences = item.split(/\.\s+/);
    const hit = sentences.find(
      (sentence) => THREE.every((name) => sentence.includes(name)) && /absent/.test(sentence) && /live/.test(sentence),
    );
    expect(
      hit,
      `compare_sentences=${sentences.length}: one sentence of item 3 must name ${THREE.join(", ")} as absent on the live revision`,
    ).toBeDefined();
  });

  it("r3 (characterization, passes at the base): step 4 runs the guard before the traffic move and stops on a refusal", () => {
    runbookRows += 1;
    const block = step4Of(runbook());
    const guardAt = block.indexOf("scripts/review/live-traffic-guard.ts");
    const trafficAt = block.indexOf("update-traffic");
    expect(guardAt, "step 4 must run the guard").toBeGreaterThanOrEqual(0);
    expect(trafficAt, "step 4 must hold the update-traffic line").toBeGreaterThan(guardAt);
    const flat = block.replace(/\s+/g, " ");
    expect(flat, "step 4 must tell the operator that a guard failure stops the step").toMatch(
      /guard failure stops the step/,
    );
    expect(flat, "step 4 must forbid the traffic move after exit 1").toMatch(
      /Do not move the traffic after exit 1/,
    );
  });

});

describe("P7 r2 mutants: the rows reject a weak guard", () => {
  const mutants: Array<[string, GuardFn, string]> = [
    ["the two-switch guard of round 4b", twoSwitchMutant, "c01"],
    ["a guard that checks only the revision", revisionOnlyMutant, "c02"],
    ["a guard that checks only the service template", templateOnlyMutant, "c01"],
    ["a guard that prints the value", valuePrinterMutant, "c11"],
    ["a guard that treats an empty value as unset", emptyIgnoredMutant, "c04"],
    ["a guard that treats the value 0 as off", zeroIgnoredMutant, "c03"],
    ["a guard that ignores a valueFrom reference", valueFromIgnoredMutant, "c05"],
    ["a guard that prints every env name", namesDumperMutant, "c01"],
    ["a guard that never fails", alwaysPassMutant, "c01"],
    ["a guard that matches look-alike names", prefixMutant, "c09"],
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
});

describe("P7 r2 labels", () => {
  it("labels the Red counts with floors (A4)", () => {
    console.log(`cases_checked=${casesChecked}`);
    console.log(`cli_runs=${cliRuns}`);
    console.log(`mutants_rejected=${mutantsRejected}`);
    console.log(`runbook_rows=${runbookRows}`);
    expect(casesChecked, "cases_checked floor 11").toBeGreaterThanOrEqual(11);
    expect(cliRuns, "cli_runs floor 5").toBeGreaterThanOrEqual(5);
    expect(runbookRows, "runbook_rows floor 3").toBeGreaterThanOrEqual(3);
    expect(mutantsRejected, "mutants_rejected floor 10").toBeGreaterThanOrEqual(10);
  });
});
