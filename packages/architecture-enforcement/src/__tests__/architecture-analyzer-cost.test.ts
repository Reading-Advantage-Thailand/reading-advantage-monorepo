import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import ts from "typescript";
import { analyzeArchitectureSources } from "../analyzer.js";
import { mainArchitectureCheckCli } from "../architecture-check-cli.js";
import { runArchitecturePinRefreshCli } from "../architecture-pin-refresh-cli.js";
import {
  computeAnalyzerImplementationTreeSha256V2Sync,
  computeReconciliationImplementationTreeSha256V2Sync,
} from "../reconciliation-manifest.js";
import { selectArchitecturePolicy } from "../policy-selection.js";
import {
  computeAnalyzerInputSnapshotSha256Sync,
  computeAnalyzerReportSha256,
  selectV2AnalyzerSourcePaths,
  validateAnalyzerReconciliationManifestV2Sync,
} from "../v2-manifest-validation.js";
import type { WorkspaceModuleTargets } from "../workspace-resolution.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const PIN_ERROR = "Analyzer input snapshot hash does not match current bytes";
const REPORT_ERROR =
  "Analyzer report hashes do not match current byte-identical reports";
const WRONG_HASH = "0123456789abcdef".repeat(4);
const FIXTURE_TIMEOUT_MS = 120_000;
const HOOK_TIMEOUT_MS = 300_000;

const WALK_MANY_PATH = "apps/walk/src/many.ts";
const WALK_CONTROL50_PATH = "apps/walk/src/control50.ts";
const WALK_GROWTH10_PATH = "apps/walk/src/growth10.ts";
const WALK_CONTROL10_PATH = "apps/walk/src/control10.ts";
const WALK_BINDINGS_PATH = "apps/walk/src/bindings.ts";
const WALK_SCHEMA_PATH = "apps/walk/src/schema.ts";
const WALK_SOURCE_PATHS = [
  WALK_BINDINGS_PATH,
  WALK_CONTROL10_PATH,
  WALK_CONTROL50_PATH,
  WALK_GROWTH10_PATH,
  WALK_MANY_PATH,
  WALK_SCHEMA_PATH,
];

/** Counting seams shared by the mock wrappers. */
const seams = vi.hoisted(() => ({
  analyzerCalls: 0,
  archiveCalls: 0,
  walkCounts: new Map<string, number>(),
}));

/** Source paths whose whole-file walks the TypeScript wrapper counts. */
const walkTargets = vi.hoisted(() => new Set<string>());

vi.mock("typescript", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("typescript")>();
  const realTs =
    (
      actual as { default?: typeof import("typescript") }
    ).default ?? (actual as typeof import("typescript"));
  const realForEachChild = realTs.forEachChild;
  function wrappedForEachChild(...args: unknown[]): unknown {
    const node = args[0] as
      | { kind?: number; fileName?: string }
      | undefined;
    if (
      node &&
      typeof node === "object" &&
      node.kind === realTs.SyntaxKind.SourceFile &&
      typeof node.fileName === "string" &&
      walkTargets.has(node.fileName)
    ) {
      seams.walkCounts.set(
        node.fileName,
        (seams.walkCounts.get(node.fileName) ?? 0) + 1,
      );
    }
    return (realForEachChild as unknown as (...callArgs: unknown[]) => unknown)(
      ...args,
    );
  }
  const wrapNamespace = (target: unknown): unknown =>
    new Proxy(target as object, {
      get: (object, property, receiver) =>
        property === "forEachChild"
          ? wrappedForEachChild
          : Reflect.get(object, property, receiver),
    });
  return new Proxy(actual as object, {
    get: (object, property, receiver) => {
      if (property === "default") return wrapNamespace(realTs);
      if (property === "forEachChild") return wrappedForEachChild;
      return Reflect.get(object, property, receiver);
    },
  }) as typeof import("typescript");
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("node:child_process")>();
  const realExecFileSync = actual.execFileSync;
  function wrappedExecFileSync(...args: unknown[]): unknown {
    const command = args[0];
    const commandArgs = args[1];
    if (
      command === "git" &&
      Array.isArray(commandArgs) &&
      commandArgs[0] === "archive"
    ) {
      seams.archiveCalls += 1;
    }
    return (realExecFileSync as unknown as (...callArgs: unknown[]) => unknown)(
      ...args,
    );
  }
  return { ...actual, execFileSync: wrappedExecFileSync };
});

