import { ACCEPTED_STANDARD_ASSET_RELEASE } from "@reading-advantage/advantage-play-kit/assets";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { createInputActionNormalizer, createLanguageTargetProgression, validateNonEmptyContent, type InputAction, type NonEmptyContentItem, type PhysicalInputDescriptor } from "@reading-advantage/advantage-play-kit/systems";

import { getLegacyDefenseSemanticAdoptionCandidate, getLegacyDefenseSelectedSemanticKeys, type LegacyDefenseClaimReference } from "./legacy-defense-suitability.js";

/** One exact source-backed enemy composition for a Castle Defense wave. */
export interface CastleDefenseWaveComposition {
  /** Soldier count in the wave. */
  readonly soldiers: number;
  /** Tank count in the wave. */
  readonly tanks: number;
  /** Boss count in the wave. */
  readonly bosses: number;
}

/** Enemy types with source-backed base-damage values. */
export type CastleDefenseEnemyType = "soldier" | "tank" | "boss";

/** Immutable current-source state for the isolated Castle Defense QC mechanic. */
export interface CastleDefenseSnapshot {
  /** The source-backed game state, never a host completion result. */
  readonly status: "playing" | "victory" | "gameover";
  /** Next sentence word instance required in source order. */
  readonly targetIndex: number;
  /** Whether the current sentence has unlocked a tower build. */
  readonly sentenceComplete: boolean;
  /** Active defense tower count. */
  readonly towersBuilt: number;
  /** Current one-based wave number. */
  readonly wave: number;
  /** Completed non-terminal waves. */
  readonly wavesCleared: number;
  /** Exact composition for the current wave. */
  readonly waveComposition: CastleDefenseWaveComposition;
  /** Number of enemies emitted within the current wave quota. */
  readonly spawnedEnemies: number;
  /** Number of active source-backed enemies. */
  readonly activeEnemies: number;
  /** Remaining base health after typed enemy breaches. */
  readonly baseHealth: number;
  /** Source-backed two-second transition message time. */
  readonly waveMessageRemainingMs: number;
  /** Completion is intentionally unavailable outside a separately accepted host proof. */
  readonly completionSupported: false;
}

/** Current-source Castle Defense operations, all bound to exact accepted claims. */
export interface CastleDefenseMechanic {
  /** Exact accepted source claims for every exposed operation. */
  readonly evidence: Readonly<Record<string, LegacyDefenseClaimReference>>;
  /** Collects a word only when its source index is next and uncollected. */
  collectWord(wordIndex: number): void;
  /** Builds one tower only after sentence completion and an empty tower-slot proximity proof. */
  buildTower(nearEmptyTowerSlot: boolean): void;
  /** Spawns one enemy only while the current wave quota allows it. */
  spawnNextEnemy(): void;
  /** Defeats one active enemy only after a defense tower exists. */
  defeatEnemy(): void;
  /** Advances the exact two-second inter-wave message boundary. */
  advanceWaveTransition(deltaMs: number): void;
  /** Applies typed source-backed base damage when an enemy reaches the path end. */
  enemyReachedBase(enemyType: CastleDefenseEnemyType): void;
  /** Returns the non-authorizing mechanics snapshot. */
  snapshot(): CastleDefenseSnapshot;
}

/** T11 cartridge surface that deliberately omits callbacks and result delivery. */
export interface CastleDefenseCartridge {
  /** Validated QC-only manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported browser input modalities. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /** Converts one browser descriptor into bounded actions. */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /** Resolves compact or wide presentation without changing mechanics. */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Creates a source-backed mechanic with no completion callback seam. */
  createMechanic(content: readonly NonEmptyContentItem[]): CastleDefenseMechanic;
}

const WAVE_COMPOSITIONS: readonly CastleDefenseWaveComposition[] = Object.freeze([
  Object.freeze({ soldiers: 10, tanks: 0, bosses: 0 }),
  Object.freeze({ soldiers: 8, tanks: 4, bosses: 0 }),
  Object.freeze({ soldiers: 10, tanks: 5, bosses: 1 }),
  Object.freeze({ soldiers: 12, tanks: 8, bosses: 1 }),
  Object.freeze({ soldiers: 15, tanks: 10, bosses: 2 }),
  Object.freeze({ soldiers: 20, tanks: 12, bosses: 3 }),
]);
const BASE_DAMAGE: Readonly<Record<CastleDefenseEnemyType, number>> = Object.freeze({ soldier: 10, tank: 15, boss: 30 });
const WAVE_MESSAGE_MS = 2_000;

const normalizeCastleDefenseInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down", Enter: "confirm", Space: "confirm" },
  pointerTap: { action: "confirm" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
});

/** Converts validated sentence content into ordered word-instance identities. */
function sentenceWords(content: readonly NonEmptyContentItem[]): readonly { readonly id: string }[] {
  return Object.freeze(content[0]!.term.trim().split(/\s+/u).map((word, index) => Object.freeze({ id: `${index}:${word}` })));
}

