import { describe, expect, it } from "vitest";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";
import { createExistingActionTask2CanonicalResolver } from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import { inspectCompositionGeometry } from "@reading-advantage/advantage-play-kit/responsive";

import {
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES,
  materializeExistingActionCandidateSelectedUnion,
} from "./existing-action-cutover-semantic-candidates.js";
import {
  EXISTING_ACTION_QC_REGISTRY,
  ExistingActionEvidenceUnavailableError,
  getExistingActionQcRegistryEntry,
  loadExistingActionQcCartridge,
  type ExistingActionEvidenceAction,
} from "./existing-action-cutover-qc.js";
import { cartridgeCatalog, cartridgeLoaders } from "./catalog.js";

const EXPECTED_TITLES = [
  { id: "archers-revenge", inputMode: "vocabulary" },
  { id: "paladins-twin-soul", inputMode: "vocabulary" },
  { id: "griffin-sky-joust", inputMode: "sentence" },
  { id: "gryphon-patrol", inputMode: "sentence" },
  { id: "realm-carver", inputMode: "sentence" },
] as const;

describe("existing action cutover Tasks 3–5 fail closed", () => {
  it("keeps exactly five title-specific registrations outside the public catalog", () => {
    expect(EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => candidate.publicId)).toEqual(
      EXPECTED_TITLES.map(({ id }) => id),
    );
    expect(EXISTING_ACTION_QC_REGISTRY.map((entry) => entry.id)).toEqual(EXPECTED_TITLES.map(({ id }) => id));
    expect(getExistingActionQcRegistryEntry("not-a-title")).toBeUndefined();
    expect(cartridgeCatalog).toEqual([]);
    expect(Object.keys(cartridgeLoaders)).toEqual([]);
    for (const candidate of EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES) {
      expect(candidate.consumable).toBe(false);
      expect(candidate.roleStateRequirements).toHaveLength(4);
      expect(candidate.roleStateRequirements.every((role) => role.titleRole.startsWith(`${candidate.publicId}-`))).toBe(true);
      expect(candidate.mechanicEvidence.every((evidence) => evidence.temporalScope !== "current-source")).toBe(true);
    }
  });

  it("selects only resolver-issued v2 descriptors without paths", async () => {
    const resolver = await createExistingActionTask2CanonicalResolver(
      acceptedStandardAssetCatalog as unknown as StandardAssetCatalog,
    );
    for (const candidate of EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES) {
      const selection = await materializeExistingActionCandidateSelectedUnion(candidate, resolver);
      expect(selection.semanticKeys).toEqual([
        "audio/native/combat/hit-01",
        "effects/32x32/combat/hit-01",
        "side-view/32x32/characters/enemy-001-idle",
        "top-down/32x32/characters/hero-01",
      ]);
      expect(selection.registrations).toHaveLength(4);
      expect(selection.resolved).toHaveLength(4);
      expect(JSON.stringify(selection)).not.toMatch(/\.(?:png|ogg|wav|mp3)\b|private|legacy|\/assets\//iu);
    }
  }, 30_000);

  it.each(EXPECTED_TITLES)("records native input but rejects synthetic progression and completion for $id", async ({ id, inputMode }) => {
    const resolver = await createExistingActionTask2CanonicalResolver(
      acceptedStandardAssetCatalog as unknown as StandardAssetCatalog,
    );
    const candidate = EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.find((item) => item.publicId === id);
    if (!candidate) throw new Error(`Missing action candidate ${id}`);
    const selection = await materializeExistingActionCandidateSelectedUnion(candidate, resolver);
    const cartridge = await loadExistingActionQcCartridge(id, selection);
    expect(cartridge.manifest.inputMode).toBe(inputMode);
    expect(cartridge.taskScope).toMatchObject({ registration: "advantage-games-qc-only", progressionSupported: false });

    const mechanic = cartridge.createDeterministicMechanic();
    expect(mechanic.snapshot()).toMatchObject({ status: "blocked", progress: 0, completions: 0 });
    expect(() => mechanic.applyEvidenceAction(candidate.mechanicEvidence[0]!.action as ExistingActionEvidenceAction)).toThrow(
      ExistingActionEvidenceUnavailableError,
    );

    const session = cartridge.createQcSession();
    session.dispatchPhysicalInput({ modality: "keyboard", key: "Enter", intent: "primary" });
    session.dispatchPhysicalInput({ modality: "pointer", button: 0, x: 144, y: 272, intent: "secondary" });
    session.dispatchPhysicalInput({ modality: "touch", touchCount: 1, x: 244, y: 372, intent: "primary" });
    const compact = session.resize({ width: 390, height: 844 });
    expect(compact.supported && compact.profile).toBe("compact");
    if (compact.supported) expect(inspectCompositionGeometry(compact)).toEqual([]);
    const wide = session.resize({ width: 1440, height: 900 });
    expect(wide.supported && wide.profile).toBe("wide");
    if (wide.supported) expect(inspectCompositionGeometry(wide)).toEqual([]);
    expect(session.snapshot()).toMatchObject({
      mechanic: { status: "blocked", progress: 0, completions: 0 },
      inputCounts: { keyboard: 1, pointer: 1, touch: 1 },
      blockedInteractionCount: 3,
      completionCount: 0,
    });
    expect(() => session.completeProof()).toThrow(ExistingActionEvidenceUnavailableError);
  }, 30_000);
});