vi.mock("../analyzer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analyzer.js")>();
  return {
    ...actual,
    analyzeArchitectureSources: (
      ...args: Parameters<typeof actual.analyzeArchitectureSources>
    ) => {
      seams.analyzerCalls += 1;
      return actual.analyzeArchitectureSources(...args);
    },
  };
});

const temporaryRoots: string[] = [];

/** One temporary fixture repository and its committed manifest. */
interface Fixture {
  root: string;
  manifest: Record<string, unknown>;
}

/** Serializes JSON data with stable object-key ordering for manifest subjects. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Recomputes the review subject over the protected manifest fields. */
function computeReviewSubject(manifest: Record<string, unknown>): string {
  const {
    reviews: _reviews,
    acceptance: _acceptance,
    reviewSubjectSha256: _reviewSubjectSha256,
    ...protectedFields
  } = manifest;
  return createReviewHash(canonicalJson(protectedFields));
}

/** Hashes the canonical review subject bytes. */
function createReviewHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Runs one Git command inside a fixture repository. */
function runGit(root: string, args: readonly string[]): void {
  execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Commits the staged fixture files with a fixed author. */
function commitFixture(root: string, message: string): void {
  runGit(root, [
    "-c",
    "user.email=architecture@example.com",
    "-c",
    "user.name=Architecture Tests",
    "commit",
    "--quiet",
    "-m",
    message,
  ]);
}

/** Reads and parses the committed v2 manifest of a fixture repository. */
async function readManifest(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(resolve(root, V2_MANIFEST_PATH), "utf8"),
  ) as Record<string, unknown>;
}

/** Writes the canonical pretty manifest bytes with one trailing newline. */
async function writeManifest(
  root: string,
  manifest: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    resolve(root, V2_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

/** Creates the base refresh fixture with a valid committed manifest. */
async function createBaseFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "architecture-cost-base-"));
  temporaryRoots.push(root);
  await cp(
    resolve(packageRoot, "src"),
    resolve(root, "packages/architecture-enforcement/src"),
    { recursive: true },
  );
  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify({ name: "architecture-cost-fixture", private: true }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(root, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - packages/*\n",
    "utf8",
  );
  await mkdir(resolve(root, "apps/example/src"), { recursive: true });
  await writeFile(
    resolve(root, "apps/example/src/clean.ts"),
    "export const clean = true;\n",
    "utf8",
  );
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["add", "--", "package.json", "pnpm-workspace.yaml", "packages", "apps"]);
  commitFixture(root, "fixture base");
  const manifest = await readManifest(root);
  const reportHash = await computeAnalyzerReportSha256(root);
  const refreshed: Record<string, unknown> = {
    ...manifest,
    analyzerImplementationTreeSha256:
      computeAnalyzerImplementationTreeSha256V2Sync(root),
    implementationAndTestTreeSha256:
      computeReconciliationImplementationTreeSha256V2Sync(root),
    analyzerInputSnapshotSha256: computeAnalyzerInputSnapshotSha256Sync(
      root,
      selectV2AnalyzerSourcePaths(root),
    ),
    reportSha256s: [reportHash, reportHash],
  };
  refreshed.reviewSubjectSha256 = computeReviewSubject(refreshed);
  await writeManifest(root, refreshed);
  runGit(root, ["add", "--", V2_MANIFEST_PATH]);
  commitFixture(root, "fixture pins");
  return { root, manifest: refreshed };
}

/** Copies one fixture repository into a new temporary repository. */
async function cloneFixture(sourceRoot: string, name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `architecture-cost-${name}-`));
  temporaryRoots.push(root);
  await cp(sourceRoot, root, { recursive: true });
  return root;
}

