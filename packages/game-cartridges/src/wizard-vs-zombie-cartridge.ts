import { ACCEPTED_STANDARD_ASSET_RELEASE } from "@reading-advantage/advantage-play-kit/assets";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { createInputActionNormalizer, createLanguageTargetProgression, validateNonEmptyContent, type InputAction, type NonEmptyContentItem, type PhysicalInputDescriptor } from "@reading-advantage/advantage-play-kit/systems";

import { getLegacyDefenseSemanticAdoptionCandidate, getLegacyDefenseSelectedSemanticKeys, type LegacyDefenseClaimReference } from "./legacy-defense-suitability.js";

/** Immutable source-backed Wizard vs Zombie state without a result delivery path. */
export interface WizardVsZombieSnapshot {
  /** Original source state uses playing and gameover rather than a victory result. */
  readonly status: "playing" | "gameover";
  /** Current vocabulary target index. */
  readonly targetIndex: number;
  /** Player health, capped at the source maximum. */
  readonly health: number;
  /** Shockwave charges, capped at three. */
  readonly shockwaveCharges: number;
  /** Source-backed milliseconds until another zombie collision can damage the player. */
  readonly invulnerabilityRemainingMs: number;
  /** One correct orb plus three decoys are retained after each reshuffle. */
  readonly activeOrbCount: 4;
  /** Number of intentionally incorrect decoy orbs. */
  readonly decoyCount: 3;
  /** Number of source-backed incorrect-orb reshuffles. */
  readonly reshuffleCount: number;
  /** Current score after correct and incorrect orb effects. */
  readonly score: number;
  /** No host completion is available from this cartridge. */
  readonly completionSupported: false;
}

/** Source-backed Wizard vs Zombie operations. */
export interface WizardVsZombieMechanic {
  /** Exact source claims for the exposed mechanic rules. */
  readonly evidence: Readonly<Record<string, LegacyDefenseClaimReference>>;
  /** Selects a concrete orb; correct selections heal and decoys reshuffle. */
  collectOrb(orbIndex: number): void;
  /** Consumes one source-backed shockwave charge when one exists. */
  castShockwave(): void;
  /** Applies the source-backed zombie collision damage. */
  hordeHit(): void;
  /** Advances the source-backed zombie-collision invulnerability duration. */
  advanceTime(deltaMs: number): void;
  /** Returns the non-authorizing mechanic state. */
  snapshot(): WizardVsZombieSnapshot;
}

/** T11 cartridge surface with no completion callback, result, or persistence seam. */
export interface WizardVsZombieCartridge {
  /** Validated QC-only manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported browser input modalities. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /** Converts a browser descriptor into bounded actions. */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /** Resolves compact or wide presentation without changing mechanics. */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Creates a source-backed vocabulary-orb mechanic. */
  createMechanic(content: readonly NonEmptyContentItem[]): WizardVsZombieMechanic;
}

const INITIAL_HEALTH = 100;
const MAX_SHOCKWAVE_CHARGES = 3;
const INVULNERABILITY_DURATION_MS = 500;
const ORB_COUNT = 4;
const DECOY_COUNT = 3;

const normalizeWizardVsZombieInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down", Enter: "confirm", Space: "confirm" },
  pointerTap: { action: "confirm" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
});

/** Resolves the public responsive composition for Wizard vs Zombie QC. */
function composeWizardVsZombie(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
}

/**
 * Creates source-backed Wizard vs Zombie healing, decoy, reshuffle, and horde-damage rules.
 * @param content Nonempty vocabulary content that supplies rotating targets.
 * @returns Isolated mechanics with no completion callback or result emission.
 * @throws When vocabulary content is empty or invalid.
 */
export function createWizardVsZombieMechanic(content: readonly NonEmptyContentItem[]): WizardVsZombieMechanic {
  const validated = validateNonEmptyContent(content, "vocabulary");
  const targets = Object.freeze(validated.items.map((item, index) => Object.freeze({ id: `${index}:${item.term}` })));
  const progression = createLanguageTargetProgression(targets, { targetId: (target) => target.id, candidateId: (index: number) => targets[index]?.id ?? `invalid:${index}` });
  const candidate = getLegacyDefenseSemanticAdoptionCandidate("wizard-vs-zombie");
  if (!candidate) throw new Error("Wizard vs Zombie evidence candidate is missing");
  let status: WizardVsZombieSnapshot["status"] = "playing";
  let health = INITIAL_HEALTH;
  let shockwaveCharges = 0;
  let invulnerabilityRemainingMs = 0;
  let reshuffleCount = 0;
  let score = 0;

  return Object.freeze({
    evidence: candidate.mechanicEvidence,
    collectOrb(orbIndex: number): void {
      if (status !== "playing") return;
      const match = progression.match(orbIndex);
      if (match.matched) {
        health = Math.min(INITIAL_HEALTH, health + 10);
        shockwaveCharges = Math.min(MAX_SHOCKWAVE_CHARGES, shockwaveCharges + 1);
        score += 10;
        if (progression.isComplete) progression.reset();
        return;
      }
      reshuffleCount += 1;
      score = Math.max(0, score - 5);
    },
    castShockwave(): void {
      if (status === "playing" && shockwaveCharges > 0) shockwaveCharges -= 1;
    },
    hordeHit(): void {
      if (status !== "playing" || invulnerabilityRemainingMs > 0) return;
      health = Math.max(0, health - 10);
      invulnerabilityRemainingMs = INVULNERABILITY_DURATION_MS;
      if (health === 0) status = "gameover";
    },
    advanceTime(deltaMs: number): void {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
      invulnerabilityRemainingMs = Math.max(0, invulnerabilityRemainingMs - deltaMs);
    },
    snapshot(): WizardVsZombieSnapshot {
      return Object.freeze({ status, targetIndex: progression.currentIndex, health, shockwaveCharges, invulnerabilityRemainingMs, activeOrbCount: ORB_COUNT, decoyCount: DECOY_COUNT, reshuffleCount, score, completionSupported: false as const });
    },
  });
}

/** QC-only Wizard vs Zombie cartridge that preserves source mechanics without host completion. */
export const WIZARD_VS_ZOMBIE_CARTRIDGE: WizardVsZombieCartridge = Object.freeze({
  manifest: validateCartridgeManifest({ schemaVersion: 1, id: "wizard-vs-zombie", title: "Wizard vs Zombie", description: "Source-backed healing, decoy, and reshuffle inspection for Advantage Games QC only.", version: "0.2.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "vocabulary", capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition"], standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: getLegacyDefenseSelectedSemanticKeys("wizard-vs-zombie"), responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" }, attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" } }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeWizardVsZombieInput,
  compose: composeWizardVsZombie,
  createMechanic: createWizardVsZombieMechanic,
});
