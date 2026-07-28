import { describe, expect, it, vi } from "vitest";

import {
  DEVELOPER_KIT_API_VERSION,
} from "@reading-advantage/advantage-play-kit/compatibility";
import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
} from "@reading-advantage/advantage-play-kit/assets";
import {
  inspectCompositionGeometry,
} from "@reading-advantage/advantage-play-kit/responsive";

import { cartridgeCatalog, cartridgeLoaders } from "./catalog.js";
import evidenceFixture from "./existing-core-cutover.evidence.json";
import {
  ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256,
  EXISTING_CORE_QC_LOADERS,
  EXISTING_CORE_QC_REGISTRY,
  getExistingCoreQcRegistryEntry,
  loadExistingCoreQcCartridge,
  type ExistingCoreEvidenceMechanic,
  type ExistingCoreMechanicSnapshot,
} from "./existing-core-cutover-qc.js";

const EXPECTED_TITLES = Object.freeze([
  { id: "dragon-flight", inputMode: "vocabulary", temporalScope: "current-source" },
  { id: "magic-defense", inputMode: "vocabulary", temporalScope: "current-source" },
  { id: "dungeon-liberator", inputMode: "sentence", temporalScope: "current-source" },
  { id: "sorcerer-ziggurat", inputMode: "sentence", temporalScope: "historical-source-only" },
  { id: "astral-mage", inputMode: "sentence", temporalScope: "historical-source-only" },
] as const);

function numberAt(snapshot: ExistingCoreMechanicSnapshot, key: keyof ExistingCoreMechanicSnapshot): number {
  const value = snapshot[key];
  expect(value, `Mechanic snapshot must expose numeric ${String(key)}`).toBeTypeOf("number");
  return value as number;
}

function assertDragonFlightMechanics(mechanic: ExistingCoreEvidenceMechanic): void {
  expect(mechanic.snapshot()).toMatchObject({ attempts: 0, correctAnswers: 0, dragonCount: 1 });
  mechanic.applyEvidenceAction("select-incorrect-gate");
  expect(mechanic.snapshot()).toMatchObject({ attempts: 1, correctAnswers: 0, dragonCount: 1 });
  mechanic.applyEvidenceAction("select-correct-gate");
  expect(mechanic.snapshot()).toMatchObject({ attempts: 2, correctAnswers: 1, dragonCount: 2 });
  mechanic.applyEvidenceAction("enter-non-running-state");
  const terminal = mechanic.snapshot();
  mechanic.applyEvidenceAction("select-correct-gate");
  expect(mechanic.snapshot()).toEqual(terminal);
}

function assertMagicDefenseMechanics(mechanic: ExistingCoreEvidenceMechanic): void {
  const initial = mechanic.snapshot();
  expect(initial.castleHp).toEqual({ left: 3, center: 3, right: 3 });
  mechanic.applyEvidenceAction("submit-correct-translation");
  const correct = mechanic.snapshot();
  expect(numberAt(correct, "score")).toBe(numberAt(initial, "score") + 10);
  expect(numberAt(correct, "mana")).toBe(numberAt(initial, "mana") + 10);
  expect(numberAt(correct, "combo")).toBe(numberAt(initial, "combo") + 1);
  mechanic.applyEvidenceAction("submit-incorrect-translation");
  const incorrect = mechanic.snapshot();
  expect(numberAt(incorrect, "attempts")).toBe(numberAt(correct, "attempts") + 1);
  expect(incorrect.combo).toBe(0);
  mechanic.applyEvidenceAction("end-game");
  expect(mechanic.snapshot().status).toBe("game-over");
}

function assertDungeonLiberatorMechanics(mechanic: ExistingCoreEvidenceMechanic): void {
  const initial = mechanic.snapshot();
  mechanic.applyEvidenceAction("collide-next-prisoner");
  const collected = mechanic.snapshot();
  expect(numberAt(collected, "trailLength")).toBe(numberAt(initial, "trailLength") + 1);
  mechanic.applyEvidenceAction("collide-out-of-order-prisoner");
  const reset = mechanic.snapshot();
  expect(reset.trailLength).toBe(0);
  expect(numberAt(reset, "fleeingPrisoners")).toBe(numberAt(collected, "fleeingPrisoners") + 1);
  mechanic.applyEvidenceAction("enter-portal-before-all-words");
  expect(mechanic.snapshot().phase).toBe("playing");
  mechanic.applyEvidenceAction("advance-next-level");
  const nextLevel = mechanic.snapshot();
  expect(numberAt(nextLevel, "level")).toBe(numberAt(reset, "level") + 1);
  expect(nextLevel).toMatchObject({ trailLength: 0, targetIndex: 0 });
  expect(numberAt(nextLevel, "monsterCount")).toBe(numberAt(reset, "monsterCount") + 1);
}

