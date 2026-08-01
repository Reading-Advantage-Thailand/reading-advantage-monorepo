import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import type { GameResults } from "@reading-advantage/game-contracts";

import { createPuzzleCartridgeScope, type PuzzleCartridgeScope } from "../puzzle-suitability.js";

const BASE_PATIENCE = 60;
const POTION_RUSH_CLAIM_IDS = Object.freeze([
  "PR-CUR-005",
  "PR-CUR-008",
  "PR-CUR-010",
  "PR-CUR-011",
  "PR-CUR-013",
  "PR-CUR-014",
]);

/** One source-bound cauldron slot and its customer relationship. */
export interface PotionRushCauldronSnapshot {
  /** Stable cauldron-to-customer slot identity. */
  readonly customerIndex: number;
  /** Source-derived cauldron lifecycle. */
  readonly status: "idle" | "brewing" | "warning" | "completed";
  /** Ordered words retained in the current brew. */
  readonly currentWords: readonly string[];
}

/** One waiting or leaving customer retained for patience proof. */
export interface PotionRushCustomerSnapshot {
  /** Stable queue slot used by the paired cauldron. */
  readonly customerIndex: number;
  /** Customer lifecycle from the source store. */
  readonly status: "waiting" | "leaving-angry" | "leaving-happy";
  /** Remaining source-bound patience in seconds. */
  readonly patience: number;
  /** Requested sentence retained by the customer. */
  readonly request: string;
}

/** Immutable cauldron, customer, and sentence-progress state for Potion Rush. */
export interface PotionRushPuzzleSnapshot {
  /** Current primary cauldron state retained for backwards-compatible inspection. */
  readonly status: "idle" | "brewing" | "warning" | "completed" | "served";
  /** Zero-based word offset in the primary cauldron. */
  readonly wordIndex: number;
  /** Number of fully served sentences. */
  readonly completedSentences: number;
  /** Explicit paired cauldron states. */
  readonly cauldrons: readonly PotionRushCauldronSnapshot[];
  /** Explicit customer patience and outcome states. */
  readonly customers: readonly PotionRushCustomerSnapshot[];
  /** Source-bound reputation remaining after any expired customer. */
  readonly reputation: number;
  /** Total customers that expired before service. */
  readonly angryCustomers: number;
  /** Score formed from remaining patience when serving a completed customer. */
  readonly score: number;
  /** Claim responsible for a notable transition, when one just occurred. */
  readonly claimId?: "PR-CUR-010" | "PR-CUR-011" | "PR-CUR-013";
  /** Exact source claims retained by the runtime. */
  readonly claimIds: readonly string[];
}

/** Deterministic Potion Rush session used for title-scoped proof and QC. */
export interface PotionRushPuzzleSession {
  /** Drops one ingredient into its source-bound cauldron and checks its exact ordered customer request. */
  drop(token: string, cauldronIndex?: number): PotionRushPuzzleSnapshot;
  /** Empties a warning or brewing cauldron and returns it to the source idle state. */
  dump(cauldronIndex?: number): PotionRushPuzzleSnapshot;
  /** Serves a completed cauldron to its matching customer and advances to the next deterministic request. */
  serve(cauldronIndex?: number): PotionRushPuzzleSnapshot;
  /** Advances waiting-customer patience in seconds and applies source-bound expiry consequences. */
  advancePatience(seconds: number): PotionRushPuzzleSnapshot;
  /** Normalizes a physical keyboard or pointer descriptor through the T11 public input API. */
  dispatchPhysicalInput(input: PhysicalInputDescriptor): readonly string[];
  /** Resolves a supported compact or wide QC composition. */
  resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition;
  /** Returns the current immutable source-bound state. */
  snapshot(): PotionRushPuzzleSnapshot;
  /** Returns the once-emitted result after every supplied sentence is served. */
  results(): GameResults;
}

/** Non-public Potion Rush candidate cartridge built only with T11 public APIs. */
export interface PotionRushPuzzleCartridge {
  /** T11-validated cartridge manifest with only the accepted title-selected semantic output. */
  readonly manifest: CartridgeManifest;
  /** Explicit no-catalog/no-host gate retained after Task 2 v2 owner acceptance. */
  readonly scope: PuzzleCartridgeScope;
  /** Screen-reader-ready concise instructions for the source-bound paired cauldron controls. */
  readonly accessibilityText: "Use keyboard arrows or a pointer drag to place each sentence word into the matching customer's cauldron in order.";
  /** Creates an ordered customer-and-cauldron session from validated sentence input. */
  createSession(input: unknown, complete?: (result: GameResults) => void): PotionRushPuzzleSession;
}

