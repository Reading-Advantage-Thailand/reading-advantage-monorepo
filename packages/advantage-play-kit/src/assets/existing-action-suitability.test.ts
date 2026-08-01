import { beforeAll, describe, expect, it } from "vitest";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import {
  EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS,
  EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS,
  createExistingActionTask2SuitabilityPackage,
} from "./existing-action-suitability.js";
import { validateStandardPackSuitabilityDossier } from "./standard-pack-suitability.js";
import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

const EXPECTED_TITLES = [
  "archers-revenge",
  "paladins-twin-soul",
  "griffin-sky-joust",
  "gryphon-patrol",
  "realm-carver",
] as const;

describe("Existing Action Task 2 standard-pack suitability", () => {
  const acceptedCatalog = readStandardPackCatalogFixture();
  let suitability: Awaited<ReturnType<typeof createExistingActionTask2SuitabilityPackage>>;

  beforeAll(async () => {
    suitability = await createExistingActionTask2SuitabilityPackage(acceptedCatalog);
  }, 30_000);

  it("freezes one hash-bound historical source manifest and four semantic roles for every exact title", () => {
    expect(EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.map((manifest) => manifest.titleId)).toEqual(EXPECTED_TITLES);
    expect(EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.every((manifest) => manifest.sha256)).toBe(true);
    expect(EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.every((manifest) => manifest.legacyReuseDecision === "blocked")).toBe(true);
    expect(EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.every((manifest) => manifest.legacyIngestionDecision === "blocked")).toBe(true);
    expect(EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS).toHaveLength(20);
    expect([...new Set(EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS.map((input) => input.titleId))]).toEqual(EXPECTED_TITLES);
  });

  it("creates real accepted-release dossiers with no legacy asset adoption or production authorization", async () => {
    expect(suitability.release).toEqual({
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    });
    expect(suitability.dossiers).toHaveLength(20);
    await Promise.all(suitability.dossiers.map(validateStandardPackSuitabilityDossier));

    for (const dossier of suitability.dossiers) {
      const selected = dossier.candidates.find((candidate) => candidate.candidateId === dossier.decision.candidateId);
      expect(dossier.decision.disposition).toBe("reuse-canonical");
      expect(dossier.decision.ownerApproval).toEqual({ status: "pending" });
      expect(dossier.decision.authorization).toEqual({
        productionUseAuthorized: false,
        migrationAuthorized: false,
        cutoverAuthorized: false,
        deploymentAuthorized: false,
      });
      expect(selected?.origin).toBe("canonical");
      expect(selected?.requiresCanonicalIngestion).toBe(false);
      expect(Object.values(selected?.suitability ?? {})).not.toContain("fail");
      expect(dossier.sourceEvidence.some((evidence) => evidence.kind === "legacy-source")).toBe(true);
    }
  });

  it("keeps selected outputs title-scoped and strictly smaller than the real standard-pack release", () => {
    expect(suitability.selectedUnionInputs.map((input) => input.titleId)).toEqual(EXPECTED_TITLES);
    for (const input of suitability.selectedUnionInputs) {
      expect(input.semanticKeys).toEqual([...input.semanticKeys].sort((left, right) => left.localeCompare(right)));
      expect(new Set(input.semanticKeys).size).toBe(input.semanticKeys.length);
      expect(input.semanticKeys.length).toBeLessThan(ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount);
      expect(input.semanticKeys).toEqual([
        "audio/native/combat/hit-01",
        "effects/32x32/combat/hit-01",
        "side-view/32x32/characters/enemy-001-idle",
        "top-down/32x32/characters/hero-01",
      ]);
    }
  });

  it("fails closed when real release bytes do not match the accepted pin", async () => {
    await expect(createExistingActionTask2SuitabilityPackage({
      ...acceptedCatalog,
      sourceReceiptDigest: "0".repeat(64),
    })).rejects.toThrow(/accepted release|binding/i);
  });
});
