// @vitest-environment node
/**
 * Adversarial cases for the Phase 6 r2 fix (track storytime_app_rebuild_20261025; plan task 6.7,
 * role measure-adversarial-testing, round r2).
 *
 * Source: r1 finding F1. The live traffic guard read and validated only the first container of a
 * describe document. Green fixed it in 661dd866d. The guard now validates every container and
 * reads the environment of every container of the revision and of the service template.
 *
 * This file attacks the new multi-container code:
 * 1. Controls that must exit 0: a clean two-container document, a clean three-container document,
 *    a document of empty object containers, and an envFrom-only document.
 * 2. A switch in any container must exit 1: the third of three, the middle of three, only the
 *    service template's second container, a duplicate container name, a `valueFrom` secret, a huge
 *    containers list, and the live form.
 * 3. Mixed validity must fail closed: a good container plus a container whose `env` is not a list,
 *    or a container that is not an object, gives exit 1 with a structure reason for the second
 *    container.
 *
 * envFrom is a documented control, not a defect. The Cloud Run v1 discovery document marks
 * `Container.envFrom` and `EnvFromSource` as "Not supported by Cloud Run"
 * (https://run.googleapis.com/$discovery/rest?version=v1). A review switch reaches a Cloud Run
 * container through `env[].value` or `env[].valueFrom.secretKeyRef`, so the guard's `env` read
 * covers every way a switch can arrive. One row pins the boundary.
 *
 * Known weakness (it.fails): a `--revision` value that starts with "-" is handed to gcloud as an
 * option, so the guard does not reject the value as a usage error (Review B r2 note N5). The row
 * flips red when a fix lands.
 *
 * The rows run fixtures only. The live-form rows put a stand-in `gcloud` on the PATH, so no row
 * runs a network call. Every row asserts exit code and output, so a module that fails to load
 * cannot pass a row.
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
const TEACHER_ROUTES = "STORYTIME_TEACHER_ROUTES";

/** A secret-shaped value that the output must never print. */
const SECRET = "secret-value-p6r2-do-not-print";

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
  const folder = mkdtempSync(join(tmpdir(), "storytime-adv-p6r2-"));
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
 * A valid container with one clean environment entry.
 * @returns The container.
 */
function cleanContainer(): Record<string, unknown> {
  return { env: [{ name: "NODE_ENV", value: "production" }] };
}

/**
 * A valid container that holds one review switch.
 * @param name The switch name.
 * @returns The container.
 */
function switchContainer(name: string = TEACHER_ROUTES): Record<string, unknown> {
  return { env: [{ name, value: SECRET }] };
}

/**
 * A clean document with a given number of clean containers.
 * @param kind The document kind.
 * @param count The number of containers.
 * @returns The document.
 */
function cleanDoc(kind: Kind, count = 1): unknown {
  return withContainers(
    kind,
    Array.from({ length: count }, () => cleanContainer()),
  );
}

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

/** The runs of a labeled count. */
let blockCases = 0;
let blocked = 0;
let cleanControls = 0;

/**
 * Asserts that a run blocked on a switch name.
 * @param run The run.
 * @param what A label for the failure message.
 * @param switchName The switch name that the output must hold.
 */
