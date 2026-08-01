import { ACCEPTED_STANDARD_ASSET_RELEASE } from "@reading-advantage/advantage-play-kit/assets";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { createInputActionNormalizer, type InputAction, type PhysicalInputDescriptor } from "@reading-advantage/advantage-play-kit/systems";

import { getLegacyDefenseSemanticAdoptionCandidate, getLegacyDefenseSelectedSemanticKeys, type LegacyDefenseClaimReference } from "./legacy-defense-suitability.js";

/** Error raised when only historical or absent Storm evidence is offered as runnable behavior. */
export class StormCastleTowerEvidenceUnavailableError extends Error {
  /** Creates a fail-closed historical-evidence error. */
  constructor(
    /** Exact source claim that blocks the operation. */
    readonly claim: LegacyDefenseClaimReference,
  ) {
    super(`Storm the Castle Tower cannot execute ${claim.claimId} at ${claim.locator}: ${claim.disposition}`);
    this.name = "StormCastleTowerEvidenceUnavailableError";
  }
}

/** Immutable blocked Storm snapshot; no historical gameplay behavior is promoted. */
export interface StormCastleTowerSnapshot {
  /** Current implementation is absent and historical behavior is not executable. */
  readonly status: "blocked";
  /** Claim proving the bounded current implementation absence. */
  readonly blockingClaim: LegacyDefenseClaimReference;
  /** Claim preserving historical behavior as non-executable context. */
  readonly historicalClaim: LegacyDefenseClaimReference;
  /** No host completion can be emitted. */
  readonly completionSupported: false;
}

/** Fail-closed Storm mechanic surface. */
export interface StormCastleTowerMechanic {
  /** Exact current-absence and historical claims retained by the adapter. */
  readonly evidence: Readonly<Record<string, LegacyDefenseClaimReference>>;
  /** Rejects a window selection because the referenced logic is historical. */
  selectWindow(windowIndex: number): never;
  /** Rejects a hazard step because the referenced logic is historical. */
  hitHazard(): never;
  /** Rejects a summit transition because no current implementation exists. */
  reachSummit(): never;
  /** Returns the immutable blocked state. */
  snapshot(): StormCastleTowerSnapshot;
}

/** T11 cartridge surface limited to input and responsive QC inspection. */
export interface StormCastleTowerCartridge {
  /** Validated QC-only manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported browser input modalities. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /** Converts a browser descriptor into bounded actions. */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /** Resolves compact or wide presentation without asserting historical gameplay. */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Creates a fail-closed mechanic with no content or callback interface. */
  createMechanic(): StormCastleTowerMechanic;
}

const normalizeStormCastleTowerInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down", Enter: "confirm", Space: "confirm" },
  pointerTap: { action: "confirm" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
});

/** Resolves the public responsive composition for the blocked Storm QC surface. */
function composeStormCastleTower(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
}

/**
 * Creates the Storm historical-evidence boundary.
 * @returns A mechanic whose every behavior operation throws a provenance-bearing error.
 */
export function createStormCastleTowerMechanic(): StormCastleTowerMechanic {
  const candidate = getLegacyDefenseSemanticAdoptionCandidate("storm-castle-tower");
  if (!candidate) throw new Error("Storm the Castle Tower evidence candidate is missing");
  const blockingClaim = candidate.mechanicEvidence.missingCurrentImplementation;
  const historicalClaim = candidate.mechanicEvidence.historicalWindowCollection;
  if (!blockingClaim || !historicalClaim) throw new Error("Storm the Castle Tower fail-closed claims are incomplete");
  const blocked = (): never => {
    throw new StormCastleTowerEvidenceUnavailableError(blockingClaim);
  };
  return Object.freeze({
    evidence: candidate.mechanicEvidence,
    selectWindow: (_windowIndex: number): never => blocked(),
    hitHazard: (): never => blocked(),
    reachSummit: (): never => blocked(),
    snapshot: (): StormCastleTowerSnapshot => Object.freeze({ status: "blocked", blockingClaim, historicalClaim, completionSupported: false as const }),
  });
}

/** QC-only Storm cartridge that preserves its withdrawn and historical disposition. */
export const STORM_CASTLE_TOWER_CARTRIDGE: StormCastleTowerCartridge = Object.freeze({
  manifest: validateCartridgeManifest({ schemaVersion: 1, id: "storm-castle-tower", title: "Storm the Castle Tower", description: "Historical Storm input and descriptor inspection; current behavior remains fail-closed in Advantage Games QC.", version: "0.2.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "sentence", capabilities: ["capability:input-action-normalization"], standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: getLegacyDefenseSelectedSemanticKeys("storm-castle-tower"), responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" }, attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" } }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeStormCastleTowerInput,
  compose: composeStormCastleTower,
  createMechanic: createStormCastleTowerMechanic,
});
