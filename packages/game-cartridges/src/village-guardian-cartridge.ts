import { ACCEPTED_STANDARD_ASSET_RELEASE } from "@reading-advantage/advantage-play-kit/assets";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { createInputActionNormalizer, createLanguageTargetProgression, validateNonEmptyContent, type InputAction, type NonEmptyContentItem, type PhysicalInputDescriptor } from "@reading-advantage/advantage-play-kit/systems";

import { getLegacyDefenseSemanticAdoptionCandidate, getLegacyDefenseSelectedSemanticKeys, type LegacyDefenseClaimReference } from "./legacy-defense-suitability.js";

/** Immutable Village Guardian model state preserving the source's playing/defeat status union. */
export interface VillageGuardianSnapshot {
  /** Source model status; Village Guardian has no synthesized victory terminal state. */
  readonly status: "playing" | "defeat";
  /** Next villager word required in exact order. */
  readonly targetIndex: number;
  /** Count of retained trail/progression members. */
  readonly processionCount: number;
  /** Level advances at sanctuary instead of ending the game. */
  readonly level: number;
  /** Remaining source timer in milliseconds. */
  readonly timeRemainingMs: number;
  /** Knight lives with a source-backed floor at zero. */
  readonly lives: number;
  /** Number of wrong-order selections. */
  readonly wrongAnswers: number;
  /** No completion can be emitted by an isolated QC cartridge. */
  readonly completionSupported: false;
}

/** Source-backed Village Guardian operations. */
export interface VillageGuardianMechanic {
  /** Exact source claims for each exposed operation. */
  readonly evidence: Readonly<Record<string, LegacyDefenseClaimReference>>;
  /** Rescues a villager only in source word order. */
  rescueVillager(villagerIndex: number): void;
  /** Advances the source countdown and its defeat branch. */
  advanceTime(deltaMs: number): void;
  /** Applies the source's trail-suffix reset or empty-trail life loss branch at a collided trail index. */
  monsterAttack(trailHitIndex: number): void;
  /** Advances a sanctuary-qualified level without inventing a victory state. */
  reachSanctuary(atSanctuary: boolean): void;
  /** Returns the non-authorizing model state. */
  snapshot(): VillageGuardianSnapshot;
}

/** T11 cartridge surface with no result callback or host delivery seam. */
export interface VillageGuardianCartridge {
  /** Validated QC-only manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported browser input modalities. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /** Converts a browser descriptor into bounded actions. */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /** Resolves compact or wide presentation without changing model state. */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Creates a source-backed Village Guardian mechanic. */
  createMechanic(content: readonly NonEmptyContentItem[]): VillageGuardianMechanic;
}

const INITIAL_TIMER_MS = 30_000;
const INITIAL_LIVES = 3;
const WRONG_WORD_TIME_ADDITION_MS = 2_000;

const normalizeVillageGuardianInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down", Enter: "confirm", Space: "confirm" },
  pointerTap: { action: "confirm" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
});

/** Converts validated sentence content into concrete ordered villager identities. */
function villagerWords(content: readonly NonEmptyContentItem[]): readonly { readonly id: string }[] {
  return Object.freeze(content[0]!.term.trim().split(/\s+/u).map((word, index) => Object.freeze({ id: `${index}:${word}` })));
}

/** Resolves the public responsive composition for Village Guardian QC. */
function composeVillageGuardian(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
}

/**
 * Creates source-backed Village Guardian status, trail, timer, and level rules.
 * @param content Nonempty sentence content used for the current level's word order.
 * @returns Isolated mechanics with no victory or completion callback.
 * @throws When sentence content is empty or invalid.
 */
export function createVillageGuardianMechanic(content: readonly NonEmptyContentItem[]): VillageGuardianMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const targets = villagerWords(validated.items);
  const progression = createLanguageTargetProgression(targets, { targetId: (target) => target.id, candidateId: (index: number) => targets[index]?.id ?? `invalid:${index}` });
  const candidate = getLegacyDefenseSemanticAdoptionCandidate("village-guardian");
  if (!candidate) throw new Error("Village Guardian evidence candidate is missing");
  let status: VillageGuardianSnapshot["status"] = "playing";
  let level = 1;
  let timeRemainingMs = INITIAL_TIMER_MS;
  let lives = INITIAL_LIVES;
  let wrongAnswers = 0;

  return Object.freeze({
    evidence: candidate.mechanicEvidence,
    rescueVillager(villagerIndex: number): void {
      if (status !== "playing") return;
      const match = progression.match(villagerIndex);
      if (match.matched) return;
      wrongAnswers += 1;
      timeRemainingMs += WRONG_WORD_TIME_ADDITION_MS;
    },
    advanceTime(deltaMs: number): void {
      if (status !== "playing" || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
      timeRemainingMs = Math.max(0, timeRemainingMs - deltaMs);
      if (timeRemainingMs === 0) status = "defeat";
    },
    monsterAttack(trailHitIndex: number): void {
      if (status !== "playing") return;
      if (progression.completedCount > 0) {
        const retainedTrailCount = Number.isInteger(trailHitIndex)
          ? Math.min(Math.max(trailHitIndex, 0), progression.completedCount)
          : 0;
        progression.reset();
        for (let index = 0; index < retainedTrailCount; index += 1) progression.match(index);
        return;
      }
      lives = Math.max(0, lives - 1);
      if (lives === 0) status = "defeat";
    },
    reachSanctuary(atSanctuary: boolean): void {
      if (status !== "playing" || !atSanctuary || !progression.isComplete) return;
      level += 1;
      progression.reset();
      timeRemainingMs = INITIAL_TIMER_MS;
    },
    snapshot(): VillageGuardianSnapshot {
      return Object.freeze({ status, targetIndex: progression.currentIndex, processionCount: progression.completedCount, level, timeRemainingMs, lives, wrongAnswers, completionSupported: false as const });
    },
  });
}

/** QC-only Village Guardian cartridge that preserves source status semantics and blocks host completion. */
export const VILLAGE_GUARDIAN_CARTRIDGE: VillageGuardianCartridge = Object.freeze({
  manifest: validateCartridgeManifest({ schemaVersion: 1, id: "village-guardian", title: "Village Guardian", description: "Source-backed playing/defeat and sanctuary-level inspection for Advantage Games QC only.", version: "0.2.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "sentence", capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition", "capability:time-and-frame-loop"], standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: getLegacyDefenseSelectedSemanticKeys("village-guardian"), responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" }, attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" } }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeVillageGuardianInput,
  compose: composeVillageGuardian,
  createMechanic: createVillageGuardianMechanic,
});
