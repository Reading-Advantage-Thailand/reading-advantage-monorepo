import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
} from "@reading-advantage/advantage-play-kit/assets";
import {
  DEVELOPER_KIT_API_VERSION,
} from "@reading-advantage/advantage-play-kit/compatibility";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  validateCartridgeManifest,
  type CartridgeManifest,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type InputAction,
  type NonEmptyContentItem,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import type { GameResults } from "@reading-advantage/game-contracts";

import { getTraversalSelectedSemanticKeys } from "./traversal-suitability.js";

/** Immutable state from Dragon Rider's two-gate vocabulary flight loop. */
export interface DragonRiderTraversalSnapshot {
  /** Whether gate running or the boss phase is active. */
  readonly phase: "running" | "boss";
  /** Number of gate selections made. */
  readonly attempts: number;
  /** Number of correctly selected translation gates. */
  readonly correctAnswers: number;
  /** Dragon allies gained by correct gates and lost by wrong gates. */
  readonly dragonCount: number;
  /** Index of the next vocabulary target. */
  readonly targetIndex: number;
  /** Elapsed duration clamped to the cited 150-second run duration. */
  readonly elapsedMs: number;
  /** Timed running duration before the boss phase starts. */
  readonly durationMs: number;
  /** Gate choice awaiting the cited approach animation before counters change. */
  readonly pendingGate?: Readonly<{ side: "left" | "right"; correct: boolean }>;
  /** Exact source claims that bound this QC-only mechanic. */
  readonly claimIds: readonly string[];
  /** Whether a single terminal result was emitted. */
  readonly completionCount: number;
}

/** Deterministic Dragon Rider rules interface for cartridge and QC callers. */
export interface DragonRiderTraversalMechanic {
  /**
   * Selects one incoming gate.
   * @param side Lane reached by the rider.
   */
  selectGate(side: "left" | "right"): void;
  /**
   * Advances the cited timed gate run without bypassing its boss transition.
   * @param deltaMs Non-negative duration to advance.
   */
  advanceTime(deltaMs: number): void;
  /** Emits a final result no more than once. */
  complete(): void;
  /** Returns the current immutable game-rule snapshot. */
  snapshot(): DragonRiderTraversalSnapshot;
}

/** Public-API cartridge surface for Dragon Rider Task 4–5 QC. */
export interface DragonRiderTraversalCartridge {
  /** Validated public APK manifest. */
  readonly manifest: CartridgeManifest;
  /** Advertised input modalities normalized through pointer events. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /**
   * Normalizes an external keyboard, pointer, or touch-backed pointer input.
   * @param input External physical input descriptor.
   * @returns Bounded public APK actions.
   */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /**
   * Resolves an accessible compact or wide responsive composition.
   * @param viewport Available viewport size.
   * @returns Public APK responsive composition.
   */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /**
   * Creates an independent deterministic Dragon Rider mechanic.
   * @param content Vocabulary items used for gate prompts.
   * @param complete Optional terminal result observer.
   * @returns A title-specific mechanic instance.
   */
  createMechanic(content: readonly NonEmptyContentItem[], complete?: (result: GameResults) => void): DragonRiderTraversalMechanic;
}

const normalizeDragonRiderInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", KeyA: "move-left", KeyD: "move-right" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", threshold: 24 },
  pointerTap: { action: "confirm" },
});

/**
 * Resolves Dragon Rider's public compact or wide composition without changing rule state.
 * @param viewport Available viewport size.
 * @returns A supported public APK composition or its explicit diagnostic.
 */
function composeDragonRider(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
}

/**
 * Creates Dragon Rider's gate-choice and boss-transition learning loop.
 * @param content Nonempty vocabulary used as ordered gate targets.
 * @param complete Optional observer for the terminal result.
 * @returns Isolated deterministic rules with at-most-once completion.
 * @throws When playable vocabulary is empty or blank.
 */
export function createDragonRiderTraversalMechanic(
  content: readonly NonEmptyContentItem[],
  complete?: (result: GameResults) => void,
): DragonRiderTraversalMechanic {
  const validated = validateNonEmptyContent(content, "vocabulary");
  const progression = createLanguageTargetProgression(validated.items.map((item) => item.term));
  const accountant = createResultAccountant();
  let phase: DragonRiderTraversalSnapshot["phase"] = "running";
  let dragonCount = 1;
  const durationMs = 150_000;
  let elapsedMs = 0;
  let pendingGate: { side: "left" | "right"; correct: boolean; elapsedMs: number } | undefined;
  let completionCount = 0;
  const completion = createCompletionLatch<GameResults>((result) => {
    completionCount += 1;
    complete?.(result);
  });
  const resolvePendingGate = (): void => {
    if (!pendingGate) return;
    accountant.recordAttempt({ correct: pendingGate.correct });
    if (pendingGate.correct) {
      accountant.addScore(100);
      dragonCount += 1;
      const target = progression.currentTarget;
      if (target) progression.match(target);
    } else {
      dragonCount = Math.max(1, dragonCount - 1);
    }
    pendingGate = undefined;
  };

  return Object.freeze({
    selectGate(side: "left" | "right"): void {
      if (phase !== "running" || pendingGate) return;
      const correct = side === "right";
      pendingGate = { side, correct, elapsedMs: 0 };
    },
    advanceTime(deltaMs: number): void {
      if (phase !== "running") return;
      const elapsed = Math.max(0, deltaMs);
      elapsedMs = Math.min(durationMs, elapsedMs + elapsed);
      if (pendingGate) {
        pendingGate.elapsedMs += elapsed;
        if (pendingGate.elapsedMs >= 60) resolvePendingGate();
      }
      if (elapsedMs === durationMs) phase = "boss";
    },
    complete(): void {
      completion.complete(finalizeResult(accountant, {
        xpPerCorrect: 2,
        xpPerAccuracyPoint: 8,
        zeroAttemptsXp: 0,
      }));
    },
    snapshot(): DragonRiderTraversalSnapshot {
      return Object.freeze({
        phase,
        attempts: accountant.totalAttempts,
        correctAnswers: accountant.correctAnswers,
        dragonCount,
        targetIndex: progression.currentIndex,
        elapsedMs,
        durationMs,
        ...(pendingGate ? { pendingGate: Object.freeze({ side: pendingGate.side, correct: pendingGate.correct }) } : {}),
        claimIds: Object.freeze(["DR-MECH-001", "DR-TRANS-001", "DR-TRANS-002", "DR-TRANS-003", "DR-TRANS-004"]),
        completionCount,
      });
    },
  });
}

/** Public-API Dragon Rider cartridge using only canonical selected semantic keys. */
export const DRAGON_RIDER_TRAVERSAL_CARTRIDGE: DragonRiderTraversalCartridge = Object.freeze({
  manifest: validateCartridgeManifest({
    schemaVersion: 1,
    id: "dragon-rider",
    title: "Dragon Rider",
    description: "Two-gate vocabulary flight and boss-resolution cartridge.",
    version: "0.1.0",
    runtimeApiVersion: DEVELOPER_KIT_API_VERSION,
    inputMode: "vocabulary",
    capabilities: [
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: getTraversalSelectedSemanticKeys("dragon-rider"),
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeDragonRiderInput,
  compose: composeDragonRider,
  createMechanic: createDragonRiderTraversalMechanic,
});
