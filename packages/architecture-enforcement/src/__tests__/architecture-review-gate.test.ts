import { describe, expect, it } from "vitest";
import {
  applyArchitectureReconciliation,
  type ArchitectureReconciliationPreview,
  type ArchitectureReconciliationSummary,
} from "../architecture-reconciliation.js";

/**
 * Gate tests for the v2 review-artifact control of Review B F1.
 *
 * A v2 write that stages a non-empty baseline delta needs review evidence.
 * The control refuses the write when the staged manifest holds no review
 * record and its status is candidate. An accepted manifest needs no record.
 */

const PLAN_HASH = "a".repeat(64);
const GATE_MESSAGE = "staged baseline delta without a review record";
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const REVIEW_METADATA = {
  owner: "monorepo-architecture",
  rationale: "Reviewed re-baseline of the ci green track of 2026-11-15.",
};

/** Creates a secret-safe summary fixture for the gate cases. */
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

/** Creates one staged v2 manifest with the requested review state. */
function stagedManifest(
  reviews: readonly unknown[],
  status: string,
  stagedAdditions: number,
): string {
  return `${JSON.stringify(
    {
      schemaVersion: 2,
      reconciliationId: "backend-architecture-analyzer-v2",
      baselineAdditions: Array.from({ length: stagedAdditions }, () => ({
        instanceKey: "a".repeat(64),
      })),
      baselineRemovals: [],
      baselineRenames: [],
      reviews,
      acceptance: { status },
    },
    null,
    2,
  )}\n`;
}

/** Creates one preview whose transaction plan stages the v2 manifest. */
function previewFixture(
  reviews: readonly unknown[],
  status: string,
  stagedAdditions: number,
): ArchitectureReconciliationPreview {
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
        {
          id: "reconciliation-manifest",
          repositoryPath: V2_MANIFEST_PATH,
          contents: stagedManifest(reviews, status, stagedAdditions),
          destination: `/repo/${V2_MANIFEST_PATH}`,
          canonicalDestination: `/repo/${V2_MANIFEST_PATH}`,
          device: "fake-device",
          inode: `/repo/${V2_MANIFEST_PATH}`,
          beforeHash: "9".repeat(64),
          afterHash: "8".repeat(64),
        },
      ],
      planHash: summary.transactionPlanHash,
    },
    summary,
    policyVersion: "v2",
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
      newDebtMetadata: REVIEW_METADATA,
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("v2 review-artifact gate (B F1)", () => {
  it("refuses an unreviewed candidate write with a staged delta", async () => {
    const message = await applyRejectionMessage(
      previewFixture([], "candidate", 1),
    );
    expect(
      message,
      `the gate must refuse the write: message=${message}`,
    ).toContain(GATE_MESSAGE);
  });

  it("allows a reviewed candidate write with a staged delta", async () => {
    const message = await applyRejectionMessage(
      previewFixture([{ role: "correctness" }], "candidate", 1),
    );
    expect(
      message.length,
      `the write must reach a later control: message=${message}`,
    ).toBeGreaterThan(0);
    expect(message, "the gate must let a reviewed write pass").not.toContain(
      GATE_MESSAGE,
    );
  });

  it("allows an accepted manifest with a staged delta", async () => {
    const message = await applyRejectionMessage(
      previewFixture([], "accepted", 1),
    );
    expect(
      message.length,
      `the write must reach a later control: message=${message}`,
    ).toBeGreaterThan(0);
    expect(message, "the gate must let an accepted manifest pass").not.toContain(
      GATE_MESSAGE,
    );
  });

  it("allows a candidate write that stages no delta", async () => {
    const message = await applyRejectionMessage(
      previewFixture([], "candidate", 0),
    );
    expect(
      message.length,
      `the write must reach a later control: message=${message}`,
    ).toBeGreaterThan(0);
    expect(message, "the gate must let a write without a delta pass").not.toContain(
      GATE_MESSAGE,
    );
  });
});
