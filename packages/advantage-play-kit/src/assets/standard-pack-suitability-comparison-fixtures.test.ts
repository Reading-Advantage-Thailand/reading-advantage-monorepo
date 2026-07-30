import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

import { describe, expect, it } from "vitest";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import {
  BLOCKED_ABSENCE_FIXTURE,
  LEGACY_INGESTION_REQUIRED_FIXTURE,
  SUITABLE_HERO_01_REUSE_FIXTURE,
  VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE,
} from "./standard-pack-suitability-test-fixtures.test-support.js";
import { standardPackSuitabilityDossierSchema } from "./standard-pack-suitability.js";

const REAL_INCOMPATIBLE_HERO_KEY = "side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72";
const releasedCatalog = readStandardPackCatalogFixture();

describe("standard-pack suitability deterministic comparison fixtures", () => {
  it("pins canonical reuse to the real hero-01 key and exact accepted release triple", () => {
    const dossier = standardPackSuitabilityDossierSchema.parse(SUITABLE_HERO_01_REUSE_FIXTURE);
    const candidate = dossier.candidates[0];
    expect(candidate).toMatchObject({
      origin: "canonical",
      descriptor: {
        catalogEntryKey: "top-down/32x32/characters/hero-01",
        release: {
          version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
          catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
          sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
        },
      },
    });
    expect(dossier.decision.ownerApproval).toEqual({ status: "pending" });
    expect(dossier.decision.authorization).toEqual({
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    });
  });

  it("records a visually similar released canonical candidate but rejects selecting its incompatible behavior", () => {
    const dossier = standardPackSuitabilityDossierSchema.parse(VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE);
    const incompatible = dossier.candidates.find((candidate) => candidate.candidateId === "canonical-hero-02-walk");
    expect(releasedCatalog.assets.some((asset) => asset.key === REAL_INCOMPATIBLE_HERO_KEY)).toBe(true);
    expect(incompatible?.suitability).toMatchObject({
      visualReadability: "pass",
      frameDirectionCompatibility: "fail",
      animationBehavior: "fail",
    });
    expect(incompatible?.descriptor.catalogEntryKey).toBe(REAL_INCOMPATIBLE_HERO_KEY);
    const selection = standardPackSuitabilityDossierSchema.safeParse({
      ...VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE,
      releaseBinding: {
        ...VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE.releaseBinding,
        predecessorDescriptorIds: ["hero-01-walk-canonical", "hero-02-walk-incompatible"],
      },
      decision: {
        ...VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE.decision,
        candidateId: "canonical-hero-02-walk",
        descriptorId: "hero-02-walk-incompatible",
      },
    });
    expect(selection.success).toBe(false);
    if (selection.success) throw new Error("Expected failed suitability candidate selection to be rejected");
    expect(selection.error.issues.map((issue) => issue.message)).toContain(
      "Selected decisions cannot retain failed suitability factors",
    );
  });

  it("retains a proposed non-catalog legacy key with a null release until ingestion", () => {
    const dossier = standardPackSuitabilityDossierSchema.parse(LEGACY_INGESTION_REQUIRED_FIXTURE);
    const candidate = dossier.candidates[0];
    expect(dossier.decision.disposition).toBe("ingest-canonical");
    expect(candidate).toMatchObject({
      origin: "legacy",
      descriptor: {
        catalogEntryKey: "proposed/top-down/characters/legacy-hero-walk",
        release: null,
      },
      requiresCanonicalIngestion: true,
    });
  });

  it("blocks an evidence-backed absence and rejects adding a candidate to the blocked fixture", () => {
    const dossier = standardPackSuitabilityDossierSchema.parse(BLOCKED_ABSENCE_FIXTURE);
    expect(dossier.decision).toMatchObject({ disposition: "blocked", candidateId: null, descriptorId: null });
    expect(dossier.limitations).toHaveLength(1);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...BLOCKED_ABSENCE_FIXTURE,
      candidates: SUITABLE_HERO_01_REUSE_FIXTURE.candidates,
    }).success).toBe(false);
  });
});
