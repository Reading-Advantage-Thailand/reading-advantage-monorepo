import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateAnalyzerReconciliationManifestV2Sync } from "../v2-manifest-validation.js";
import {
  applyArchitectureReconciliation,
  previewArchitectureReconciliation,
  type ApplyArchitectureReconciliationOptions,
  type ArchitectureReconciliationPreview,
  type ArchitectureReconciliationSummary,
  type PreviewArchitectureReconciliationOptions,
} from "../architecture-reconciliation.js";
import {
  parseArchitectureReconciliationArguments,
  runArchitectureReconciliationCli,
  type ArchitectureReconciliationCliDependencies,
} from "../architecture-reconciliation-cli.js";
import { compareStableStrings } from "../stable-order.js";

// Task 1.4 refreshed the committed pin against an earlier tree, and master
// has moved since. The async manifest validator therefore reports a stale
// input snapshot before the four-file staging runs. That pin contract is
// covered by architecture-ci-input-pin.test.ts. Stub only the async
// validator so this file reaches the staging logic; the sync validator
// used by the delta cases below stays real.
vi.mock("../v2-manifest-validation.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../v2-manifest-validation.js")>();
  const stub = {
    ...actual,
    validateAnalyzerReconciliationManifestV2: vi.fn(async () => ({
      valid: true,
    })),
  };
  // The post-state helper does not exist at the Red base. Expose it as a
  // getter over the real module so the overlay case fails on a missing
  // function, and so the ported Green export becomes visible without an
  // edit to this mock.
  Object.defineProperty(stub, "computeAnalyzerInputSnapshotWithOverlay", {
    enumerable: true,
    configurable: true,
    get: () =>
      (actual as Record<string, unknown>).computeAnalyzerInputSnapshotWithOverlay,
  });
  return stub;
});

/**
 * Red tests for task 1.4d, option 1 (the v2 route).
 *
 * The orchestrator routes task 1.4d on option 1, with
 * "default taken, no PM answer in 20 min". Default (1): CI runs the
 * boundary check under `--policy v2`, as in commit 220e5886d. Default (2):
 * the v2 debt counts may differ from the v1 counts recorded in the r11
 * debt preview: `additions=339`, `removals=15`, `renames=162`.
 *
 * Source: branch `chore/ci-green`, code commits oldest first 41e320d9d
 * (v2 four-file reconcile route), 3aff7f243 (reviewed candidate writes),
 * 7ca865ae8 (post-state input snapshot pin), c6e3e4462 (committed-state
 * test alignment), and 220e5886d (CI under policy v2). Only test hunks
 * were reused here; no production hunk was copied.
 *
 * Each `it` fails at HEAD for the stated reason. Cases named `guard`
 * pass at HEAD and stop an over-broad rule.
 */

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const V1_FILES = [
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
  "packages/architecture-enforcement/src/config/baselines/database.v1.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
] as const;
const V2_MANIFEST =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const V2_OWNERSHIP =
  "packages/architecture-enforcement/src/config/ownership-map.v2.json";
const V2_DATABASE =
  "packages/architecture-enforcement/src/config/baselines/database.v2.json";
const V2_PROVIDER =
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json";

const PLAN_HASH = "a".repeat(64);
const REVIEW_OWNER = "monorepo-architecture";
const REVIEW_RATIONALE =
  "Reviewed re-baseline of the ci green track of 2026-11-15.";
// The preview runs the real analyzer over every tracked source file of the
// repository. Measured cost: 36.7 s alone with one worker on the 4-core dev
// machine, and 274.9 s on the 4-core CI runner while the other package test
// tasks run beside it. A 600 s budget keeps a 2.2x margin over the slowest
// measured run. The work itself cannot shrink without staging a different
// repository state, which is the contract under test.
const PREVIEW_TIMEOUT_MS = 600_000;

const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
  );
});

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Canonical JSON with the production key order. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort(compareStableStrings)
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
    reviewSubjectSha256: _subject,
    ...protectedFields
  } = manifest;
  return sha256(canonicalJson(protectedFields));
}

interface BaselineFile {
  schemaVersion: number;
  domain: string;
  rulesetHash: string;
  entries: Record<string, unknown>[];
}

