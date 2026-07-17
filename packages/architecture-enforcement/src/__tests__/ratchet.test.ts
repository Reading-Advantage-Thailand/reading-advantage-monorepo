import { describe, expect, it } from "vitest";
import type {
  ArchitectureBaseline,
  ArchitectureFinding,
} from "../contracts.js";
import {
  compareArchitectureDebt,
  formatArchitectureComparison,
  serializeArchitectureComparison,
} from "../ratchet.js";

const hash = (character: string): string => character.repeat(64);

/**
 * Creates one valid finding for focused ratchet tests.
 * @param overrides Finding properties that differ from the default.
 * @returns Strict-shape architecture finding.
 */
function finding(
  overrides: Partial<ArchitectureFinding> = {},
): ArchitectureFinding {
  return {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/marketing/src/database.ts",
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    resolvedTarget: "packages/db/src/index.ts",
    semanticKey: hash("a"),
    instanceKey: hash("1"),
    ...overrides,
  };
}

/**
 * Creates the two required domain baselines from reviewed findings.
 * @param entries Database findings to record as reviewed debt.
 * @returns Valid database and provider baseline pair.
 */
function baselines(
  entries: readonly ArchitectureFinding[],
): { database: ArchitectureBaseline; provider: ArchitectureBaseline } {
  return {
    database: {
      schemaVersion: 1,
      domain: "database",
      rulesetHash: hash("d"),
      entries: [...entries]
        .sort((left, right) => left.instanceKey.localeCompare(right.instanceKey))
        .map((entry) => ({
          ...entry,
          owner: "architecture-platform",
          rationale: "Reviewed architecture debt awaiting domain migration.",
        })),
    },
    provider: {
      schemaVersion: 1,
      domain: "provider",
      rulesetHash: hash("e"),
      entries: [],
    },
  };
}

describe("architecture debt ratchet hardening", () => {
  it("matches exact instances before pairing same-semantic moves", () => {
    const first = finding({ instanceKey: hash("1") });
    const second = finding({
      sourcePath: "apps/sales/src/database.ts",
      instanceKey: hash("2"),
    });
    const movedFirst = finding({
      sourcePath: "apps/marketing/src/moved-database.ts",
      instanceKey: hash("3"),
    });

    const result = compareArchitectureDebt({
      baselines: baselines([first, second]),
      findings: [second, movedFirst],
    });

    expect(result.status).toBe("baseline-update-required");
    expect(result.additions).toEqual([]);
    expect(result.removals).toEqual([]);
    expect(result.renames).toEqual([
      {
        semanticKey: first.semanticKey,
        previousInstanceKey: first.instanceKey,
        currentInstanceKey: movedFirst.instanceKey,
      },
    ]);
  });

  it("preserves surplus same-semantic instances as new debt", () => {
    const reviewed = finding({ instanceKey: hash("1") });
    const moved = finding({
      sourcePath: "apps/marketing/src/moved-database.ts",
      instanceKey: hash("2"),
    });
    const added = finding({
      sourcePath: "apps/sales/src/database.ts",
      instanceKey: hash("3"),
    });

    const result = compareArchitectureDebt({
      baselines: baselines([reviewed]),
      findings: [added, moved],
    });

    expect(result.status).toBe("new-debt");
    expect(result.renames).toHaveLength(1);
    expect(result.additions.map((entry) => entry.instanceKey)).toEqual([
      added.instanceKey,
    ]);
  });

  it("uses new-debt then removal then rename status precedence", () => {
    const removed = finding({ instanceKey: hash("1") });
    const added = finding({
      semanticKey: hash("b"),
      instanceKey: hash("2"),
      resolvedTarget: "external:drizzle-orm",
      importSpecifier: "drizzle-orm",
    });
    const mixed = compareArchitectureDebt({
      baselines: baselines([removed]),
      findings: [added],
    });
    expect(mixed.status).toBe("new-debt");

    const reduction = compareArchitectureDebt({
      baselines: baselines([removed]),
      findings: [],
    });
    expect(reduction.status).toBe("baseline-reduction-required");
  });

  it("rejects duplicate and contradictory identities", () => {
    const reviewed = finding();
    expect(() =>
      compareArchitectureDebt({
        baselines: baselines([reviewed]),
        findings: [reviewed, reviewed],
      }),
    ).toThrow(/duplicate instanceKey/);

    expect(() =>
      compareArchitectureDebt({
        baselines: baselines([reviewed]),
        findings: [
          finding({
            evidenceKind: "query-call",
            resource: "table:users",
            importSpecifier: undefined,
          }),
        ],
      }),
    ).toThrow(/semanticKey .* contradictory/);
  });

  it("rejects domain-mismatched baselines and malformed current findings", () => {
    const valid = baselines([]);
    expect(() =>
      compareArchitectureDebt({
        baselines: {
          ...valid,
          database: { ...valid.database, domain: "provider" },
        },
        findings: [],
      }),
    ).toThrow(/database baseline must declare the database domain/);

    expect(() =>
      compareArchitectureDebt({
        baselines: valid,
        findings: [
          { ...finding(), sourcePath: "../../secret.ts" } as ArchitectureFinding,
        ],
      }),
    ).toThrow();
  });

  it("keeps serialized and human diagnostics stable and review-metadata-free", () => {
    const reviewed = finding();
    const result = compareArchitectureDebt({
      baselines: baselines([reviewed]),
      findings: [],
    });
    const serialized = serializeArchitectureComparison(result);
    const human = formatArchitectureComparison(result);

    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).not.toContain("rationale");
    expect(serialized).not.toContain("owner");
    expect(human).toContain("baseline-reduction-required");
    expect(human).toContain(
      `- DATABASE_BOUNDARY static-import ${reviewed.sourcePath}:1:1`,
    );
    expect(human).not.toContain("Reviewed architecture debt");
    expect(serializeArchitectureComparison(result)).toBe(serialized);
  });
});