function assertSorcererZigguratMechanics(mechanic: ExistingCoreEvidenceMechanic): void {
  const initial = mechanic.snapshot();
  mechanic.applyEvidenceAction("select-nonadjacent-node");
  expect(mechanic.snapshot()).toEqual(initial);
  mechanic.applyEvidenceAction("select-legal-wrong-node");
  const wrong = mechanic.snapshot();
  expect(numberAt(wrong, "attempts")).toBe(numberAt(initial, "attempts") + 1);
  expect(numberAt(wrong, "score")).toBeLessThan(numberAt(initial, "score"));
  mechanic.applyEvidenceAction("select-legal-correct-node");
  const correct = mechanic.snapshot();
  expect(numberAt(correct, "attempts")).toBe(numberAt(wrong, "attempts") + 1);
  expect(numberAt(correct, "correctAnswers")).toBe(numberAt(wrong, "correctAnswers") + 1);
  expect(numberAt(correct, "expectedTokenIndex")).toBe(numberAt(wrong, "expectedTokenIndex") + 1);
  expect(numberAt(correct, "litNodeCount")).toBe(numberAt(wrong, "litNodeCount") + 1);
  expect(correct.currentNodeId).not.toBe(wrong.currentNodeId);
  mechanic.applyEvidenceAction("emit-completion");
  mechanic.applyEvidenceAction("emit-completion");
  expect(mechanic.snapshot().completions).toBe(1);
}

function assertAstralMageMechanics(mechanic: ExistingCoreEvidenceMechanic): void {
  const initial = mechanic.snapshot();
  mechanic.applyEvidenceAction("hit-inactive-target");
  expect(mechanic.snapshot()).toEqual(initial);
  mechanic.applyEvidenceAction("hit-wrong-visible-token");
  const wrong = mechanic.snapshot();
  expect(numberAt(wrong, "attempts")).toBe(numberAt(initial, "attempts") + 1);
  expect(numberAt(wrong, "score")).toBe(Math.max(0, numberAt(initial, "score") - 25));
  expect(wrong.progress).toBe(initial.progress);
  mechanic.applyEvidenceAction("hit-correct-stable-target");
  const correct = mechanic.snapshot();
  expect(numberAt(correct, "attempts")).toBe(numberAt(wrong, "attempts") + 1);
  expect(numberAt(correct, "progress")).toBe(numberAt(wrong, "progress") + 1);
  expect(numberAt(correct, "activeTargetCount")).toBe(numberAt(wrong, "activeTargetCount") - 1);
  expect(numberAt(correct, "score")).toBe(numberAt(wrong, "score") + 100);
  mechanic.applyEvidenceAction("hit-wrong-visible-token");
  const secondWrong = mechanic.snapshot();
  expect(numberAt(secondWrong, "attempts")).toBe(numberAt(correct, "attempts") + 1);
  expect(numberAt(secondWrong, "score")).toBe(Math.max(0, numberAt(correct, "score") - 25));
  expect(secondWrong.progress).toBe(correct.progress);
}

const mechanicAssertions: Readonly<Record<string, (mechanic: ExistingCoreEvidenceMechanic) => void>> = {
  "dragon-flight": assertDragonFlightMechanics,
  "magic-defense": assertMagicDefenseMechanics,
  "dungeon-liberator": assertDungeonLiberatorMechanics,
  "sorcerer-ziggurat": assertSorcererZigguratMechanics,
  "astral-mage": assertAstralMageMechanics,
};

