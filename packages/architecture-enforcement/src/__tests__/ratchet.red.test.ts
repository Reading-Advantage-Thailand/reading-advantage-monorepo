import { describe, expect, it } from "vitest";
import {
  architectureConfigSchema,
  type ArchitectureBaseline,
  type ArchitectureFinding,
} from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";

const existingFinding: ArchitectureFinding = {
  schemaVersion: 1,
  ruleId: "DATABASE_BOUNDARY",
  domain: "database",
  sourcePath: "apps/marketing/src/database.ts",
  line: 1,
  column: 1,
  evidenceKind: "static-import",
  importSpecifier: "@reading-advantage/db",
  resolvedTarget: "packages/db/src/index.ts",
  semanticKey: "a".repeat(64),
  instanceKey: "b".repeat(64),
};

const databaseBaseline: ArchitectureBaseline = {
  schemaVersion: 1,
  domain: "database",
  rulesetHash: "f".repeat(64),
  entries: [
    {
      ...existingFinding,
      owner: "marketing-platform",
      rationale: "Reviewed legacy database import awaiting backend migration.",
    },
  ],
};

const providerBaseline: ArchitectureBaseline = {
  schemaVersion: 1,
  domain: "provider",
  rulesetHash: "e".repeat(64),
  entries: [],
};

/**
 * Loads the ratchet only after an individual named expectation starts.
 * @returns Ratchet module once the Phase 3 implementation exists.
 */
async function loadRatchet() {
  return import("../ratchet.js");
}

describe("architecture debt ratchet (expected Red in Phase 2)", () => {
  it("fails when a new violation increases reviewed debt", async () => {
    const { compareArchitectureDebt } = await loadRatchet();
    const added: ArchitectureFinding = {
      ...existingFinding,
      sourcePath: "apps/sales/src/database.ts",
      semanticKey: existingFinding.semanticKey,
      instanceKey: "d".repeat(64),
    };

    const result = compareArchitectureDebt({
      baselines: { database: databaseBaseline, provider: providerBaseline },
      findings: [existingFinding, added],
    });

    expect(result.status).toBe("new-debt");
    expect(
      result.additions.map(
        (finding: ArchitectureFinding) => finding.instanceKey,
      ),
    ).toEqual([added.instanceKey]);
  });

  it("requires baseline reduction when a reviewed violation is deleted", async () => {
    const { compareArchitectureDebt } = await loadRatchet();
    const result = compareArchitectureDebt({
      baselines: { database: databaseBaseline, provider: providerBaseline },
      findings: [],
    });

    expect(result.status).toBe("baseline-reduction-required");
    expect(result.removals).toHaveLength(1);
  });

  it("recognizes a path rename as the same unresolved semantic violation", async () => {
    const { compareArchitectureDebt } = await loadRatchet();
    const moved: ArchitectureFinding = {
      ...existingFinding,
      sourcePath: "apps/marketing/src/moved-database.ts",
      line: 4,
      semanticKey: existingFinding.semanticKey,
      instanceKey: "d".repeat(64),
    };
    const result = compareArchitectureDebt({
      baselines: { database: databaseBaseline, provider: providerBaseline },
      findings: [moved],
    });

    expect(result.status).toBe("baseline-update-required");
    expect(result.renames).toEqual([
      {
        semanticKey: existingFinding.semanticKey,
        previousInstanceKey: existingFinding.instanceKey,
        currentInstanceKey: moved.instanceKey,
      },
    ]);
  });

  it("rejects wildcard and malformed policy instead of broadening debt", () => {
    const config = loadOwnershipMap();
    expect(() =>
      architectureConfigSchema.parse({
        ...config,
        exactExceptions: [
          ...config.exactExceptions,
          {
            schemaVersion: 1,
            id: "wildcard-fixture",
            ruleId: "DATABASE_BOUNDARY",
            sourcePath: "apps/*/src/database.test.ts",
            owner: "architecture-platform",
            rationale: "An invalid broad exception must fail closed.",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({ ...config, schemaVersion: 2 }),
    ).toThrow();
  });

  it("serializes diagnostics identically for reordered current findings", async () => {
    const { compareArchitectureDebt, serializeArchitectureComparison } =
      await loadRatchet();
    const added: ArchitectureFinding = {
      ...existingFinding,
      sourcePath: "apps/sales/src/database.ts",
      semanticKey: existingFinding.semanticKey,
      instanceKey: "d".repeat(64),
    };
    const input = {
      baselines: { database: databaseBaseline, provider: providerBaseline },
    };

    expect(
      serializeArchitectureComparison(
        compareArchitectureDebt({
          ...input,
          findings: [existingFinding, added],
        }),
      ),
    ).toBe(
      serializeArchitectureComparison(
        compareArchitectureDebt({
          ...input,
          findings: [added, existingFinding],
        }),
      ),
    );
  });
});