function expectBlocked(run: Run, what: string, switchName: string): void {
  expect(run.status, `${what}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  expect(run.output, `${what}: the output must hold no clean verdict`).not.toMatch(CLEAN_VERDICT);
  expect(run.output, `${what}: the output must not be a crash`).not.toMatch(CRASH);
  expect(run.output, `${what}: the output must name the switch`).toContain(switchName);
  expect(run.output, `${what}: the output must hold no secret value`).not.toContain(SECRET);
  expect(run.output.trim().length, `${what}: the failure must print a reason`).toBeGreaterThan(0);
  blocked += 1;
}

/**
 * Asserts that a run failed closed with a structure reason for a later container.
 * @param run The run.
 * @param what A label for the failure message.
 */
function expectStructureFailure(run: Run, what: string): void {
  expect(run.status, `${what}: the guard must exit 1, output: ${run.output.slice(0, 300)}`).toBe(1);
  expect(run.output, `${what}: the output must hold no clean verdict`).not.toMatch(CLEAN_VERDICT);
  expect(run.output, `${what}: the output must not be a crash`).not.toMatch(CRASH);
  expect(run.output, `${what}: the reason must name the second container`).toContain("container 2");
  expect(run.output, `${what}: the output must hold no secret value`).not.toContain(SECRET);
  blocked += 1;
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
/* Controls: a clean multi-container document exits 0.                */
/* ------------------------------------------------------------------ */

describe("P6 r2 controls: clean multi-container documents pass", () => {
  it("the module and the tsx binary are present", () => {
    expect(existsSync(MODULE), "the guard module must exist").toBe(true);
    expect(existsSync(TSX), "the tsx binary must exist").toBe(true);
  });

  it("passes a clean two-container revision and a clean two-container service", () => {
    cleanControls += 1;
    const run = runFiles(cleanDoc("revision", 2), cleanDoc("service", 2));
    expectClean(run, "clean two-container documents");
  });

  it("passes a clean three-container revision and a clean three-container service", () => {
    cleanControls += 1;
    const run = runFiles(cleanDoc("revision", 3), cleanDoc("service", 3));
    expectClean(run, "clean three-container documents");
  });

  it("passes documents whose containers are empty objects", () => {
    cleanControls += 1;
    const run = runFiles(withContainers("revision", [{}, {}]), withContainers("service", [{}, {}]));
    expectClean(run, "empty object containers");
  });

  it("passes envFrom-only containers (documented control: Cloud Run does not support envFrom)", () => {
    cleanControls += 1;
    const envFrom = [{ secretRef: { name: SECRET, key: SECRET } }];
    const run = runFiles(
      withContainers("revision", [{ envFrom }, { envFrom }]),
      withContainers("service", [{ envFrom }, { envFrom }]),
    );
    expectClean(run, "envFrom-only containers");
  });
});

/* ------------------------------------------------------------------ */
/* A switch in any container blocks.                                 */
/* ------------------------------------------------------------------ */

describe("P6 r2: a switch in any container blocks the traffic move", () => {
  it("blocks a switch in the third of three containers of the service", () => {
    blockCases += 1;
    const run = runFiles(cleanDoc("revision", 3), withContainers("service", [cleanContainer(), cleanContainer(), switchContainer()]));
    expectBlocked(run, "switch in the third service container", TEACHER_ROUTES);
  });

  it("blocks a switch in the third of three containers of the revision", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [cleanContainer(), cleanContainer(), switchContainer(DRAFT_WEEKS)]), cleanDoc("service", 3));
    expectBlocked(run, "switch in the third revision container", DRAFT_WEEKS);
  });

  it("blocks a switch only in the service template's second container", () => {
    blockCases += 1;
    const run = runFiles(cleanDoc("revision", 1), withContainers("service", [cleanContainer(), switchContainer()]));
    expectBlocked(run, "switch only in the service second container", TEACHER_ROUTES);
  });

  it("blocks a switch only in the revision's second container", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [cleanContainer(), switchContainer(DRAFT_WEEKS)]), cleanDoc("service", 1));
    expectBlocked(run, "switch only in the revision second container", DRAFT_WEEKS);
  });

  it("blocks a switch in the middle of three containers", () => {
    blockCases += 1;
    const run = runFiles(cleanDoc("revision", 3), withContainers("service", [cleanContainer(), switchContainer(DRAFT_WEEKS), cleanContainer()]));
    expectBlocked(run, "switch in the middle container", DRAFT_WEEKS);
  });

  it("blocks a switch in the second of two containers with a duplicate name", () => {
    blockCases += 1;
    const service = withContainers("service", [
      { ...cleanContainer(), name: "app" },
      { ...switchContainer(), name: "app" },
    ]);
    const run = runFiles(cleanDoc("revision", 1), service);
    expectBlocked(run, "duplicate container name with a switch", TEACHER_ROUTES);
  });

  it("blocks a switch beside an empty object container", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [{}]), withContainers("service", [{}, switchContainer()]));
    expectBlocked(run, "switch beside an empty object container", TEACHER_ROUTES);
  });

  it("blocks a switch after an empty env list", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [{ env: [] }, switchContainer(DRAFT_WEEKS)]), withContainers("service", [{ env: [] }, cleanContainer()]));
    expectBlocked(run, "switch after an empty env list", DRAFT_WEEKS);
  });

  it("blocks a switch in the last container of a huge containers list", () => {
    blockCases += 1;
    const clean = Array.from({ length: 2000 }, () => cleanContainer());
    const service = [...clean, switchContainer(TEACHER_ROUTES)];
    const run = runFiles(withContainers("revision", clean), withContainers("service", service));
    expectBlocked(run, "switch in the last of 2001 containers", TEACHER_ROUTES);
  });

  it("blocks a switch supplied through valueFrom in the second container", () => {
    blockCases += 1;
    const entry = { name: TEACHER_ROUTES, valueFrom: { secretKeyRef: { name: SECRET, key: SECRET } } };
    const run = runFiles(cleanDoc("revision", 1), withContainers("service", [cleanContainer(), { env: [entry] }]));
    expectBlocked(run, "valueFrom switch in the second container", TEACHER_ROUTES);
  });

  it("blocks a switch that sits beside an envFrom reference", () => {
    blockCases += 1;
    const container = { envFrom: [{ secretRef: { name: SECRET } }], env: [{ name: DRAFT_WEEKS, value: SECRET }] };
    const run = runFiles(withContainers("revision", [{ envFrom: [{ secretRef: { name: SECRET } }] }]), withContainers("service", [container]));
    expectBlocked(run, "switch beside an envFrom reference", DRAFT_WEEKS);
  });
});

/* ------------------------------------------------------------------ */
/* Mixed validity fails closed.                                      */
/* ------------------------------------------------------------------ */

describe("P6 r2: mixed validity fails closed on the second container", () => {
  it("fails closed when the service's second container has env not a list", () => {
    blockCases += 1;
    const run = runFiles(cleanDoc("revision", 2), withContainers("service", [cleanContainer(), { env: "NODE_ENV" }]));
    expectStructureFailure(run, "service second container env is a string");
  });

  it("fails closed when the revision's second container has env null", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [cleanContainer(), { env: null }]), cleanDoc("service", 2));
    expectStructureFailure(run, "revision second container env is null");
  });

  it("fails closed when the service's second container is null", () => {
    blockCases += 1;
    const run = runFiles(cleanDoc("revision", 2), withContainers("service", [cleanContainer(), null]));
    expectStructureFailure(run, "service second container is null");
  });

  it("fails closed when the revision's second container is an array", () => {
    blockCases += 1;
    const run = runFiles(withContainers("revision", [cleanContainer(), []]), cleanDoc("service", 2));
    expectStructureFailure(run, "revision second container is an array");
  });
});

/* ------------------------------------------------------------------ */
/* The live form reads every container too.                          */
/* ------------------------------------------------------------------ */

describe("P6 r2: the live form (stand-in gcloud) reads every container", () => {
  it("blocks a switch in the third container of the target revision", () => {
    blockCases += 1;
    const run = runWithFakeGcloud(
      withContainers("revision", [cleanContainer(), cleanContainer(), switchContainer(TEACHER_ROUTES)]),
      cleanDoc("service", 3),
    );
    expectBlocked(run, "live form switch in the third revision container", TEACHER_ROUTES);
  });

  it("passes clean two-container documents", () => {
    cleanControls += 1;
    const run = runWithFakeGcloud(cleanDoc("revision", 2), cleanDoc("service", 2));
    expectClean(run, "live form clean two-container documents");
  });
});

/* ------------------------------------------------------------------ */
/* Known weakness: a leading-dash revision value reaches gcloud.      */
/* ------------------------------------------------------------------ */

describe("P6 r2: the --revision value parsing (known weakness, it.fails)", () => {
  it.fails(
    "a --revision value that starts with '-' is a usage error, not a gcloud call (today it calls gcloud)",
    () => {
      const folder = tempFolder();
      const marker = join(folder, "gcloud-called");
      const script = join(folder, "gcloud");
      writeFileSync(script, `#!/bin/sh\n: > "${marker}"\nexit 2\n`);
      chmodSync(script, 0o755);
      runCli(["--revision", "--service-json"], { ...process.env, PATH: `${folder}:${process.env.PATH ?? ""}` });
      expect(
        existsSync(marker),
        "the guard must reject a leading-dash value as a usage error, not hand it to gcloud",
      ).toBe(false);
    },
  );
});

/* ------------------------------------------------------------------ */
/* The labeled counts (A3, A4).                                       */
/* ------------------------------------------------------------------ */

describe("P6 r2: the labeled counts", () => {
  it("labels the multi-container counts with floors", () => {
    console.log(`multi_container_block_cases=${blockCases}`);
    console.log(`multi_container_blocked=${blocked}`);
    console.log(`multi_container_clean_controls=${cleanControls}`);
    expect(blockCases, "multi_container_block_cases floor 15").toBeGreaterThanOrEqual(15);
    expect(blocked, "multi_container_blocked equals multi_container_block_cases").toBe(blockCases);
    expect(cleanControls, "multi_container_clean_controls floor 5").toBeGreaterThanOrEqual(5);
  });
});
