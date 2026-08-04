import { beforeAll, describe, expect, it } from "vitest";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import {
  createExistingCoreTask5CanonicalReusePackage,
  EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS,
} from "./existing-core-suitability.js";
import { validateStandardPackSuitabilityDossier } from "./standard-pack-suitability.js";
import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

describe("Existing Core Task 5 canonical-reuse suitability package", () => {
  const acceptedCatalog = readStandardPackCatalogFixture();
  let suitability: Awaited<ReturnType<typeof createExistingCoreTask5CanonicalReusePackage>>;

  beforeAll(async () => {
    suitability = await createExistingCoreTask5CanonicalReusePackage(acceptedCatalog);
  }, 30_000);

  it("creates one real accepted-release dossier per title role without legacy ingestion authority", async () => {
    expect(suitability.release).toEqual({
      version: "2026.08.04",
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    });
    expect(suitability.acceptedSemanticBindingEvidence).toEqual({
      semanticAdoptionReceipt: {
        path: "measure/tracks/apk_existing_core_cutover_20260727/task3-current-lineage-receipt-v1.json",
        sha256: "c5ccb0ac3b54474e2ad99badb2aef5c1608689e57559e2f26c6fb489a5513d7f",
      },
      historicalSemanticAdoptionReceipt: {
        path: "measure/tracks/apk_existing_core_cutover_20260727/accepted-semantic-adoption-receipt-v1.json",
        sha256: "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240",
      },
      task4QcReceipt: {
        path: "measure/tracks/apk_existing_core_cutover_20260727/accepted-task4-qc-receipt-v1.json",
        sha256: "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9",
      },
    });
    expect(suitability.dossiers).toHaveLength(17);
    expect(suitability.dossiers.map((dossier) => `${dossier.request.requestingTitle}:${dossier.request.semantic.role}:${dossier.request.semantic.state}`)).toEqual([
      "dragon-flight:player:idle",
      "dragon-flight:feedback:correct",
      "dragon-flight:audio-feedback:correct",
      "magic-defense:panel:default",
      "magic-defense:status:armor",
      "magic-defense:feedback:correct",
      "magic-defense:audio-feedback:correct",
      "dungeon-liberator:player:idle",
      "dungeon-liberator:enemy:idle",
      "dungeon-liberator:feedback:correct",
      "dungeon-liberator:control:confirm",
      "sorcerer-ziggurat:player:idle",
      "sorcerer-ziggurat:feedback:correct",
      "sorcerer-ziggurat:control:confirm",
      "astral-mage:player:idle",
      "astral-mage:feedback:correct",
      "astral-mage:audio-feedback:correct",
    ]);
    await Promise.all(suitability.dossiers.map(validateStandardPackSuitabilityDossier));
    for (const dossier of suitability.dossiers) {
      expect(dossier.decision.disposition).toBe("reuse-canonical");
      expect(dossier.decision.ownerApproval).toEqual({ status: "pending" });
      expect(dossier.decision.authorization).toEqual({
        productionUseAuthorized: false,
        migrationAuthorized: false,
        cutoverAuthorized: false,
        deploymentAuthorized: false,
      });
      const selected = dossier.candidates.find((candidate) => candidate.candidateId === dossier.decision.candidateId);
      expect(selected?.origin).toBe("canonical");
      expect(selected?.requiresCanonicalIngestion).toBe(false);
      expect(Object.values(selected?.suitability ?? {})).not.toContain("fail");
    }
  });

  it("retains measured atlas geometry and the source-derived audio duration", () => {
    const descriptor = (semanticKey: string) => suitability.descriptors.find(
      (candidate) => candidate.catalogEntryKey === semanticKey,
    );

    expect(descriptor("top-down/32x32/characters/hero-01")).toMatchObject({
      mediaKind: "image",
      geometry: { width: 192, height: 384, frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
      collisionEnvelope: { x: 7 / 32, y: 12 / 32, width: 25 / 32, height: 20 / 32 },
      readabilityEnvelope: { minimumRenderPixels: 32, minimumContrastRatio: 1 },
    });
    expect(descriptor("top-down/32x32/characters/hero-01")?.clips).toBeUndefined();
    expect(descriptor("top-down/32x32/characters/hero-01")?.directions).toBeUndefined();
    expect(descriptor("effects/32x32/combat/hit-01")).toMatchObject({
      geometry: { frameWidth: 32, frameHeight: 32, columns: 6, rows: 4 },
      collisionEnvelope: { x: 4 / 32, y: 5 / 32, width: 23 / 32, height: 22 / 32 },
    });
    expect(descriptor("ui/32x32/items/armor-icons")).toMatchObject({
      geometry: { frameWidth: 32, frameHeight: 32, columns: 16, rows: 28 },
    });
    expect(descriptor("audio/native/combat/hit-01")).toMatchObject({
      mediaKind: "audio",
      audio: { durationMs: 1667, channels: 2, loop: false },
    });
  });

  it("keeps the accepted semantic bindings and selected unions title-scoped", async () => {
    expect(suitability.selectedUnionInputs).toEqual([
      { titleId: "dragon-flight", semanticKeys: ["audio/native/combat/hit-01", "effects/32x32/combat/hit-01", "top-down/32x32/characters/hero-01"] },
      { titleId: "magic-defense", semanticKeys: ["audio/native/combat/hit-01", "effects/32x32/combat/hit-01", "ui/20x20/inventory/slot", "ui/32x32/items/armor-icons"] },
      { titleId: "dungeon-liberator", semanticKeys: ["effects/32x32/combat/hit-01", "side-view/32x32/characters/enemy-001-idle", "top-down/32x32/characters/hero-01", "ui/16x16/controls/gamepad-buttons"] },
      { titleId: "sorcerer-ziggurat", semanticKeys: ["effects/32x32/combat/hit-01", "top-down/32x32/characters/hero-01", "ui/16x16/controls/gamepad-buttons"] },
      { titleId: "astral-mage", semanticKeys: ["audio/native/combat/hit-01", "effects/32x32/combat/hit-01", "top-down/32x32/characters/hero-01"] },
    ]);
    expect(suitability.dispositionMatrix.every((row) => row.disposition === "reuse-canonical")).toBe(true);
    expect(suitability.dispositionMatrix.every((row) => row.legacyIngestionAuthorized === false)).toBe(true);
    expect(suitability.ownerAcceptance).toEqual({
      status: "pending",
      durableUserMessageId: null,
      durableUserEventId: null,
      source: "no-owner-acceptance-message-supplied",
    });
    expect(EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS).toHaveLength(17);
  });

  it("rejects the visually similar side-view hero and selects the readable top-down hero instead", async () => {
    const playerDossier = suitability.dossiers.find((dossier) => (
      dossier.request.requestingTitle === "dragon-flight"
      && dossier.request.semantic.role === "player"
    ));

    expect(playerDossier?.limitations.some((limitation) => (
      limitation.limitationId === "existing-core-dragon-flight-player-idle-side-view-hero-rejected"
      && limitation.severity === "medium"
    ))).toBe(true);
    expect(playerDossier?.candidates[0]?.descriptor).toMatchObject({
      catalogEntryKey: "top-down/32x32/characters/hero-01",
    });
    expect(playerDossier?.candidates[0]?.suitability).toMatchObject({
      geometry: "pass",
      collisionEnvelope: "pass",
      visualReadability: "pass",
      animationBehavior: "not-applicable",
    });
  });

  it("fails closed before producing a dossier when the catalog release pin is stale", async () => {
    const staleCatalog = {
      ...acceptedCatalog,
      sourceReceiptDigest: "0".repeat(64),
    };

    await expect(createExistingCoreTask5CanonicalReusePackage(staleCatalog)).rejects.toThrow(
      /accepted release|binding/i,
    );
  });
});