/** Breaks one manifest value and rebinds the review subject. */
async function patchManifest(
  root: string,
  patch: (manifest: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  const manifest = await readManifest(root);
  patch(manifest);
  manifest.reviewSubjectSha256 = computeReviewSubject(manifest);
  await writeManifest(root, manifest);
  runGit(root, ["add", "--", V2_MANIFEST_PATH]);
  commitFixture(root, "fixture patch");
  return manifest;
}

/** Adds one tracked file to a fixture repository and commits it. */
async function addFixtureFile(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), content, "utf8");
  runGit(root, ["add", "--", path]);
  commitFixture(root, "fixture file");
}

/** Builds one fixture source with member-access call arguments. */
function memberAccessFixtureSource(memberAccessNodes: number): string {
  const lines = ['const db = require("./db");'];
  for (let index = 0; index < memberAccessNodes; index += 1) {
    lines.push("new Client(db.users);");
  }
  return `${lines.join("\n")}\n`;
}

/** Builds one control fixture source with string-literal call arguments. */
function stringArgumentFixtureSource(statements: number): string {
  const lines: string[] = [];
  for (let index = 0; index < statements; index += 1) {
    lines.push('new Client("users");');
  }
  return `${lines.join("\n")}\n`;
}

const BINDINGS_SOURCE = [
  'const schemaRequire = require("./schema");',
  'const schemaAwait = await import("./schema");',
  "new Client(schemaRequire.reviewJobs);",
  "new Client(schemaAwait.reviewJobs);",
  "new Client(missingBinding.reviewJobs);",
  'const schemaTwice = require("./schema");',
  'const schemaTwice = require("./db2");',
  "new Client(schemaTwice.reviewJobs);",
  "",
].join("\n");

const SCHEMA_SOURCE = [
  'import * as pg from "drizzle-orm/pg-core";',
  'export const reviewJobs = pg.pgTable("review_jobs", {});',
  "",
].join("\n");

/** Creates the small walk-fixture repository with one git commit. */
async function createWalkFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "architecture-cost-walk-"));
  temporaryRoots.push(root);
  const files: Record<string, string> = {
    [WALK_MANY_PATH]: memberAccessFixtureSource(50),
    [WALK_CONTROL50_PATH]: stringArgumentFixtureSource(50),
    [WALK_GROWTH10_PATH]: memberAccessFixtureSource(10),
    [WALK_CONTROL10_PATH]: stringArgumentFixtureSource(10),
    [WALK_BINDINGS_PATH]: BINDINGS_SOURCE,
    [WALK_SCHEMA_PATH]: SCHEMA_SOURCE,
    "apps/walk/src/db.ts": "export const placeholder = true;\n",
    "apps/walk/src/db2.ts": "export const placeholder = true;\n",
  };
  for (const [path, content] of Object.entries(files)) {
    const destination = resolve(root, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["add", "."]);
  commitFixture(root, "walk fixture");
  return root;
}

