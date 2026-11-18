import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyArchitectureReconciliation,
  type ArchitectureReconciliationPreview,
  type ArchitectureReconciliationSummary,
} from "../architecture-reconciliation.js";
import {
  applyArchitectureReconciliationForPolicy,
  V2_RECONCILIATION_DESTINATION_PATHS,
} from "../policy-write-guard.js";
import {
  parseArchitectureReconciliationArguments,
} from "../architecture-reconciliation-cli.js";
import {
  parseArchitectureCheckArguments,
  runArchitectureCheckCli,
} from "../architecture-check-cli.js";
import {
  architectureCheckExitCode,
  checkArchitectureRepository,
  type CheckArchitectureRepositoryOptions,
} from "../architecture-check.js";
import { computeRulesetHash } from "../baseline.js";
import { createUpdatedArchitectureBaselines } from "../baseline-update.js";
import { selectArchitecturePolicy } from "../policy-selection.js";
import { parsePinRefreshArguments } from "../architecture-pin-refresh-cli.js";
import type { ApplyRepositoryFileTransactionOptions } from "../policy-update-transaction.js";
import type {
  ArchitectureBaseline,
  ArchitectureFinding,
} from "../contracts.js";

/**
 * Adversarial cases for the v2 CI route of Phase 1.
 *
 * Attack surfaces, from the routing brief:
 * (1) the review-record gate of applyArchitectureReconciliation;
 * (2) the ratchet: a new production finding must still fail under policy v2;
 * (3) the reconcile CLI input (owner, rationale, expected plan hash, budget);
 * (4) the CI step string of .github/workflows/ci.yml.
 *
 * Every case states its falsification condition in the assertion message.
 * No case reads a clock, a run artifact, or a track document.
 */

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const PLAN_HASH = "a".repeat(64);
const GATE_MESSAGE = "staged baseline delta without a review record";
const V2_MANIFEST_PATH = V2_RECONCILIATION_DESTINATION_PATHS[0];
const V2_OWNERSHIP_PATH = V2_RECONCILIATION_DESTINATION_PATHS[1];
const V2_DATABASE_PATH = V2_RECONCILIATION_DESTINATION_PATHS[2];
const V2_PROVIDER_PATH = V2_RECONCILIATION_DESTINATION_PATHS[3];
const REVIEW_OWNER = "monorepo-architecture";
const REVIEW_RATIONALE =
  "Reviewed adversarial fixture debt of the v2 route cases.";
const CHECK_TIMEOUT_MS = 120_000;

const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
  );
});

/** Creates a secret-safe summary fixture for the apply probes. */
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
    exactExceptionPairs: [],
    counts: {
      databaseEntries: 707,
      providerEntries: 93,
      productionAdditions: 255,
      exactExceptionAdditions: 1,
      coveredTestFindings: 0,
      removals: 15,
      renames: 162,
    },
  };
}

/** Creates one replacement record for a preview transaction plan. */
function replacementFixture(
  id: string,
  repositoryPath: string,
  contents: string,
): {
  id: string;
  repositoryPath: string;
  contents: string;
  destination: string;
  canonicalDestination: string;
  device: string;
  inode: string;
  beforeHash: string;
  afterHash: string;
} {
  return {
    id,
    repositoryPath,
    contents,
    destination: `/repo/${repositoryPath}`,
    canonicalDestination: `/repo/${repositoryPath}`,
    device: "fake-device",
    inode: `/repo/${repositoryPath}`,
    beforeHash: "9".repeat(64),
    afterHash: "8".repeat(64),
  };
}

/** Builds one staged v2 manifest with the requested review state. */
function stagedManifest(input: {
  reviews: unknown;
  status: string;
  additions: number;
  removals: number;
  renames: number;
}): string {
  return `${JSON.stringify(
    {
      schemaVersion: 2,
      reconciliationId: "backend-architecture-analyzer-v2",
      baselineAdditions: Array.from(
        { length: input.additions },
        () => ({ instanceKey: "a".repeat(64) }),
      ),
      baselineRemovals: Array.from(
        { length: input.removals },
        () => "b".repeat(64),
      ),
      baselineRenames: Array.from(
        { length: input.renames },
        () => ({ previousInstanceKey: "c".repeat(64) }),
      ),
      reviews: input.reviews,
      acceptance: { status: input.status },
    },
    null,
    2,
  )}\n`;
}

