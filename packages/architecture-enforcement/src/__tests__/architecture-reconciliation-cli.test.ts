import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  parseArchitectureReconciliationArguments,
  runArchitectureReconciliationCli,
  type ArchitectureReconciliationCliDependencies,
} from "../architecture-reconciliation-cli.js";
import type {
  ArchitectureReconciliationPreview,
  ArchitectureReconciliationSummary,
} from "../architecture-reconciliation.js";

const PLAN_HASH = "a".repeat(64);
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const cliPath = fileURLToPath(
  new URL("../architecture-reconciliation-cli.ts", import.meta.url),
);

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
      {
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "packages/ai/src/x.test.ts",
      },
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

/** Creates an exact preview fixture without repository source bytes. */
function previewFixture(): ArchitectureReconciliationPreview {
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
  };
}

/** Creates injected command boundaries and captured output. */
function dependencies(state: "committed" | "committed-cleanup-incomplete") {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const preview = previewFixture();
  const values: ArchitectureReconciliationCliDependencies = {
    apply: vi.fn(async () => ({
      summary: preview.summary,
      transactionOutcome:
        state === "committed"
          ? { state, planHash: preview.transactionPlan.planHash }
          : {
              state,
              planHash: preview.transactionPlan.planHash,
              cleanupErrors: [],
            },
    })),
    discoverRepositoryRoot: vi.fn(() => "/repo"),
    preview: vi.fn(async () => preview),
    writeStderr: (value) => stderr.push(value),
    writeStdout: (value) => stdout.push(value),
  };
  return { stderr, stdout, values };
}

describe("architecture reconciliation CLI", () => {
  it("requires paired acknowledgement and a strict reviewed hash", () => {
    expect(
      parseArchitectureReconciliationArguments([], "/cwd", () => "/repo"),
    ).toEqual({ acknowledge: false, format: "human", repoRoot: "/repo" });
    expect(() =>
      parseArchitectureReconciliationArguments(["--acknowledge"], "/cwd"),
    ).toThrow(/supplied together/i);
    expect(() =>
      parseArchitectureReconciliationArguments(
        ["--expected-plan-hash", "BAD"],
        "/cwd",
      ),
    ).toThrow(/SHA-256/i);
    expect(() =>
      parseArchitectureReconciliationArguments(["--format", "yaml"], "/cwd"),
    ).toThrow(/human or json/i);
    expect(() =>
      parseArchitectureReconciliationArguments(["--repo-root"], "/cwd"),
    ).toThrow(/requires a path/i);
    expect(() =>
      parseArchitectureReconciliationArguments(["--unknown"], "/cwd"),
    ).toThrow(/unsupported/i);
  });

  it("previews without writing and exits non-zero in human and JSON modes", async () => {
    const human = dependencies("committed");
    await expect(
      runArchitectureReconciliationCli([], "/cwd", human.values),
    ).resolves.toBe(1);
    expect(human.values.apply).not.toHaveBeenCalled();
    expect(human.stdout.join("")).toContain(`plan hash: ${PLAN_HASH}`);
    expect(human.stderr.join("")).toMatch(/wrote nothing/i);
    const json = dependencies("committed");
    await expect(
      runArchitectureReconciliationCli(
        ["--format", "json", "--repo-root", "/explicit"],
        "/cwd",
        json.values,
      ),
    ).resolves.toBe(1);
    expect(JSON.parse(json.stdout.join(""))).toMatchObject({
      state: "preview-required",
      summary: { reconciliationPlanHash: PLAN_HASH },
    });
    expect(json.values.preview).toHaveBeenCalledWith("/explicit");
  });

  it("applies only the expected hash and surfaces cleanup-incomplete distinctly", async () => {
    const committed = dependencies("committed");
    await expect(
      runArchitectureReconciliationCli(
        [
          "--acknowledge",
          "--expected-plan-hash",
          PLAN_HASH,
          "--format",
          "json",
        ],
        "/cwd",
        committed.values,
      ),
    ).resolves.toBe(0);
    expect(committed.values.apply).toHaveBeenCalledWith(
      expect.any(Object),
      PLAN_HASH,
    );
    expect(JSON.parse(committed.stdout.join(""))).toMatchObject({
      state: "committed",
    });
    const cleanup = dependencies("committed-cleanup-incomplete");
    await expect(
      runArchitectureReconciliationCli(
        ["--acknowledge", "--expected-plan-hash", PLAN_HASH],
        "/cwd",
        cleanup.values,
      ),
    ).resolves.toBe(2);
    expect(cleanup.stderr.join("")).toMatch(/do not retry/i);
  });

  it("rejects an impossible acknowledged non-writing outcome", async () => {
    const current = dependencies("committed");
    current.values.apply = vi.fn(async (preview) => ({
      summary: preview.summary,
      transactionOutcome: {
        state: "not-acknowledged" as const,
        planHash: preview.transactionPlan.planHash,
      },
    }));
    await expect(
      runArchitectureReconciliationCli(
        ["--acknowledge", "--expected-plan-hash", PLAN_HASH],
        "/cwd",
        current.values,
      ),
    ).rejects.toThrow(/non-writing/i);
  });

  it("fails closed through the real executable boundary", () => {
    const result = spawnSync(
      fileURLToPath(
        new URL("../../../../node_modules/.bin/tsx", import.meta.url),
      ),
      [cliPath, "--repo-root", "/definitely-missing-reconciliation-root"],
      { cwd: packageRoot, encoding: "utf8", timeout: 30_000 },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/architecture reconciliation failed/i);
  }, 30_000);

  it("exercises repository discovery and the production default boundaries", async () => {
    expect(
      parseArchitectureReconciliationArguments([], packageRoot).repoRoot,
    ).toMatch(/reading-advantage-monorepo$/);

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      await expect(
        runArchitectureReconciliationCli([], packageRoot, {
          preview: async () => previewFixture(),
          apply: async (preview) => ({
            summary: preview.summary,
            transactionOutcome: {
              state: "committed",
              planHash: preview.transactionPlan.planHash,
            },
          }),
          discoverRepositoryRoot: () => "/repo",
        }),
      ).resolves.toBe(1);
      expect(stdout).toHaveBeenCalled();
      expect(stderr).toHaveBeenCalled();

      await expect(
        runArchitectureReconciliationCli(
          ["--repo-root", "/definitely-missing-reconciliation-root"],
          packageRoot,
          { writeStdout: () => undefined, writeStderr: () => undefined },
        ),
      ).rejects.toThrow();

      await expect(
        runArchitectureReconciliationCli(
          ["--acknowledge", "--expected-plan-hash", PLAN_HASH],
          packageRoot,
          {
            preview: async () => previewFixture(),
            writeStdout: () => undefined,
            writeStderr: () => undefined,
          },
        ),
      ).rejects.toThrow();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  }, 30_000);
});
