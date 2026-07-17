import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadDatabaseCounterexamples,
  loadProviderCounterexamples,
} from "../counterexample-fixtures.js";
import { loadOwnershipMap } from "../ownership-map.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const fixtures = [
  ...loadDatabaseCounterexamples(),
  ...loadProviderCounterexamples(),
];

/**
 * Loads the analyzer only after an individual named counterexample starts.
 * @returns Analyzer module once the Phase 3 implementation exists.
 */
async function loadAnalyzer() {
  return import("../analyzer.js");
}

describe("architecture analyzer counterexamples (expected Red in Phase 2)", () => {
  it.each(fixtures)(
    "$id produces its named ownership result",
    async (fixture) => {
      const { analyzeArchitectureSources } = await loadAnalyzer();
      const result = await analyzeArchitectureSources({
        repoRoot: resolve(repositoryRoot, fixture.fixtureRoot),
        sourcePaths: [fixture.sourcePath, ...fixture.supportPaths],
        ...(fixture.resolverConfigPath
          ? { resolverConfigPath: fixture.resolverConfigPath }
          : {}),
        config: loadOwnershipMap(),
      });

      expect(result.parseErrors).toEqual([]);
      const findings = result.findings.filter(
        (finding: { ruleId: string }) => finding.ruleId === fixture.ruleId,
      );
      if (fixture.expected === "violation") {
        expect(
          findings.some(
            (finding: { sourcePath: string }) =>
              finding.sourcePath === fixture.sourcePath,
          ),
        ).toBe(true);
        for (const evidenceKind of fixture.expectedEvidenceKinds) {
          expect(
            findings.some(
              (finding: { evidenceKind: string }) =>
                finding.evidenceKind === evidenceKind,
            ),
          ).toBe(true);
        }
      } else {
        expect(result.findings).toEqual([]);
      }
    },
  );
});