interface PreviewShape {
  manifestId: string;
  reviews: unknown;
  status: string;
  additions: number;
  removals: number;
  renames: number;
  policyVersion?: "v1" | "v2";
  manifestPath?: string;
}

/** Creates one preview whose plan stages the v2 manifest bytes. */
function previewFixture(shape: PreviewShape): ArchitectureReconciliationPreview {
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
      replacements: [
        replacementFixture(
          shape.manifestId,
          shape.manifestPath ?? V2_MANIFEST_PATH,
          stagedManifest({
            reviews: shape.reviews,
            status: shape.status,
            additions: shape.additions,
            removals: shape.removals,
            renames: shape.renames,
          }),
        ),
        replacementFixture("ownership-map", V2_OWNERSHIP_PATH, "{}\n"),
        replacementFixture("database-baseline", V2_DATABASE_PATH, "{}\n"),
        replacementFixture("provider-baseline", V2_PROVIDER_PATH, "{}\n"),
      ],
      planHash: summary.transactionPlanHash,
    },
    summary,
    ...(shape.policyVersion ? { policyVersion: shape.policyVersion } : {}),
    policyStatus: "candidate",
  };
}

/** Runs one acknowledged apply and returns its rejection message. */
async function applyRejectionMessage(
  preview: ArchitectureReconciliationPreview,
): Promise<string> {
  try {
    await applyArchitectureReconciliation({
      preview,
      acknowledge: true,
      expectedReconciliationPlanHash: PLAN_HASH,
      newDebtMetadata: { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("review-record gate: bypass attempts (target 1)", () => {
  it.each([
    { label: "removals_only", removals: 1, additions: 0, renames: 0 },
    { label: "renames_only", renames: 1, additions: 0, removals: 0 },
  ])(
    "gate_refuses_a_$label_delta_without_reviews",
    async ({ additions, removals, renames }) => {
      const message = await applyRejectionMessage(
        previewFixture({
          manifestId: "reconciliation-manifest",
          reviews: [],
          status: "candidate",
          additions,
          removals,
          renames,
          policyVersion: "v2",
        }),
      );
      expect(
        message,
        `the gate must refuse the delta: additions=${additions} removals=${removals} renames=${renames} message=${message}`,
      ).toContain(GATE_MESSAGE);
    },
  );

  it("gate_refuses_a_non_array_reviews_field", async () => {
    const message = await applyRejectionMessage(
      previewFixture({
        manifestId: "reconciliation-manifest",
        reviews: { role: "correctness" },
        status: "candidate",
        additions: 1,
        removals: 0,
        renames: 0,
        policyVersion: "v2",
      }),
    );
    expect(
      message,
      `a non-array reviews field must not pass as a record: message=${message}`,
    ).toContain(GATE_MESSAGE);
  });

  it("gate_treats_a_capitalized_acceptance_status_as_candidate", async () => {
    const message = await applyRejectionMessage(
      previewFixture({
        manifestId: "reconciliation-manifest",
        reviews: [],
        status: "Accepted",
        additions: 1,
        removals: 0,
        renames: 0,
        policyVersion: "v2",
      }),
    );
    expect(
      message,
      `the accepted bypass must be case-sensitive: message=${message}`,
    ).toContain(GATE_MESSAGE);
  });

  it.each([
    { label: "unknown_id", manifestId: "v2-manifest" },
    { label: "known_other_id", manifestId: "ownership-map" },
  ])(
    "gate_refuses_a_renamed_replacement_id ($label)",
    async ({ manifestId }) => {
      const message = await applyRejectionMessage(
        previewFixture({
          manifestId,
          reviews: [],
          status: "candidate",
          additions: 1,
          removals: 0,
          renames: 0,
          policyVersion: "v2",
        }),
      );
      expect(
        message,
        `the gate must key on the manifest destination path: id=${manifestId} message=${message}`,
      ).toContain(GATE_MESSAGE);
    },
  );

  it.each([
    {
      label: "dot_segment",
      manifestPath:
        "packages/architecture-enforcement/src/config/./analyzer-reconciliation.v2.json",
    },
    {
      label: "double_slash",
      manifestPath:
        "packages/architecture-enforcement/src/config//analyzer-reconciliation.v2.json",
    },
    {
      label: "trailing_slash",
      manifestPath: `${V2_MANIFEST_PATH}/`,
    },
    {
      label: "capitalized_root",
      manifestPath: V2_MANIFEST_PATH.replace("packages", "Packages"),
    },
  ])(
    "gate_refuses_a_delta_staged_at_a_path_variant ($label)",
    async ({ manifestPath }) => {
      const message = await applyRejectionMessage(
        previewFixture({
          manifestId: "reconciliation-manifest",
          reviews: [],
          status: "candidate",
          additions: 1,
          removals: 0,
          renames: 0,
          policyVersion: "v2",
          manifestPath,
        }),
      );
      expect(
        message,
        `the id arm of the gate must read the staged bytes: path=${manifestPath} message=${message}`,
      ).toContain(GATE_MESSAGE);
    },
  );

  it.each([
    {
      label: "dot_segment",
      manifestPath:
        "packages/architecture-enforcement/src/config/./analyzer-reconciliation.v2.json",
    },
    {
      label: "double_slash",
      manifestPath:
        "packages/architecture-enforcement/src/config//analyzer-reconciliation.v2.json",
    },
    {
      label: "trailing_slash",
      manifestPath: `${V2_MANIFEST_PATH}/`,
    },
    {
      label: "capitalized_root",
      manifestPath: V2_MANIFEST_PATH.replace("packages", "Packages"),
    },
  ])(
    "write_guard_refuses_a_renamed_id_at_a_path_variant ($label)",
    async ({ manifestPath }) => {
      const message = await applyRejectionMessage(
        previewFixture({
          manifestId: "v2-manifest",
          reviews: [],
          status: "candidate",
          additions: 1,
          removals: 0,
          renames: 0,
          policyVersion: "v2",
          manifestPath,
        }),
      );
      expect(
        message,
        `the exact destination set must refuse the variant: path=${manifestPath} message=${message}`,
      ).toContain("V2 reconciliation write set is not exact");
    },
  );

  it("gate_refuses_a_swapped_id_and_path", async () => {
    const summary = summaryFixture();
    const preview: ArchitectureReconciliationPreview = {
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
        replacements: [
          replacementFixture(
            "database-baseline",
            V2_MANIFEST_PATH,
            stagedManifest({
              reviews: [],
              status: "candidate",
              additions: 1,
              removals: 0,
              renames: 0,
            }),
          ),
          replacementFixture("ownership-map", V2_OWNERSHIP_PATH, "{}\n"),
          replacementFixture(
            "reconciliation-manifest",
            V2_DATABASE_PATH,
            stagedManifest({
              reviews: [],
              status: "candidate",
              additions: 0,
              removals: 0,
              renames: 0,
            }),
          ),
          replacementFixture("provider-baseline", V2_PROVIDER_PATH, "{}\n"),
        ],
        planHash: summary.transactionPlanHash,
      },
      summary,
      policyVersion: "v2",
      policyStatus: "candidate",
    };
    const message = await applyRejectionMessage(preview);
    expect(
      message,
      `the path arm of the gate must read the bytes at the manifest path: message=${message}`,
    ).toContain(GATE_MESSAGE);
  });

  it("apply_fails_closed_on_non_json_staged_manifest_bytes", async () => {
    const summary = summaryFixture();
    const preview: ArchitectureReconciliationPreview = {
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
        replacements: [
          replacementFixture(
            "reconciliation-manifest",
            V2_MANIFEST_PATH,
            "not-json",
          ),
          replacementFixture("ownership-map", V2_OWNERSHIP_PATH, "{}\n"),
          replacementFixture("database-baseline", V2_DATABASE_PATH, "{}\n"),
          replacementFixture("provider-baseline", V2_PROVIDER_PATH, "{}\n"),
        ],
        planHash: summary.transactionPlanHash,
      },
      summary,
      policyVersion: "v2",
      policyStatus: "candidate",
    };
    await expect(
      applyArchitectureReconciliation({
        preview,
        acknowledge: true,
        expectedReconciliationPlanHash: PLAN_HASH,
        newDebtMetadata: { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
      }),
      "non-json staged bytes must never complete a write",
    ).rejects.toThrow();
  });

  it.each([
    { label: "no_policy_field", policyVersion: undefined },
    { label: "policy_v1", policyVersion: "v1" as const },
  ])(
    "apply_refuses_a_v1_preview_write ($label)",
    async ({ policyVersion }) => {
      const message = await applyRejectionMessage(
        previewFixture({
          manifestId: "reconciliation-manifest",
          reviews: [{ role: "correctness" }],
          status: "candidate",
          additions: 0,
          removals: 0,
          renames: 0,
          ...(policyVersion ? { policyVersion } : {}),
        }),
      );
      expect(
        message,
        `v1 previews must not reach a v2 write: message=${message}`,
      ).toContain("Reconciliation writes require the exact accepted v2 policy");
    },
  );

  it("apply_refuses_a_mismatched_expected_plan_hash", async () => {
    const preview = previewFixture({
      manifestId: "reconciliation-manifest",
      reviews: [{ role: "correctness" }],
      status: "candidate",
      additions: 0,
      removals: 0,
      renames: 0,
      policyVersion: "v2",
    });
    await expect(
      applyArchitectureReconciliation({
        preview,
        acknowledge: true,
        expectedReconciliationPlanHash: "0".repeat(64),
        newDebtMetadata: { owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
      }),
      "a wrong wrapper hash must fail closed before any policy work",
    ).rejects.toThrow(/does not match preview/);
  });

  it("apply_without_acknowledge_requests_no_write", async () => {
    const preview = previewFixture({
      manifestId: "reconciliation-manifest",
      reviews: [],
      status: "candidate",
      additions: 1,
      removals: 0,
      renames: 0,
      policyVersion: "v2",
    });
    const applyTransaction = vi.fn(
      async (_options: ApplyRepositoryFileTransactionOptions) => ({
        state: "not-acknowledged" as const,
        planHash: preview.transactionPlan.planHash,
      }),
    );
    const result = await applyArchitectureReconciliation({
      preview,
      acknowledge: false,
      expectedReconciliationPlanHash: PLAN_HASH,
      dependencies: { applyTransaction },
    });
    expect(
      applyTransaction.mock.calls.length,
      "the unacknowledged path makes exactly one transaction call",
    ).toBe(1);
    expect(
      applyTransaction.mock.calls[0]![0].acknowledge,
      "the transaction must be requested without acknowledgement",
    ).toBe(false);
    expect(
      result.transactionOutcome.state,
      "the unacknowledged outcome must not report a commit",
    ).toBe("not-acknowledged");
  });

  it.each([
    {
      label: "exact_ordered_set",
      paths: exactDestinationSet(),
      policyVersion: "v2",
      dryRun: false,
      expected: { allowed: true, applied: true },
    },
    {
      label: "dry_run_applies_nothing",
      paths: exactDestinationSet(),
      policyVersion: "v2",
      dryRun: true,
      expected: { allowed: true, applied: false },
    },
    {
      label: "swapped_order",
      paths: [
        V2_OWNERSHIP_PATH,
        V2_MANIFEST_PATH,
        V2_DATABASE_PATH,
        V2_PROVIDER_PATH,
      ],
      policyVersion: "v2",
      dryRun: false,
      expected: { allowed: false, applied: false },
    },
    {
      label: "missing_one_path",
      paths: [V2_MANIFEST_PATH, V2_OWNERSHIP_PATH, V2_DATABASE_PATH],
      policyVersion: "v2",
      dryRun: false,
      expected: { allowed: false, applied: false },
    },
    {
      label: "policy_v1",
      paths: exactDestinationSet(),
      policyVersion: "v1",
      dryRun: false,
      expected: { allowed: false, applied: false },
    },
    {
      label: "policy_v2_capitalized",
      paths: exactDestinationSet(),
      policyVersion: "V2",
      dryRun: false,
      expected: { allowed: false, applied: false },
    },
  ])(
    "policy_guard_authorizes_only_the_exact_v2_destination_set ($label)",
    async ({ paths, policyVersion, dryRun, expected }) => {
      const result = await applyArchitectureReconciliationForPolicy({
        policyVersion,
        repoRoot: "/repo",
        destinationPaths: paths,
        dryRun,
      });
      expect(
        result,
        `the write guard must return the exact matrix: result=${JSON.stringify(result)}`,
      ).toEqual(expected);
    },
  );
});

/** Returns a fresh copy of the exact ordered v2 destination set. */
function exactDestinationSet(): string[] {
  return [...V2_RECONCILIATION_DESTINATION_PATHS];
}

describe("v2 ratchet: a new production finding still fails (target 2)", () => {
  /** Creates a Git-backed fixture with empty v2 baselines and a resolvable db package. */
  async function createV2RatchetFixture(): Promise<string> {
    const repoRoot = await mkdtemp(join(tmpdir(), "arch-v2-ratchet-"));
    fixtureRoots.push(repoRoot);
    const config = selectArchitecturePolicy("v2").config;
    for (const domain of ["database", "provider"] as const) {
      const path = resolve(repoRoot, config.baselineFiles[domain]);
      await mkdir(dirname(path), { recursive: true });
      const baseline: ArchitectureBaseline = {
        schemaVersion: 1,
        domain,
        rulesetHash: computeRulesetHash(config, domain),
        entries: [],
      };
      await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    }
    await mkdir(resolve(repoRoot, "packages/db/src"), { recursive: true });
    await writeFile(
      resolve(repoRoot, "packages/db/package.json"),
      `${JSON.stringify({
        name: "@reading-advantage/db",
        exports: { ".": "./dist/index.js" },
      })}\n`,
      "utf8",
    );
    await writeFile(
      resolve(repoRoot, "packages/db/src/index.ts"),
      "export const users = 1;\n",
      "utf8",
    );
    execFileSync("git", ["init", "--quiet"], { cwd: repoRoot });
    execFileSync(
      "git",
      ["add", "packages/db/package.json", "packages/db/src/index.ts"],
      { cwd: repoRoot },
    );
    return repoRoot;
  }

  /** Adds one tracked production file that imports the database package. */
  async function addDebtFile(repoRoot: string, name: string): Promise<string> {
    const sourcePath = `apps/new-debt/${name}.ts`;
    await mkdir(resolve(repoRoot, "apps/new-debt"), { recursive: true });
    await writeFile(
      resolve(repoRoot, sourcePath),
      'import { users } from "@reading-advantage/db";\nexport const table = users;\n',
      "utf8",
    );
    execFileSync("git", ["add", sourcePath], { cwd: repoRoot });
    return sourcePath;
  }

  it(
    "v2_check_fails_a_new_production_finding",
    async () => {
      const repoRoot = await createV2RatchetFixture();
      const sourcePath = await addDebtFile(repoRoot, "report");
      const report = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      expect(
        report.parseErrors.length,
        "the fixture must parse without analyzer errors",
      ).toBe(0);
      expect(
        report.status,
        `a new production finding must fail under policy v2: status=${report.status}`,
      ).toBe("debt-change");
      expect(
        report.comparison?.additions.length,
        `the comparison must hold the new finding: additions=${report.comparison?.additions.length ?? 0}`,
      ).toBe(1);
      expect(report.comparison?.additions[0]?.ruleId).toBe(
        "DATABASE_BOUNDARY",
      );
      expect(report.comparison?.additions[0]?.sourcePath).toBe(sourcePath);
      expect(
        architectureCheckExitCode(report),
        "the check exit code must be one for new debt",
      ).toBe(1);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "v2_check_stays_clean_for_reviewed_baselined_debt",
    async () => {
      const repoRoot = await createV2RatchetFixture();
      await addDebtFile(repoRoot, "old-report");
      const first = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      expect(
        first.comparison?.additions.length,
        "the control harvest needs exactly one finding",
      ).toBe(1);
      const config = selectArchitecturePolicy("v2").config;
      const finding = first.comparison!.additions[0]!;
      const baseline: ArchitectureBaseline = {
        schemaVersion: 1,
        domain: "database",
        rulesetHash: computeRulesetHash(config, "database"),
        entries: [
          {
            ...finding,
            owner: REVIEW_OWNER,
            rationale: REVIEW_RATIONALE,
          },
        ],
      };
      await writeFile(
        resolve(repoRoot, config.baselineFiles.database),
        `${JSON.stringify(baseline, null, 2)}\n`,
        "utf8",
      );
      const second = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      expect(
        second.status,
        `reviewed baselined debt must stay clean: status=${second.status}`,
      ).toBe("clean");
      expect(
        architectureCheckExitCode(second),
        "the check exit code must be zero for reviewed debt",
      ).toBe(0);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "v2_check_fails_a_second_new_finding_besides_baselined_debt",
    async () => {
      const repoRoot = await createV2RatchetFixture();
      await addDebtFile(repoRoot, "old-report");
      const first = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      const config = selectArchitecturePolicy("v2").config;
      const finding = first.comparison!.additions[0]!;
      const baseline: ArchitectureBaseline = {
        schemaVersion: 1,
        domain: "database",
        rulesetHash: computeRulesetHash(config, "database"),
        entries: [
          { ...finding, owner: REVIEW_OWNER, rationale: REVIEW_RATIONALE },
        ],
      };
      await writeFile(
        resolve(repoRoot, config.baselineFiles.database),
        `${JSON.stringify(baseline, null, 2)}\n`,
        "utf8",
      );
      const newSourcePath = await addDebtFile(repoRoot, "fresh-report");
      const second = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      expect(
        second.status,
        `the ratchet must fail only the new debt: status=${second.status}`,
      ).toBe("debt-change");
      expect(
        second.comparison?.additions.length,
        `the comparison must hold only the new finding: additions=${second.comparison?.additions.length ?? 0}`,
      ).toBe(1);
      expect(second.comparison?.additions[0]?.sourcePath).toBe(newSourcePath);
      expect(
        second.comparison?.removals.length,
        `the baselined debt must not count as removed: removals=${second.comparison?.removals.length ?? 0}`,
      ).toBe(0);
      expect(
        architectureCheckExitCode(second),
        "the check exit code must be one for the new debt",
      ).toBe(1);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "v2_check_ignores_a_manifest_that_stages_the_new_finding",
    async () => {
      const repoRoot = await createV2RatchetFixture();
      const sourcePath = await addDebtFile(repoRoot, "masked-report");
      const first = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      const finding = first.comparison!.additions[0]!;
      const manifestPath = resolve(repoRoot, V2_MANIFEST_PATH);
      await mkdir(dirname(manifestPath), { recursive: true });
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            schemaVersion: 2,
            reconciliationId: "backend-architecture-analyzer-v2",
            baselineAdditions: [finding],
            baselineRemovals: [],
            baselineRenames: [],
            reviews: [{ role: "correctness" }],
            acceptance: { status: "candidate" },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      const second = await checkArchitectureRepository({
        repoRoot,
        policyVersion: "v2",
      });
      expect(
        second.status,
        `a staged manifest addition must not mask a live finding: status=${second.status} source=${sourcePath}`,
      ).toBe("debt-change");
      expect(
        architectureCheckExitCode(second),
        "the check exit code must stay one despite the staged manifest",
      ).toBe(1);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "v2_check_cli_flags_reach_the_checker",
    async () => {
      const checkRepository = vi.fn(
        async (_options: CheckArchitectureRepositoryOptions) => ({
          schemaVersion: 1 as const,
          status: "clean" as const,
          filesScanned: 0,
          findings: [],
          parseErrors: [],
        }),
      );
      const stdout: string[] = [];
      const exitCode = await runArchitectureCheckCli(
        ["--skip-input-snapshot-pin", "--policy", "v2", "--repo-root", "/repo"],
        "/cwd",
        {
          checkRepository,
          writeStdout: (value) => stdout.push(value),
        },
      );
      expect(
        checkRepository.mock.calls.length,
        "the CLI must call the checker exactly once",
      ).toBe(1);
      expect(
        checkRepository.mock.calls[0]![0],
        "the CLI must forward both flags to the checker",
      ).toMatchObject({
        repoRoot: "/repo",
        policyVersion: "v2",
        skipInputSnapshotPin: true,
      });
      expect(exitCode, "a clean stubbed report maps to exit code zero").toBe(0);
      expect(
        stdout.length,
        "the CLI must write exactly one report line group",
      ).toBe(1);
    },
    CHECK_TIMEOUT_MS,
  );
});

/** Builds one strict synthetic database finding for the metadata cases. */
function syntheticFinding(): ArchitectureFinding {
  return {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/adversarial/debt.ts",
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    resolvedTarget: "packages/db/src/index.ts",
    semanticKey: "a".repeat(64),
    instanceKey: "b".repeat(64),
  };
}

/** Builds empty v2 baselines for the metadata cases. */
function emptyV2Baselines(): {
  database: ArchitectureBaseline;
  provider: ArchitectureBaseline;
} {
  const config = selectArchitecturePolicy("v2").config;
  const create = (domain: "database" | "provider"): ArchitectureBaseline => ({
    schemaVersion: 1,
    domain,
    rulesetHash: computeRulesetHash(config, domain),
    entries: [],
  });
  return { database: create("database"), provider: create("provider") };
}

describe("reconcile CLI input contract (target 3)", () => {
  it.each([
    "Daniel",
    "Monorepo Architecture",
    "monorepo/architecture",
    "monorepo.architecture",
    "monorepo!",
    "--acknowledge",
  ])(
    "new_debt_refuses_the_owner_value_%s",
    (owner) => {
      expect(() =>
        createUpdatedArchitectureBaselines({
          config: selectArchitecturePolicy("v2").config,
          baselines: emptyV2Baselines(),
          findings: [syntheticFinding()],
          newDebtMetadata: { owner, rationale: REVIEW_RATIONALE },
        }),
        `the owner contract must refuse the value before any write: owner=${owner}`,
      ).toThrow();
    },
  );

  it.each(["monorepo-architecture", "monorepo_arch", "0wn3r-1d"])(
    "new_debt_accepts_the_owner_value_%s",
    (owner) => {
      const updated = createUpdatedArchitectureBaselines({
        config: selectArchitecturePolicy("v2").config,
        baselines: emptyV2Baselines(),
        findings: [syntheticFinding()],
        newDebtMetadata: { owner, rationale: REVIEW_RATIONALE },
      });
      expect(
        updated.database.entries.length,
        `the accepted owner must reach exactly one entry: owner=${owner}`,
      ).toBe(1);
      expect(updated.database.entries[0]?.owner).toBe(owner);
    },
  );

  it.each([
    { label: "eleven_characters", rationale: "01234567890", accepted: false },
    { label: "twelve_characters", rationale: "012345678901", accepted: true },
    {
      label: "one_thousand_characters",
      rationale: "r".repeat(1000),
      accepted: true,
    },
    {
      label: "one_thousand_one_characters",
      rationale: "r".repeat(1001),
      accepted: false,
    },
    {
      label: "whitespace_only",
      rationale: " ".repeat(15),
      accepted: false,
    },
  ])(
    "new_debt_rationale_length_$label",
    ({ rationale, accepted }) => {
      const attempt = () =>
        createUpdatedArchitectureBaselines({
          config: selectArchitecturePolicy("v2").config,
          baselines: emptyV2Baselines(),
          findings: [syntheticFinding()],
          newDebtMetadata: { owner: REVIEW_OWNER, rationale },
        });
      if (accepted) {
        expect(
          attempt(),
          `the rationale length must be accepted: characters=${rationale.length}`,
        ).toBeDefined();
      } else {
        expect(
          attempt,
          `the rationale length must be refused: characters=${rationale.length}`,
        ).toThrow();
      }
    },
  );

  it.each([
    { label: "uppercase_hex", value: "A".repeat(64) },
    { label: "sixty_three_characters", value: "a".repeat(63) },
    { label: "sixty_five_characters", value: "a".repeat(65) },
    { label: "non_hex_character", value: `${"a".repeat(63)}g` },
    { label: "prefixed_digest", value: `sha256:${"a".repeat(64)}` },
  ])(
    "cli_rejects_the_expected_plan_hash_$label",
    ({ value }) => {
      expect(
        () =>
          parseArchitectureReconciliationArguments(
            ["--acknowledge", "--expected-plan-hash", value],
            "/cwd",
            () => "/repo",
          ),
        `the plan hash contract must refuse the value: value=${value}`,
      ).toThrow(/lowercase SHA-256 digest/);
    },
  );

  it.each([
    { label: "acknowledge_without_hash", args: ["--acknowledge"] },
    {
      label: "hash_without_acknowledge",
      args: ["--expected-plan-hash", PLAN_HASH],
    },
  ])("cli_requires_the_pair_$label", ({ args }) => {
    expect(
      () =>
        parseArchitectureReconciliationArguments(args, "/cwd", () => "/repo"),
      "acknowledgement and the plan hash must be supplied together",
    ).toThrow(/supplied together/);
  });

  it.each([
    { label: "unknown_version", args: ["--policy", "v3"] },
    { label: "capitalized_version", args: ["--policy", "V2"] },
    { label: "missing_value", args: ["--policy"] },
    { label: "equals_form", args: ["--policy=v2"] },
  ])("cli_rejects_the_policy_argument_$label", ({ args }) => {
    expect(
      () =>
        parseArchitectureReconciliationArguments(args, "/cwd", () => "/repo"),
      `the policy contract must refuse the arguments: args=${args.join(" ")}`,
    ).toThrow();
  });

  it.each([
    { label: "owner_without_rationale", args: ["--owner", REVIEW_OWNER] },
    {
      label: "rationale_without_owner",
      args: ["--rationale", REVIEW_RATIONALE],
    },
    { label: "owner_without_value", args: ["--owner"] },
    { label: "rationale_without_value", args: ["--rationale"] },
  ])("cli_requires_the_metadata_pair_$label", ({ args }) => {
    expect(
      () =>
        parseArchitectureReconciliationArguments(args, "/cwd", () => "/repo"),
      `the metadata pair must be refused: args=${args.join(" ")}`,
    ).toThrow();
  });

  it("check_cli_rejects_policy_near_misses", () => {
    for (const value of ["V2", "v3", "2"]) {
      expect(
        () =>
          parseArchitectureCheckArguments(
            ["--policy", value],
            "/cwd",
            () => "/repo",
          ),
        `the check CLI must refuse the policy value: value=${value}`,
      ).toThrow("--policy must be v1 or v2");
    }
    expect(
      parseArchitectureCheckArguments(
        ["--skip-input-snapshot-pin", "--policy", "v2"],
        "/cwd",
        () => "/repo",
      ),
      "the exact CI flag pair must parse",
    ).toMatchObject({ policyVersion: "v2", skipInputSnapshotPin: true });
  });
});

describe("pin refresh budget boundary (target 3)", () => {
  it.each(["08", "1e3", "+900", " 900", "900 ", "900\t"])(
    "budget_rejects_the_near_miss_value_%j",
    (value) => {
      expect(
        () => parsePinRefreshArguments(["--budget-s", value], "/repo", () => "/repo"),
        `the budget contract must refuse the value: value=${JSON.stringify(value)}`,
      ).toThrow(/positive whole number of seconds/);
    },
  );

  it("budget_rejects_a_value_that_is_not_a_finite_whole_number", () => {
    const value = "9".repeat(400);
    expect(
      () => parsePinRefreshArguments(["--budget-s", value], "/repo", () => "/repo"),
      `a value that Number() maps to Infinity must be refused: characters=${value.length}`,
    ).toThrow(/positive whole number of seconds/);
  });

  it.each([
    { label: "max_safe_integer", value: "9007199254740992", accepted: true },
    {
      label: "one_above_max_safe_integer",
      value: "9007199254740993",
      accepted: false,
    },
  ])("budget_boundary_$label", ({ value, accepted }) => {
    const parse = () =>
      parsePinRefreshArguments(["--budget-s", value], "/repo", () => "/repo");
    if (accepted) {
      const parsed = parse();
      expect(
        parsed.budgetSeconds,
        `the largest safe whole number must be accepted: value=${value}`,
      ).toBe(9_007_199_254_740_992);
    } else {
      expect(
        parse,
        `the value must be refused as not a safe whole number: value=${value}`,
      ).toThrow(
        `--budget-s must be a positive whole number of seconds: ${value}`,
      );
    }
  });
});

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

describe("CI step string (target 4)", () => {
  it("boundary_step_runs_the_exact_v2_command", () => {
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
      `the boundary step holds exactly one run line: run_lines=${runLines.length}`,
    ).toBe(1);
    expect(
      runLines[0],
      "the boundary step runs the exact pinned command",
    ).toBe("run: pnpm architecture:check --skip-input-snapshot-pin --policy v2");
  });

  it("build_inputs_step_precedes_the_boundary_step", () => {
    const workflow = readFileSync(
      resolve(REPO_ROOT, ".github/workflows/ci.yml"),
      "utf8",
    );
    const buildStep = extractWorkflowStep(
      workflow,
      "Build architecture check inputs",
    );
    expect(
      buildStep.includes(
        "--filter=@reading-advantage/backend --filter=@reading-advantage/knowledge-space-core",
      ),
      "the build inputs step must build the two analyzer input packages",
    ).toBe(true);
    const buildIndex = workflow.indexOf("Build architecture check inputs");
    const boundaryIndex = workflow.indexOf("Architecture boundary check");
    expect(
      buildIndex,
      "both steps must exist in the workflow",
    ).toBeGreaterThanOrEqual(0);
    expect(
      boundaryIndex,
      "both steps must exist in the workflow",
    ).toBeGreaterThan(buildIndex);
  });

  it("ci_runs_no_architecture_write_command", () => {
    const workflow = readFileSync(
      resolve(REPO_ROOT, ".github/workflows/ci.yml"),
      "utf8",
    );
    const writeCommands = workflow
      .split("\n")
      .filter((line) =>
        /architecture:(pin:refresh|reconcile|baseline:update|transaction:recover)/.test(
          line,
        ),
      );
    expect(
      writeCommands.length,
      `CI must hold no architecture write command: write_commands=${writeCommands.length}`,
    ).toBe(0);
    const acknowledged = workflow
      .split("\n")
      .filter((line) => line.includes("architecture") && line.includes("--acknowledge"));
    expect(
      acknowledged.length,
      `no architecture CI line may acknowledge a write: acknowledged_lines=${acknowledged.length}`,
    ).toBe(0);
  });
});