describe("existing core Advantage Games QC cutover task", () => {
  it("keeps every production cartridge surface quarantined", () => {
    expect(cartridgeCatalog).toEqual([]);
    expect(cartridgeLoaders).toEqual({});
  });

  it("binds exactly the accepted task-3 receipt and five-title QC registry", () => {
    expect(ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256).toBe(
      "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240",
    );
    expect(EXISTING_CORE_QC_REGISTRY.map(({ id, inputMode, temporalScope }) => ({ id, inputMode, temporalScope }))).toEqual(EXPECTED_TITLES);
    expect(Object.keys(EXISTING_CORE_QC_LOADERS)).toEqual(EXPECTED_TITLES.map(({ id }) => id));
    expect(evidenceFixture.titles.map(({ publicId }) => publicId)).toEqual(EXPECTED_TITLES.map(({ id }) => id));
  });

  it("rejects identifiers and session values outside the explicit QC contract", async () => {
    expect(getExistingCoreQcRegistryEntry("castle-defense")).toBeUndefined();
    await expect(loadExistingCoreQcCartridge("castle-defense")).rejects.toThrow();
    const cartridge = await loadExistingCoreQcCartridge("dragon-flight");
    const session = cartridge.createQcSession();
    expect(() => session.dispatch("gamepad" as never, "primary")).toThrow();
    expect(() => session.dispatch("keyboard", "tertiary" as never)).toThrow();
    expect(() => session.resize({ width: 0, height: 844 })).toThrow();
    session.completeProof();
    session.completeProof();
    expect(session.snapshot().completionCount).toBe(1);
  });

  it.each(EXPECTED_TITLES)("rejects evidence actions belonging to another title for $id", async ({ id }) => {
    const cartridge = await loadExistingCoreQcCartridge(id);
    const foreignAction = id === "magic-defense" ? "hit-inactive-target" : "end-game";
    expect(() => cartridge.createDeterministicMechanic().applyEvidenceAction(foreignAction)).toThrow(
      `Evidence action ${foreignAction} is not accepted for ${id}`,
    );
  });

  it.each(EXPECTED_TITLES)("loads $id only through the explicit QC registry", async ({ id, inputMode, temporalScope }) => {
    const entry = getExistingCoreQcRegistryEntry(id);
    expect(entry).toMatchObject({ id, inputMode, temporalScope, registration: "advantage-games-qc-only" });
    const cartridge = await loadExistingCoreQcCartridge(id);
    expect(cartridge.manifest).toMatchObject({
      id,
      inputMode,
      developerKitApiVersion: DEVELOPER_KIT_API_VERSION,
      resultAbi: ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"],
      selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
      responsive: {
        profiles: ["compact", "wide"],
        statePreservation: "capture-recompose-restore",
      },
      inputSupport: { keyboard: true, pointer: true, touch: true },
    });
    expect(cartridge.semanticAdoption).toMatchObject({
      status: "accepted-for-task4-qc",
      receiptSha256: ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256,
      temporalScope,
    });
    expect(cartridge.taskScope).toEqual({
      registration: "advantage-games-qc-only",
      consumable: false,
      productionCatalogExposed: false,
      readingIntegration: false,
      primaryIntegration: false,
      retirementComplete: false,
    });
    expect(cartridge).not.toHaveProperty("hostProofs");
    expect(cartridge).not.toHaveProperty("retirementProof");
    expect(cartridge).not.toHaveProperty("cutoverState");
  });

  it.each(EXPECTED_TITLES)("uses selected-union semantic assets without full-pack delivery for $id", async ({ id }) => {
    const cartridge = await loadExistingCoreQcCartridge(id);
    const selected = cartridge.semanticAdoption.selectedStandardPackOutput;
    expect(selected).toEqual(cartridge.manifest.semanticAssetRequirements);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(4);
    expect(selected.length).toBeLessThan(ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount);
    expect(new Set(selected).size).toBe(selected.length);
    expect(JSON.stringify(selected)).not.toMatch(
      /\.(?:png|ogg|wav|mp3)\b|\/assets\/(?:apk|standard)\/|(?:edition|theme|private[-/]pack|dual[-/]pack)/iu,
    );
  });

  it.each(EXPECTED_TITLES)("revalidates only accepted deterministic mechanic facts for $id", async ({ id }) => {
    const cartridge = await loadExistingCoreQcCartridge(id);
    mechanicAssertions[id]?.(cartridge.createDeterministicMechanic());
  });

  it.each(EXPECTED_TITLES)("preserves mechanic state through compact and wide recomposition for $id", async ({ id }) => {
    const cartridge = await loadExistingCoreQcCartridge(id);
    const session = cartridge.createQcSession();
    session.dispatch("keyboard", "primary");
    const beforeResize = session.snapshot().mechanic;
    const compact = session.resize({ width: 390, height: 844 });
    expect(compact.supported && compact.profile).toBe("compact");
    if (compact.supported) expect(inspectCompositionGeometry(compact)).toEqual([]);
    expect(session.snapshot().mechanic).toEqual(beforeResize);
    const wide = session.resize({ width: 1440, height: 900 });
    expect(wide.supported && wide.profile).toBe("wide");
    if (wide.supported) expect(inspectCompositionGeometry(wide)).toEqual([]);
    expect(session.snapshot().mechanic).toEqual(beforeResize);
  });

  it.each(EXPECTED_TITLES)("normalizes keyboard, pointer, and touch QC intent for $id", async ({ id }) => {
    const cartridge = await loadExistingCoreQcCartridge(id);
    const session = cartridge.createQcSession();
    session.dispatch("keyboard", "primary");
    session.dispatch("pointer", "secondary");
    session.dispatch("touch", "primary");
    expect(session.snapshot().inputCounts).toEqual({ keyboard: 1, pointer: 1, touch: 1 });
  });

  it.each(EXPECTED_TITLES)("emits one QC completion for $id", async ({ id }) => {
    const complete = vi.fn();
    const cartridge = await loadExistingCoreQcCartridge(id);
    const session = cartridge.createQcSession(complete);
    session.dispatch("keyboard", "primary");
    session.completeProof();
    session.completeProof();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.snapshot().completionCount).toBe(1);
    expect(complete.mock.calls[0]?.[0]).toEqual({
      accuracy: 1,
      xp: 20,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
  });
});