/** Resolves one supported T11 composition or fails closed for an unsupported viewport. */
function resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition {
  const composition = resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
  if (!composition.supported) throw new Error(`Potion Rush QC viewport is unsupported: ${composition.code}; ${composition.guidance}`);
  return composition;
}

/** Creates the title-specific T11 manifest without exposing a host or catalog loader. */
function createManifest(): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1, id: "potion-rush", title: "Potion Rush", description: "Source-bound paired cauldron and customer cartridge registered for Advantage Games QC only.", version: "0.1.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "sentence",
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: ["ui/16x16/controls/gamepad-buttons"],
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" },
  });
}

/** Builds one immutable snapshot from the mutable deterministic source-shaped session state. */
function createSnapshot(
  status: PotionRushPuzzleSnapshot["status"],
  cauldronStatus: PotionRushCauldronSnapshot["status"],
  currentWords: readonly string[],
  customer: PotionRushCustomerSnapshot,
  completedSentences: number,
  reputation: number,
  angryCustomers: number,
  score: number,
  claimId?: PotionRushPuzzleSnapshot["claimId"],
): PotionRushPuzzleSnapshot {
  return Object.freeze({
    status,
    wordIndex: currentWords.length,
    completedSentences,
    cauldrons: Object.freeze([
      Object.freeze({ customerIndex: 0, status: cauldronStatus, currentWords: Object.freeze([...currentWords]) }),
    ]),
    customers: Object.freeze([Object.freeze({ ...customer })]),
    reputation,
    angryCustomers,
    score,
    ...(claimId ? { claimId } : {}),
    claimIds: POTION_RUSH_CLAIM_IDS,
  });
}

/** Returns case-insensitive source word tokens without admitting blank sentence items. */
function wordsFor(sentence: string): readonly string[] {
  const words = sentence.split(/\s+/u).filter(Boolean);
  if (words.length === 0) throw new Error("Potion Rush sentence must contain at least one word");
  return words;
}

/**
 * Builds the Potion Rush candidate cartridge without exposing it through a catalog or host.
 * @returns A title-specific candidate cartridge and its non-playable scope.
 */