/** Copies the committed v1 and v2 family into one temporary repository root. */
async function createFamilyFixture(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "architecture-v2-route-"));
  fixtureRoots.push(repoRoot);
  for (const path of [
    ...V1_FILES,
    V2_MANIFEST,
    V2_OWNERSHIP,
    V2_DATABASE,
    V2_PROVIDER,
  ]) {
    const target = resolve(repoRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(resolve(REPO_ROOT, path), "utf8"));
  }
  return repoRoot;
}

/** Rewrites one v2 baseline file and rebinds the manifest hashes to it. */
async function writeDatabase(
  repoRoot: string,
  mutate: (baseline: BaselineFile) => BaselineFile,
): Promise<void> {
  const databasePath = resolve(repoRoot, V2_DATABASE);
  const baseline = JSON.parse(await readFile(databasePath, "utf8"));
  const updated = mutate(baseline as BaselineFile);
  const serialized = `${JSON.stringify(updated, null, 2)}\n`;
  await writeFile(databasePath, serialized, "utf8");
  const manifestPath = resolve(repoRoot, V2_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  const artifacts = manifest.v2Artifacts as { path: string; sha256: string }[];
  manifest.v2Artifacts = artifacts.map((reference) =>
    reference.path === V2_DATABASE
      ? { ...reference, sha256: sha256(serialized) }
      : reference,
  );
  manifest.reviewSubjectSha256 = computeReviewSubject(manifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Stages one delta in the manifest and rebinds the review subject. */
async function writeDelta(
  repoRoot: string,
  mutate: (manifest: Record<string, unknown>) => void,
): Promise<void> {
  const manifestPath = resolve(repoRoot, V2_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  mutate(manifest);
  manifest.reviewSubjectSha256 = computeReviewSubject(manifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function validate(
  repoRoot: string,
): Promise<{ valid: boolean; errors?: readonly string[] }> {
  const manifest = JSON.parse(
    await readFile(resolve(repoRoot, V2_MANIFEST), "utf8"),
  ) as Record<string, unknown>;
  return validateAnalyzerReconciliationManifestV2Sync({ repoRoot, manifest });
}

/** One synthetic database entry that no committed entry can collide with. */
function syntheticEntry(keyCharacter: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: `apps/delta-fixture/${keyCharacter}.ts`,
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    resolvedTarget: "packages/db/src/index.ts",
    semanticKey: keyCharacter.repeat(64),
    instanceKey: `d${keyCharacter.repeat(63)}`,
    owner: "pm-orchestrator",
    rationale: "Reviewed delta fixture entry for the v2 baseline repair.",
  };
}

/** Extracts one workflow step block by its exact step name. */
function extractWorkflowStep(workflow: string, name: string): string {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line.includes(`name: ${name}`));
  if (start < 0) throw new Error(`workflow step not found: ${name}`);
  const end = lines.findIndex(
    (line, index) => index > start && /^\s+- name: /.test(line),
  );
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

/** Creates a secret-safe summary fixture for command tests. */
function summaryFixture(): ArchitectureReconciliationSummary {
  return {
    schemaVersion: 1,
    reconciliationPlanHash: PLAN_HASH,
    manifestHash: "b".repeat(64),
    transactionPlanHash: "c".repeat(64),
    analyzerImplementationTreeHash: "d".repeat(64),
    reconciliationImplementationTreeHash: "f".repeat(64),
    architectureInputSnapshotHash: "e".repeat(64),
    beforeFileHashes: {
      ownershipMap: "1".repeat(64),
      databaseBaseline: "2".repeat(64),
      providerBaseline: "3".repeat(64),
    },
    proposedFileHashes: {
      ownershipMap: "4".repeat(64),
      databaseBaseline: "5".repeat(64),
      providerBaseline: "6".repeat(64),
    },
    rulesetHashes: { database: "7".repeat(64), provider: "8".repeat(64) },
    exactExceptionPairs: [
      { ruleId: "AI_PROVIDER_BOUNDARY", sourcePath: "packages/ai/src/x.ts" },
    ],
    counts: {
      databaseEntries: 467,
      providerEntries: 93,
      productionAdditions: 69,
      exactExceptionAdditions: 9,
      coveredTestFindings: 54,
      removals: 0,
      renames: 0,
    },
  };
}

/** Creates an exact candidate v2 preview fixture without repository bytes. */
function candidatePreviewFixture(): ArchitectureReconciliationPreview {
  const summary = summaryFixture();
  return {
    schemaVersion: 1,
    reconciliationPlanHash: PLAN_HASH,
    manifestHash: summary.manifestHash,
    analyzerImplementationTreeHash: summary.analyzerImplementationTreeHash,
    reconciliationImplementationTreeHash:
      summary.reconciliationImplementationTreeHash,
    architectureInputSnapshotHash: summary.architectureInputSnapshotHash,
    transactionPlan: {
      schemaVersion: 1,
      repoRoot: "/repo",
      replacements: [],
      planHash: summary.transactionPlanHash,
    },
    summary,
    policyVersion: "v2",
    policyStatus: "candidate",
  };
}

/** Creates injected command boundaries and captured output. */
function commandDependencies() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const preview = candidatePreviewFixture();
  const values: ArchitectureReconciliationCliDependencies = {
    apply: vi.fn(async () => ({
      summary: preview.summary,
      transactionOutcome: {
        state: "committed" as const,
        planHash: preview.transactionPlan.planHash,
      },
    })),
    discoverRepositoryRoot: vi.fn(() => "/repo"),
    preview: vi.fn(async () => preview),
    writeStderr: (value) => stderr.push(value),
    writeStdout: (value) => stdout.push(value),
  };
  return { preview, stderr, stdout, values };
}

describe("v2 four-file reconcile route (41e320d9d)", () => {
  it("route_fixture_positive_control (guard, passes at HEAD)", async () => {
    const repoRoot = await createFamilyFixture();
    const result = await validate(repoRoot);
    expect(result, "fixture manifest must validate before any mutation").toEqual(
      { valid: true },
    );
  });

  it("delta_staged_addition_validates", async () => {
    const repoRoot = await createFamilyFixture();
    const entry = syntheticEntry("a");
    await writeDatabase(repoRoot, (baseline) => ({
      ...baseline,
      entries: [...baseline.entries, entry].sort((left, right) =>
        String(left.instanceKey).localeCompare(String(right.instanceKey)),
      ),
    }));
    await writeDelta(repoRoot, (manifest) => {
      manifest.baselineAdditions = [
        ...(manifest.baselineAdditions as unknown[]),
        entry,
      ];
    });
    const result = await validate(repoRoot);
    expect(
      result,
      `staged addition must validate: additions=1 errors=${JSON.stringify(result.errors ?? [])}`,
    ).toEqual({ valid: true });
  });

  it("delta_staged_removal_of_v1_survivor_validates", async () => {
    const repoRoot = await createFamilyFixture();
    const v1Database = JSON.parse(
      await readFile(
        resolve(
          repoRoot,
          "packages/architecture-enforcement/src/config/baselines/database.v1.json",
        ),
        "utf8",
      ),
    ) as BaselineFile;
    const database = JSON.parse(
      await readFile(resolve(repoRoot, V2_DATABASE), "utf8"),
    ) as BaselineFile;
    const currentKeys = new Set(
      database.entries.map((entry) => String(entry.instanceKey)),
    );
    const victim = v1Database.entries.find((entry) =>
      currentKeys.has(String(entry.instanceKey)),
    );
    expect(victim, "fixture needs one v1 survivor still present in v2").toBeDefined();
    await writeDatabase(repoRoot, (baseline) => ({
      ...baseline,
      entries: baseline.entries.filter(
        (entry) => entry.instanceKey !== victim?.instanceKey,
      ),
    }));
    await writeDelta(repoRoot, (manifest) => {
      manifest.baselineRemovals = [
        ...(manifest.baselineRemovals as unknown[]),
        String(victim?.instanceKey),
      ];
    });
    const result = await validate(repoRoot);
    expect(
      result,
      `staged removal must validate: removals=1 errors=${JSON.stringify(result.errors ?? [])}`,
    ).toEqual({ valid: true });
  });

  it("delta_unexplained_baseline_rejected", async () => {
    const repoRoot = await createFamilyFixture();
    const entry = syntheticEntry("b");
    await writeDatabase(repoRoot, (baseline) => ({
      ...baseline,
      entries: [...baseline.entries, entry].sort((left, right) =>
        String(left.instanceKey).localeCompare(String(right.instanceKey)),
      ),
    }));
    const result = await validate(repoRoot);
    expect(result.valid, "v2 baseline that the staged delta does not explain must fail").toBe(
      false,
    );
    expect(result.errors?.join(" ")).toContain(
      "does not match v1 plus the staged delta",
    );
  });

  it("delta_unstaged_addition_rejected (guard, passes at HEAD)", async () => {
    const repoRoot = await createFamilyFixture();
    await writeDelta(repoRoot, (manifest) => {
      manifest.baselineAdditions = [
        ...(manifest.baselineAdditions as unknown[]),
        syntheticEntry("c"),
      ];
    });
    const result = await validate(repoRoot);
    expect(result.valid, "staged addition that v2 does not hold must fail").toBe(false);
  });

  it("delta_malformed_record_rejected (guard, passes at HEAD)", async () => {
    const repoRoot = await createFamilyFixture();
    await writeDelta(repoRoot, (manifest) => {
      manifest.baselineAdditions = [{ instanceKey: "not-a-digest" }];
    });
    const result = await validate(repoRoot);
    expect(result.valid, "malformed staged record must fail").toBe(false);
  });

  it(
    "preview_stages_current_delta_and_rebinds_four_files",
    async () => {
      const options = {
        repoRoot: REPO_ROOT,
        policyVersion: "v2",
        newDebtMetadata: {
          owner: REVIEW_OWNER,
          rationale: REVIEW_RATIONALE,
        },
      } as unknown as PreviewArchitectureReconciliationOptions;
      const preview = await previewArchitectureReconciliation(options);
      expect(preview.policyVersion, "preview must run under policy v2").toBe("v2");
      const replacements = preview.transactionPlan.replacements;
      expect(replacements, `four-file plan needs replacements=4`).toHaveLength(4);
      const byId = new Map(
        replacements.map((replacement) => [replacement.id, replacement]),
      );
      const manifestReplacement = byId.get("reconciliation-manifest");
      const databaseReplacement = byId.get("database-baseline");
      const providerReplacement = byId.get("provider-baseline");
      const ownershipReplacement = byId.get("ownership-map");
      expect(manifestReplacement, "manifest replacement is staged").toBeDefined();
      expect(databaseReplacement, "database replacement is staged").toBeDefined();
      expect(providerReplacement, "provider replacement is staged").toBeDefined();
      expect(ownershipReplacement, "ownership replacement is staged").toBeDefined();

      const staged = JSON.parse(manifestReplacement!.contents) as Record<
        string,
        unknown
      >;
      const stagedAdditions = staged.baselineAdditions as unknown[];
      expect(
        Array.isArray(stagedAdditions),
        "staged manifest holds baselineAdditions",
      ).toBe(true);
      expect(
        stagedAdditions.length,
        `staged additions must be non-empty: additions=${stagedAdditions.length}`,
      ).toBeGreaterThan(0);
      expect(
        Array.isArray(staged.baselineRemovals),
        "staged manifest holds baselineRemovals",
      ).toBe(true);
      expect(
        Array.isArray(staged.baselineRenames),
        "staged manifest holds baselineRenames",
      ).toBe(true);
      expect(preview.summary.counts.productionAdditions).toBe(
        stagedAdditions.length,
      );

      const artifacts = staged.v2Artifacts as { path: string; sha256: string }[];
      expect(
        artifacts.find((entry) => entry.path.endsWith("database.v2.json"))?.sha256,
        "database artifact hash rebinds to the staged bytes",
      ).toBe(sha256(databaseReplacement!.contents));
      expect(
        artifacts.find((entry) => entry.path.endsWith("provider.v2.json"))?.sha256,
        "provider artifact hash rebinds to the staged bytes",
      ).toBe(sha256(providerReplacement!.contents));
      expect(
        staged.reviewSubjectSha256,
        "review subject rebinds to the staged manifest",
      ).toBe(computeReviewSubject(staged));

      const originalOwnership = await readFile(
        resolve(REPO_ROOT, V2_OWNERSHIP),
        "utf8",
      );
      expect(
        ownershipReplacement!.contents,
        "ownership map bytes stay unchanged inside the four-file plan",
      ).toBe(originalOwnership);
    },
    PREVIEW_TIMEOUT_MS,
  );
});

describe("reviewed candidate writes (3aff7f243)", () => {
  it("cli_accepts_owner_and_rationale", () => {
    const options = parseArchitectureReconciliationArguments(
      [
        "--acknowledge",
        "--expected-plan-hash",
        PLAN_HASH,
        "--owner",
        REVIEW_OWNER,
        "--rationale",
        REVIEW_RATIONALE,
        "--repo-root",
        "/repo",
      ],
      "/cwd",
      () => "/repo",
    );
    expect(options, "CLI must parse the reviewed write metadata").toMatchObject({
      acknowledge: true,
      expectedPlanHash: PLAN_HASH,
    });
    expect(options, "CLI must carry owner and rationale").toMatchObject({
      newDebtMetadata: { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
    });
  });

  it("cli_forwards_review_metadata_to_apply", async () => {
    const dependencies = commandDependencies();
    await runArchitectureReconciliationCli(
      [
        "--acknowledge",
        "--expected-plan-hash",
        PLAN_HASH,
        "--owner",
        REVIEW_OWNER,
        "--rationale",
        REVIEW_RATIONALE,
        "--format",
        "json",
        "--repo-root",
        "/repo",
      ],
      "/cwd",
      dependencies.values,
    );
    expect(
      dependencies.values.apply,
      "apply must receive the reviewed write metadata as its third argument",
    ).toHaveBeenCalledWith(
      expect.anything(),
      PLAN_HASH,
      { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
    );
  });

  it("apply_allows_reviewed_candidate_write", async () => {
    const preview = candidatePreviewFixture();
    const options = {
      preview,
      acknowledge: true,
      expectedReconciliationPlanHash: PLAN_HASH,
      newDebtMetadata: { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
    } as unknown as ApplyArchitectureReconciliationOptions;
    await expect(
      applyArchitectureReconciliation(options),
      "reviewed candidate write must pass the policy gate",
    ).rejects.not.toThrow(
      "Candidate v2 reconciliation cannot write before acceptance",
    );
  });
});

describe("post-state input snapshot pin (7ca865ae8)", () => {
  it("overlay_pins_snapshot_over_proposed_bytes", async () => {
    const validation = (await import(
      "../v2-manifest-validation.js"
    )) as Record<string, unknown>;
    const overlay = validation.computeAnalyzerInputSnapshotWithOverlay;
    expect(
      overlay,
      "computeAnalyzerInputSnapshotWithOverlay must exist",
    ).toBeTypeOf("function");
    const compute = overlay as (
      repoRoot: string,
      proposed: ReadonlyMap<string, string>,
    ) => Promise<string>;
    const emptyFirst = await compute(REPO_ROOT, new Map());
    const emptySecond = await compute(REPO_ROOT, new Map());
    expect(emptyFirst, "empty overlay is deterministic").toBe(emptySecond);
    const probe = "packages/architecture-enforcement/src/index.ts";
    const original = await readFile(resolve(REPO_ROOT, probe), "utf8");
    const changed = await compute(
      REPO_ROOT,
      new Map([[probe, `${original}\n// probe\n`]]),
    );
    expect(
      changed === emptyFirst,
      "overlay with proposed bytes must move the pin",
    ).toBe(false);
  });
});

describe("CI under policy v2 (220e5886d with c6e3e4462)", () => {
  it("ci_runs_check_under_policy_v2_with_skip", () => {
    const workflow = readFileSync(
      resolve(REPO_ROOT, ".github/workflows/ci.yml"),
      "utf8",
    );
    const step = extractWorkflowStep(workflow, "Architecture boundary check");
    const runLines = step
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("run:"));
    expect(
      runLines.length,
      `boundary step holds run lines: run_lines=${runLines.length}`,
    ).toBeGreaterThan(0);
    const runLine = runLines.join(" ");
    expect(runLine, "CI keeps the input snapshot skip").toContain(
      "--skip-input-snapshot-pin",
    );
    expect(runLine, "CI runs the boundary check under policy v2").toContain(
      "--policy v2",
    );
  });
});