/** Resolves the public responsive composition for Castle Defense QC. */
function composeCastleDefense(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
}

/** Returns the total source-backed quota for one wave composition. */
function waveQuota(composition: CastleDefenseWaveComposition): number {
  return composition.soldiers + composition.tanks + composition.bosses;
}

/**
 * Creates source-backed Castle Defense sentence, tower, wave, and base-defense rules.
 * @param content Nonempty sentence content used for ordered collection.
 * @returns Isolated mechanics with no completion callback or persistence seam.
 * @throws When content is empty or invalid.
 */
export function createCastleDefenseMechanic(content: readonly NonEmptyContentItem[]): CastleDefenseMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const targets = sentenceWords(validated.items);
  const progression = createLanguageTargetProgression(targets, { targetId: (target) => target.id, candidateId: (index: number) => targets[index]?.id ?? `invalid:${index}` });
  const candidate = getLegacyDefenseSemanticAdoptionCandidate("castle-defense");
  if (!candidate) throw new Error("Castle Defense evidence candidate is missing");
  let status: CastleDefenseSnapshot["status"] = "playing";
  let sentenceComplete = false;
  let towersBuilt = 0;
  let waveIndex = 0;
  let wavesCleared = 0;
  let spawnedEnemies = 0;
  let activeEnemies = 0;
  let baseHealth = 100;
  let waveMessageRemainingMs = 0;

  const resetSentence = (): void => {
    progression.reset();
    sentenceComplete = false;
  };
  const finishWave = (): void => {
    if (waveIndex === WAVE_COMPOSITIONS.length - 1) {
      status = "victory";
      return;
    }
    waveMessageRemainingMs = WAVE_MESSAGE_MS;
  };

  return Object.freeze({
    evidence: candidate.mechanicEvidence,
    collectWord(wordIndex: number): void {
      if (status !== "playing" || sentenceComplete || waveMessageRemainingMs > 0) return;
      const match = progression.match(wordIndex);
      if (!match.matched) {
        resetSentence();
        return;
      }
      if (progression.isComplete) sentenceComplete = true;
    },
    buildTower(nearEmptyTowerSlot: boolean): void {
      if (status !== "playing" || !sentenceComplete || !nearEmptyTowerSlot || waveMessageRemainingMs > 0) return;
      towersBuilt += 1;
      resetSentence();
    },
    spawnNextEnemy(): void {
      const quota = waveQuota(WAVE_COMPOSITIONS[waveIndex]!);
      if (status !== "playing" || towersBuilt === 0 || waveMessageRemainingMs > 0 || spawnedEnemies >= quota) return;
      spawnedEnemies += 1;
      activeEnemies += 1;
    },
    defeatEnemy(): void {
      if (status !== "playing" || towersBuilt === 0 || waveMessageRemainingMs > 0 || activeEnemies === 0) return;
      activeEnemies -= 1;
      if (activeEnemies === 0 && spawnedEnemies === waveQuota(WAVE_COMPOSITIONS[waveIndex]!)) finishWave();
    },
    advanceWaveTransition(deltaMs: number): void {
      if (status !== "playing" || waveMessageRemainingMs === 0 || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
      waveMessageRemainingMs = Math.max(0, waveMessageRemainingMs - deltaMs);
      if (waveMessageRemainingMs !== 0) return;
      wavesCleared += 1;
      waveIndex += 1;
      spawnedEnemies = 0;
      activeEnemies = 0;
      towersBuilt = 0;
      resetSentence();
    },
    enemyReachedBase(enemyType: CastleDefenseEnemyType): void {
      if (status !== "playing" || waveMessageRemainingMs > 0 || activeEnemies === 0) return;
      activeEnemies -= 1;
      baseHealth = Math.max(0, baseHealth - BASE_DAMAGE[enemyType]);
      if (baseHealth === 0) status = "gameover";
    },
    snapshot(): CastleDefenseSnapshot {
      return Object.freeze({ status, targetIndex: progression.currentIndex, sentenceComplete, towersBuilt, wave: waveIndex + 1, wavesCleared, waveComposition: WAVE_COMPOSITIONS[waveIndex]!, spawnedEnemies, activeEnemies, baseHealth, waveMessageRemainingMs, completionSupported: false as const });
    },
  });
}

/** QC-only Castle Defense cartridge with no product catalog, host, or completion registration. */
export const CASTLE_DEFENSE_CARTRIDGE: CastleDefenseCartridge = Object.freeze({
  manifest: validateCartridgeManifest({ schemaVersion: 1, id: "castle-defense", title: "Castle Defense", description: "Source-backed sentence defense and six-wave inspection for Advantage Games QC only.", version: "0.2.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "sentence", capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition"], standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: getLegacyDefenseSelectedSemanticKeys("castle-defense"), responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" }, attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" } }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeCastleDefenseInput,
  compose: composeCastleDefense,
  createMechanic: createCastleDefenseMechanic,
});