export function buildPotionRushPuzzleCartridge(): PotionRushPuzzleCartridge {
  return Object.freeze({
    manifest: createManifest(),
    scope: createPuzzleCartridgeScope("potion-rush"),
    accessibilityText: "Use keyboard arrows or a pointer drag to place each sentence word into the matching customer's cauldron in order.",
    createSession(input: unknown, complete?: (result: GameResults) => void): PotionRushPuzzleSession {
      const content = validateNonEmptyContent(input, "sentence").items;
      const accountant = createResultAccountant();
      const normalizeInput = createInputActionNormalizer({ keyboard: { KeyA: "move-left", KeyD: "move-right" }, pointerDrag: { leftAction: "move-left", rightAction: "move-right", threshold: 12 } });
      let sentenceIndex = 0;
      let cauldronStatus: PotionRushCauldronSnapshot["status"] = "idle";
      let currentWords: string[] = [];
      let customer: PotionRushCustomerSnapshot = Object.freeze({ customerIndex: 0, status: "waiting", patience: BASE_PATIENCE, request: content[0]!.term });
      let completedSentences = 0;
      let reputation = 100;
      let angryCustomers = 0;
      let score = 0;
      let lastClaimId: PotionRushPuzzleSnapshot["claimId"];
      let served = false;
      let delivered: GameResults | undefined;
      const latch = createCompletionLatch<GameResults>((result) => { delivered = result; complete?.(result); });
      const terminalStatus = (): PotionRushPuzzleSnapshot["status"] => served ? "served" : cauldronStatus;
      const snapshot = (): PotionRushPuzzleSnapshot => createSnapshot(
        terminalStatus(),
        cauldronStatus,
        currentWords,
        customer,
        completedSentences,
        reputation,
        angryCustomers,
        score,
        lastClaimId,
      );
      const resetForNextCustomer = (): void => {
        cauldronStatus = "idle";
        currentWords = [];
        if (sentenceIndex < content.length) {
          customer = Object.freeze({
            customerIndex: 0,
            status: "waiting",
            patience: BASE_PATIENCE * Math.pow(0.9, completedSentences),
            request: content[sentenceIndex]!.term,
          });
        }
      };
      const emitSourceResult = (): void => {
        const final = finalizeResult(accountant, { xpPerCorrect: 0, xpPerAccuracyPoint: 0, xpCap: 10, zeroAttemptsXp: 0 });
        const customerAccuracy = angryCustomers === 0 ? 1 : Math.max(0, 1 - angryCustomers / (completedSentences + angryCustomers));
        const xp = Math.min(
          10,
          Math.min(5, completedSentences)
            + (customerAccuracy === 1 ? 2 : customerAccuracy >= 0.7 ? 1 : 0)
            + (reputation >= 50 ? 1 : 0)
            + 1
            + (completedSentences >= 3 ? 1 : 0),
        );
        latch.complete({ accuracy: final.accuracy, xp, score: final.score, correctAnswers: final.correctAnswers, totalAttempts: final.totalAttempts });
      };
      return Object.freeze({
        drop(token: string, cauldronIndex = 0): PotionRushPuzzleSnapshot {
          if (cauldronIndex !== 0 || served || customer.status !== "waiting" || cauldronStatus === "completed") return snapshot();
          const expectedWords = wordsFor(customer.request);
          const expected = expectedWords[currentWords.length];
          const correct = expected?.toLocaleLowerCase() === token.toLocaleLowerCase();
          accountant.recordAttempt({ correct });
          if (cauldronStatus === "idle") {
            if (correct) {
              currentWords = [token];
              cauldronStatus = expectedWords.length === 1 ? "completed" : "brewing";
            } else {
              currentWords = [token];
              cauldronStatus = "warning";
            }
          } else if (cauldronStatus === "brewing") {
            if (correct) {
              currentWords = [...currentWords, token];
              cauldronStatus = currentWords.length === expectedWords.length ? "completed" : "brewing";
            } else {
              cauldronStatus = "warning";
            }
          }
          lastClaimId = "PR-CUR-011";
          return snapshot();
        },
        dump(cauldronIndex = 0): PotionRushPuzzleSnapshot {
          if (cauldronIndex !== 0 || served) return snapshot();
          cauldronStatus = "idle";
          currentWords = [];
          lastClaimId = "PR-CUR-011";
          return snapshot();
        },
        serve(cauldronIndex = 0): PotionRushPuzzleSnapshot {
          if (cauldronIndex !== 0 || served || cauldronStatus !== "completed" || customer.status !== "waiting") return snapshot();
          const servedPatience = Math.floor(customer.patience);
          score += servedPatience;
          accountant.addScore(servedPatience);
          customer = Object.freeze({ ...customer, status: "leaving-happy" });
          completedSentences += 1;
          sentenceIndex += 1;
          lastClaimId = "PR-CUR-013";
          if (sentenceIndex === content.length) {
            served = true;
            emitSourceResult();
          } else {
            resetForNextCustomer();
          }
          return snapshot();
        },
        advancePatience(seconds: number): PotionRushPuzzleSnapshot {
          if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Potion Rush patience advancement must be a nonnegative finite number");
          if (served || customer.status !== "waiting") return snapshot();
          const patience = Math.max(0, customer.patience - seconds);
          if (patience === 0) {
            customer = Object.freeze({ ...customer, patience, status: "leaving-angry" });
            reputation = Math.max(0, reputation - 25);
            angryCustomers += 1;
            cauldronStatus = "idle";
            currentWords = [];
            lastClaimId = "PR-CUR-010";
          } else {
            customer = Object.freeze({ ...customer, patience });
          }
          return snapshot();
        },
        dispatchPhysicalInput: (physical: PhysicalInputDescriptor) => Object.freeze(normalizeInput(physical).map(({ action }) => action)),
        resolveQcComposition,
        snapshot,
        results(): GameResults {
          if (!delivered) throw new Error("Potion Rush has not reached a terminal result");
          return delivered;
        },
      });
    },
  });
}