/** Counts property-access nodes in fixture text with the TypeScript API. */
function countMemberAccessNodes(source: string): number {
  const sourceFile = ts.createSourceFile(
    "virtual-member-access-count.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  let memberAccessNodes = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) memberAccessNodes += 1;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return memberAccessNodes;
}

describe("architecture analyzer refresh cost", () => {
  let base: Fixture;
  let staleManifest: Record<string, unknown>;
  let acknowledgedRoot = "";
  let previewRoot = "";
  let ac8bRoot = "";
  let manifestKeysBefore: string[] = [];
  let writtenManifest: Record<string, unknown> = {};
  let manifestFieldsChanged = 0;
  let memberAccessNodes = 0;
  let walksMany = 0;
  let walksControl50 = 0;
  let walksGrowth10 = 0;
  let walksControl10 = 0;
  let refreshExitCode = 0;
  let refreshProjections = 0;
  let refreshAnalyzerPasses = 0;
  let previewExitCode = 0;
  let previewProjections = 0;
  let previewAnalyzerPasses = 0;
  let previewBytesUnchanged = false;
  let bindingResources: string[] = [];

  beforeAll(async () => {
    base = await createBaseFixture();

    const staleRoot = await cloneFixture(base.root, "stale");
    staleManifest = await patchManifest(staleRoot, (manifest) => {
      manifest.analyzerInputSnapshotSha256 = WRONG_HASH;
    });
    previewRoot = await cloneFixture(staleRoot, "preview");
    acknowledgedRoot = await cloneFixture(staleRoot, "acknowledged");

    const walkRoot = await createWalkFixture();
    for (const path of [
      WALK_MANY_PATH,
      WALK_CONTROL50_PATH,
      WALK_GROWTH10_PATH,
      WALK_CONTROL10_PATH,
    ]) {
      walkTargets.add(path);
    }

    const manySource = memberAccessFixtureSource(50);
    memberAccessNodes = countMemberAccessNodes(manySource);

    seams.analyzerCalls = 0;
    seams.archiveCalls = 0;
    seams.walkCounts.clear();

    const policy = selectArchitecturePolicy("v2", repositoryRoot, {
      validateCurrentState: false,
    });
    const analysis = await analyzeArchitectureSources({
      repoRoot: walkRoot,
      sourcePaths: WALK_SOURCE_PATHS,
      workspaceTargets: new Map<string, string>() as WorkspaceModuleTargets,
      trackedSourceOnly: true,
      config: policy.config,
      policyVersion: "v2",
    });
    expect(analysis.parseErrors).toEqual([]);
    walksMany = seams.walkCounts.get(WALK_MANY_PATH) ?? 0;
    walksControl50 = seams.walkCounts.get(WALK_CONTROL50_PATH) ?? 0;
    walksGrowth10 = seams.walkCounts.get(WALK_GROWTH10_PATH) ?? 0;
    walksControl10 = seams.walkCounts.get(WALK_CONTROL10_PATH) ?? 0;
    bindingResources = analysis.findings
      .filter(
        (finding) =>
          finding.sourcePath === WALK_BINDINGS_PATH &&
          finding.evidenceKind === "client-construction",
      )
      .map((finding) => finding.resource ?? "")
      .sort();

    const analyzerCallsBeforeRefresh = seams.analyzerCalls;
    const archiveCallsBeforeRefresh = seams.archiveCalls;
    refreshExitCode = await runArchitecturePinRefreshCli(
      ["--acknowledge"],
      acknowledgedRoot,
      { discoverRepositoryRoot: () => acknowledgedRoot },
    );
    refreshAnalyzerPasses = seams.analyzerCalls - analyzerCallsBeforeRefresh;
    refreshProjections = seams.archiveCalls - archiveCallsBeforeRefresh;
    writtenManifest = await readManifest(acknowledgedRoot);
    manifestKeysBefore = Object.keys(staleManifest);
    manifestFieldsChanged = manifestKeysBefore.filter(
      (key) =>
        JSON.stringify(staleManifest[key]) !==
        JSON.stringify(writtenManifest[key]),
    ).length;

    const previewBytesBefore = await readFile(
      resolve(previewRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    const analyzerCallsBeforePreview = seams.analyzerCalls;
    const archiveCallsBeforePreview = seams.archiveCalls;
    previewExitCode = await runArchitecturePinRefreshCli([], previewRoot, {
      discoverRepositoryRoot: () => previewRoot,
    });
    previewAnalyzerPasses = seams.analyzerCalls - analyzerCallsBeforePreview;
    previewProjections = seams.archiveCalls - archiveCallsBeforePreview;
    previewBytesUnchanged =
      previewBytesBefore ===
      (await readFile(resolve(previewRoot, V2_MANIFEST_PATH), "utf8"));

    ac8bRoot = await cloneFixture(acknowledgedRoot, "ac8b-new-file");
    await addFixtureFile(
      ac8bRoot,
      "apps/example/src/added.ts",
      "export const added = true;\n",
    );
  }, HOOK_TIMEOUT_MS);

  afterAll(async () => {
    for (const root of temporaryRoots) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it(
    "cost_fixture_positive_control",
    async () => {
      const controlRootWalks = walksMany;
      const controlArchiveCalls = refreshProjections;
      const controlAnalyzerCalls = refreshAnalyzerPasses;
      const structural = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: base.root,
        manifest: base.manifest,
      });
      expect(structural.valid).toBe(true);
      expect(
        controlRootWalks,
        `root_walks=${controlRootWalks}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        controlArchiveCalls,
        `git_archive_calls=${controlArchiveCalls}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        controlAnalyzerCalls,
        `analyzer_calls=${controlAnalyzerCalls}`,
      ).toBeGreaterThanOrEqual(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac6_walks_per_module_is_one",
    () => {
      const walksPerModule = walksMany - walksControl50;
      expect(
        memberAccessNodes,
        `member_access_nodes=${memberAccessNodes}`,
      ).toBeGreaterThanOrEqual(50);
      expect(
        walksPerModule,
        `walks_per_module=${walksPerModule} member_access_nodes=${memberAccessNodes}`,
      ).toBeLessThanOrEqual(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac6_walk_count_does_not_grow_with_member_access_nodes",
    () => {
      const walksPerModule = walksMany - walksControl50;
      const walksTenModule = walksGrowth10 - walksControl10;
      const walkGrowth = walksPerModule - walksTenModule;
      expect(
        walkGrowth,
        `walk_growth=${walkGrowth} walks_per_module=${walksPerModule}`,
      ).toBe(0);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac6b_binding_resolution_unchanged",
    () => {
      const expectedResources = [
        "database-table:review_jobs",
        "database-table:review_jobs",
        "database-table:review_jobs",
      ].sort();
      expect(bindingResources).toEqual(expectedResources);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac7_refresh_makes_one_projection_and_two_passes",
    () => {
      expect(refreshExitCode).toBe(0);
      expect(
        refreshProjections,
        `projections=${refreshProjections}`,
      ).toBe(1);
      expect(
        refreshAnalyzerPasses,
        `analyzer_passes=${refreshAnalyzerPasses}`,
      ).toBe(2);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac7b_preview_run_makes_one_projection_and_two_passes",
    () => {
      expect(previewExitCode).toBe(1);
      expect(previewBytesUnchanged).toBe(true);
      expect(
        previewProjections,
        `projections=${previewProjections}`,
      ).toBe(1);
      expect(
        previewAnalyzerPasses,
        `analyzer_passes=${previewAnalyzerPasses}`,
      ).toBe(2);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac8_manifest_key_set_unchanged_after_refresh",
    async () => {
      const manifestKeysAfter = Object.keys(writtenManifest);
      const manifestKeysAdded = manifestKeysAfter.filter(
        (key) => !manifestKeysBefore.includes(key),
      );
      expect(manifestKeysAfter).toEqual(manifestKeysBefore);
      expect(
        manifestFieldsChanged,
        `manifest_fields_changed=${manifestFieldsChanged}`,
      ).toBeLessThanOrEqual(5);
      expect(manifestKeysAdded, `manifest_keys_added=${manifestKeysAdded.length}`).toEqual([]);
      const strictValid = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: acknowledgedRoot,
        manifest: writtenManifest,
      });
      expect(strictValid.valid).toBe(true);
      const extraKeyValid = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: acknowledgedRoot,
        manifest: { ...writtenManifest, extraCostField: "control" },
      });
      expect(extraKeyValid.valid).toBe(false);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac8b_new_analyzed_file_still_fails",
    async () => {
      const errors: string[] = [];
      const exitCode = await mainArchitectureCheckCli(
        ["--skip-input-snapshot-pin", "--repo-root", ac8bRoot],
        ac8bRoot,
        {
          writeStdout: () => {},
          writeStderr: (output) => errors.push(output),
        },
      );
      expect(exitCode).not.toBe(0);
      const output = errors.join("");
      expect(output).toContain(REPORT_ERROR);
      expect(output).not.toContain(PIN_ERROR);
    },
    FIXTURE_TIMEOUT_MS,
  );
});
