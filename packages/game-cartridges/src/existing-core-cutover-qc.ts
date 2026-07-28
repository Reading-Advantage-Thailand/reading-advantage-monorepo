import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  OWNER_APPROVED_CANONICAL_BINDINGS,
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
  createResultAccountant,
  finalizeResult,
} from "@reading-advantage/advantage-play-kit/systems";
import type { GameResults } from "@reading-advantage/game-contracts";
import { z } from "zod";

import {
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES,
  assertCandidateNotConsumable,
  assertCandidateRoleStatesOwnerApproved,
  type CandidateInputMode,
  type CandidateTemporalScope,
  type ExistingCoreSemanticAdoptionCandidate,
} from "./existing-core-cutover-semantic-candidates.js";

/** SHA-256 of the active task-3 semantic-adoption receipt authorized for Task 4 QC. */
export const ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256 =
  "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240" as const;

const QC_IDS = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const;

const qcIdSchema = z.enum(QC_IDS);
const evidenceActionSchema = z.enum([
  "select-incorrect-gate",
  "select-correct-gate",
  "enter-non-running-state",
  "submit-correct-translation",
  "submit-incorrect-translation",
  "end-game",
  "collide-next-prisoner",
  "collide-out-of-order-prisoner",
  "enter-portal-before-all-words",
  "advance-next-level",
  "select-nonadjacent-node",
  "select-legal-wrong-node",
  "select-legal-correct-node",
  "emit-completion",
  "hit-inactive-target",
  "hit-wrong-visible-token",
  "hit-correct-stable-target",
]);
const inputModalitySchema = z.enum(["keyboard", "pointer", "touch"]);
const inputIntentSchema = z.enum(["primary", "secondary"]);
const viewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

const evidenceActionsById = Object.freeze({
  "dragon-flight": Object.freeze(["select-incorrect-gate", "select-correct-gate", "enter-non-running-state"]),
  "magic-defense": Object.freeze(["submit-correct-translation", "submit-incorrect-translation", "end-game"]),
  "dungeon-liberator": Object.freeze(["collide-next-prisoner", "collide-out-of-order-prisoner", "enter-portal-before-all-words", "advance-next-level"]),
  "sorcerer-ziggurat": Object.freeze(["select-nonadjacent-node", "select-legal-wrong-node", "select-legal-correct-node", "emit-completion"]),
  "astral-mage": Object.freeze(["hit-inactive-target", "hit-wrong-visible-token", "hit-correct-stable-target"]),
} as const);

function parseTitleEvidenceAction(
  id: typeof QC_IDS[number],
  action: z.infer<typeof evidenceActionSchema>,
): z.infer<typeof evidenceActionSchema> {
  const parsed = evidenceActionSchema.parse(action);
  if (!(evidenceActionsById[id] as readonly string[]).includes(parsed)) {
    throw new Error(`Evidence action ${parsed} is not accepted for ${id}`);
  }
  return parsed;
}

/** Stable identifier for one Task 4 QC-only cartridge. */
export type ExistingCoreQcId = z.infer<typeof qcIdSchema>;

/** Supported real-input modality in the Advantage Games QC adapter. */
export type ExistingCoreQcInputModality = z.infer<typeof inputModalitySchema>;

/** Semantic positive or negative intent supplied to a deterministic mechanic. */
export type ExistingCoreQcInputIntent = z.infer<typeof inputIntentSchema>;

/** Accepted evidence action exposed by a title-specific deterministic mechanic. */
export type ExistingCoreEvidenceAction = z.infer<typeof evidenceActionSchema>;

/** Snapshot fields limited to accepted title-specific mechanic invariants. */
export interface ExistingCoreMechanicSnapshot {
  readonly status?: string;
  readonly phase?: string;
  readonly attempts?: number;
  readonly correctAnswers?: number;
  readonly dragonCount?: number;
  readonly score?: number;
  readonly mana?: number;
  readonly combo?: number;
  readonly castleHp?: Readonly<Record<string, number>>;
  readonly trailLength?: number;
  readonly fleeingPrisoners?: number;
  readonly lives?: number;
  readonly level?: number;
  readonly targetIndex?: number;
  readonly monsterCount?: number;
  readonly currentNodeId?: string;
  readonly litNodeCount?: number;
  readonly expectedTokenIndex?: number;
  readonly activeTargetCount?: number;
  readonly progress?: number;
  readonly completions?: number;
}

/** Deterministic test adapter for accepted per-title mechanic facts. */
export interface ExistingCoreEvidenceMechanic {
  /**
   * Applies one evidence-named action.
   * @param action Accepted action name from the title's evidence fixture.
   */
  applyEvidenceAction(action: ExistingCoreEvidenceAction): void;
  /** @returns An immutable snapshot of the accepted mechanic fields. */
  snapshot(): ExistingCoreMechanicSnapshot;
}

/** Registry metadata that never enters the production cartridge catalog. */
export interface ExistingCoreQcRegistryEntry {
  readonly id: ExistingCoreQcId;
  readonly title: string;
  readonly inputMode: CandidateInputMode;
  readonly temporalScope: CandidateTemporalScope;
  readonly registration: "advantage-games-qc-only";
}

/** T11 manifest additions required by the explicit Task 4 QC adapter. */
export interface ExistingCoreQcManifest extends CartridgeManifest {
  readonly developerKitApiVersion: typeof DEVELOPER_KIT_API_VERSION;
  readonly resultAbi: readonly ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"];
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
}

/** Immutable state exposed by one QC session. */
export interface ExistingCoreQcSessionSnapshot {
  readonly mechanic: ExistingCoreMechanicSnapshot;
  readonly inputCounts: Readonly<Record<ExistingCoreQcInputModality, number>>;
  readonly completionCount: number;
  readonly profile?: "compact" | "wide";
}

/** In-memory QC session that keeps mechanic state independent from responsive reflow. */
export interface ExistingCoreQcSession {
  /**
   * Dispatches a semantic intent from a validated real-input modality.
   * @param modality Keyboard, pointer, or touch.
   * @param intent Positive or negative title-specific intent.
   */
  dispatch(modality: ExistingCoreQcInputModality, intent: ExistingCoreQcInputIntent): void;
  /**
   * Resolves a T11 compact or wide composition without replacing mechanic state.
   * @param viewport Positive integer viewport geometry.
   * @returns The supported or fail-closed T11 composition.
   */
  resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Emits the current QC result through the T11 at-most-once completion latch. */
  completeProof(): void;
  /** @returns The latest immutable mechanic, input, completion, and profile state. */
  snapshot(): ExistingCoreQcSessionSnapshot;
}

/** QC-only cartridge loaded outside all public production catalog surfaces. */
export interface ExistingCoreQcCartridge {
  readonly manifest: ExistingCoreQcManifest;
  readonly semanticAdoption: Readonly<{
    status: "accepted-for-task4-qc";
    receiptSha256: typeof ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256;
    temporalScope: CandidateTemporalScope;
    selectedStandardPackOutput: readonly string[];
  }>;
  readonly taskScope: Readonly<{
    registration: "advantage-games-qc-only";
    consumable: false;
    productionCatalogExposed: false;
    readingIntegration: false;
    primaryIntegration: false;
    retirementComplete: false;
  }>;
  /** @returns A fresh deterministic title-specific evidence mechanic. */
  createDeterministicMechanic(): ExistingCoreEvidenceMechanic;
  /**
   * Creates one stateful QC session.
   * @param complete Optional observer for the single validated QC result.
   * @returns A fresh in-memory QC session.
   */
  createQcSession(complete?: (result: GameResults) => void): ExistingCoreQcSession;
}

/** Dynamic loader used only by the explicit Advantage Games QC registry. */
export type ExistingCoreQcLoader = () => Promise<ExistingCoreQcCartridge>;

function createDragonFlightMechanic(): ExistingCoreEvidenceMechanic {
  let state: ExistingCoreMechanicSnapshot = {
    status: "running",
    attempts: 0,
    correctAnswers: 0,
    dragonCount: 1,
  };
  return Object.freeze({
    applyEvidenceAction(action: ExistingCoreEvidenceAction): void {
      const parsed = parseTitleEvidenceAction("dragon-flight", action);
      if (state.status !== "running") return;
      if (parsed === "enter-non-running-state") {
        state = { ...state, status: "boss" };
      } else if (parsed === "select-correct-gate") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          correctAnswers: state.correctAnswers! + 1,
          dragonCount: state.dragonCount! + 1,
        };
      } else if (parsed === "select-incorrect-gate") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          dragonCount: Math.max(1, state.dragonCount! - 1),
        };
      }
    },
    snapshot: () => Object.freeze({ ...state }),
  });
}

function createMagicDefenseMechanic(): ExistingCoreEvidenceMechanic {
  let state: ExistingCoreMechanicSnapshot = {
    status: "running",
    attempts: 0,
    score: 0,
    mana: 0,
    combo: 0,
    castleHp: Object.freeze({ left: 3, center: 3, right: 3 }),
  };
  return Object.freeze({
    applyEvidenceAction(action: ExistingCoreEvidenceAction): void {
      const parsed = parseTitleEvidenceAction("magic-defense", action);
      if (parsed === "submit-correct-translation") {
        state = {
          ...state,
          score: state.score! + 10,
          mana: state.mana! + 10,
          combo: state.combo! + 1,
        };
      } else if (parsed === "submit-incorrect-translation") {
        state = { ...state, attempts: state.attempts! + 1, combo: 0 };
      } else if (parsed === "end-game") {
        state = { ...state, status: "game-over" };
      }
    },
    snapshot: () => Object.freeze({ ...state }),
  });
}

function createDungeonLiberatorMechanic(): ExistingCoreEvidenceMechanic {
  let state: ExistingCoreMechanicSnapshot = {
    phase: "playing",
    attempts: 0,
    trailLength: 0,
    fleeingPrisoners: 0,
    lives: 3,
    level: 1,
    targetIndex: 0,
    monsterCount: 0,
  };
  return Object.freeze({
    applyEvidenceAction(action: ExistingCoreEvidenceAction): void {
      const parsed = parseTitleEvidenceAction("dungeon-liberator", action);
      if (parsed === "collide-next-prisoner") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          trailLength: state.trailLength! + 1,
          targetIndex: state.targetIndex! + 1,
        };
      } else if (parsed === "collide-out-of-order-prisoner") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          trailLength: 0,
          targetIndex: 0,
          fleeingPrisoners: state.fleeingPrisoners! + 1,
        };
      } else if (parsed === "advance-next-level") {
        state = {
          ...state,
          phase: "playing",
          level: state.level! + 1,
          trailLength: 0,
          targetIndex: 0,
          monsterCount: state.monsterCount! + 1,
        };
      }
    },
    snapshot: () => Object.freeze({ ...state }),
  });
}

function createSorcererZigguratMechanic(): ExistingCoreEvidenceMechanic {
  let state: ExistingCoreMechanicSnapshot = {
    attempts: 0,
    correctAnswers: 0,
    score: 0,
    currentNodeId: "ziggurat-origin",
    litNodeCount: 0,
    expectedTokenIndex: 0,
    completions: 0,
  };
  return Object.freeze({
    applyEvidenceAction(action: ExistingCoreEvidenceAction): void {
      const parsed = parseTitleEvidenceAction("sorcerer-ziggurat", action);
      if (parsed === "select-legal-wrong-node") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          score: state.score! - 25,
        };
      } else if (parsed === "select-legal-correct-node") {
        const nextIndex = state.expectedTokenIndex! + 1;
        state = {
          ...state,
          attempts: state.attempts! + 1,
          correctAnswers: state.correctAnswers! + 1,
          score: state.score! + 100,
          currentNodeId: `ziggurat-node-${nextIndex}`,
          litNodeCount: state.litNodeCount! + 1,
          expectedTokenIndex: nextIndex,
        };
      } else if (parsed === "emit-completion" && state.completions === 0) {
        state = { ...state, completions: 1 };
      }
    },
    snapshot: () => Object.freeze({ ...state }),
  });
}

function createAstralMageMechanic(): ExistingCoreEvidenceMechanic {
  let state: ExistingCoreMechanicSnapshot = {
    attempts: 0,
    correctAnswers: 0,
    score: 0,
    progress: 0,
    activeTargetCount: 3,
  };
  return Object.freeze({
    applyEvidenceAction(action: ExistingCoreEvidenceAction): void {
      const parsed = parseTitleEvidenceAction("astral-mage", action);
      if (parsed === "hit-wrong-visible-token") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          score: Math.max(0, state.score! - 25),
        };
      } else if (parsed === "hit-correct-stable-target") {
        state = {
          ...state,
          attempts: state.attempts! + 1,
          correctAnswers: state.correctAnswers! + 1,
          score: state.score! + 100,
          progress: state.progress! + 1,
          activeTargetCount: Math.max(0, state.activeTargetCount! - 1),
        };
      }
    },
    snapshot: () => Object.freeze({ ...state }),
  });
}

const mechanicFactories: Readonly<Record<ExistingCoreQcId, () => ExistingCoreEvidenceMechanic>> = Object.freeze({
  "dragon-flight": createDragonFlightMechanic,
  "magic-defense": createMagicDefenseMechanic,
  "dungeon-liberator": createDungeonLiberatorMechanic,
  "sorcerer-ziggurat": createSorcererZigguratMechanic,
  "astral-mage": createAstralMageMechanic,
});

const evidenceActions: Readonly<Record<ExistingCoreQcId, Readonly<Record<ExistingCoreQcInputIntent, ExistingCoreEvidenceAction>>>> = Object.freeze({
  "dragon-flight": Object.freeze({ primary: "select-correct-gate", secondary: "select-incorrect-gate" }),
  "magic-defense": Object.freeze({ primary: "submit-correct-translation", secondary: "submit-incorrect-translation" }),
  "dungeon-liberator": Object.freeze({ primary: "collide-next-prisoner", secondary: "collide-out-of-order-prisoner" }),
  "sorcerer-ziggurat": Object.freeze({ primary: "select-legal-correct-node", secondary: "select-legal-wrong-node" }),
  "astral-mage": Object.freeze({ primary: "hit-correct-stable-target", secondary: "hit-wrong-visible-token" }),
});

function selectedSemanticKeys(candidate: ExistingCoreSemanticAdoptionCandidate): readonly string[] {
  assertCandidateNotConsumable(candidate);
  assertCandidateRoleStatesOwnerApproved(candidate);
  const keyByIdentity = new Map(
    OWNER_APPROVED_CANONICAL_BINDINGS.bindings.map((binding) => [
      `${binding.role}:${binding.state}`,
      binding.semanticKey,
    ]),
  );
  const keys = candidate.roleStateRequirements.map((requirement) => {
    const key = keyByIdentity.get(`${requirement.role}:${requirement.state}`);
    if (!key) throw new Error(`Accepted QC role/state lost its T11 binding for ${candidate.publicId}`);
    return key;
  });
  return Object.freeze([...new Set(keys)].sort((left, right) => left.localeCompare(right)));
}

function createManifest(
  candidate: ExistingCoreSemanticAdoptionCandidate,
  semanticAssetRequirements: readonly string[],
): ExistingCoreQcManifest {
  const manifest = validateCartridgeManifest({
    schemaVersion: 1,
    id: candidate.publicId,
    title: candidate.title,
    description: `Evidence-bounded ${candidate.title} mechanic adapter for Advantage Games QC only.`,
    version: "0.1.0",
    runtimeApiVersion: "1.0.0",
    inputMode: candidate.inputMode,
    capabilities: [
      "capability:input-action-normalization",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements,
    responsive: {
      profiles: ["compact", "wide"],
      compactStrategy: "reflow",
      wideStrategy: "panel",
      statePreservation: "capture-recompose-restore",
    },
    attributionRegistration: {
      requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
      placement: "end-screen",
    },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  });
  return Object.freeze({
    ...manifest,
    developerKitApiVersion: DEVELOPER_KIT_API_VERSION,
    resultAbi: Object.freeze(["accuracy", "xp", "score", "correctAnswers", "totalAttempts"] as const),
    inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true } as const),
  });
}

function createQcSession(
  id: ExistingCoreQcId,
  mechanicFactory: () => ExistingCoreEvidenceMechanic,
  complete?: (result: GameResults) => void,
): ExistingCoreQcSession {
  const mechanic = mechanicFactory();
  const accountant = createResultAccountant();
  const inputCounts: Record<ExistingCoreQcInputModality, number> = {
    keyboard: 0,
    pointer: 0,
    touch: 0,
  };
  let completionCount = 0;
  let profile: "compact" | "wide" | undefined;
  const completion = createCompletionLatch<GameResults>((result) => {
    completionCount += 1;
    complete?.(result);
  });
  return Object.freeze({
    dispatch(modality: ExistingCoreQcInputModality, intent: ExistingCoreQcInputIntent): void {
      const parsedModality = inputModalitySchema.parse(modality);
      const parsedIntent = inputIntentSchema.parse(intent);
      inputCounts[parsedModality] += 1;
      mechanic.applyEvidenceAction(evidenceActions[id][parsedIntent]);
      accountant.recordAttempt({ correct: parsedIntent === "primary" });
      if (parsedIntent === "primary") accountant.addScore(100);
    },
    resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
      const parsed = viewportSchema.parse(viewport);
      const composition = resolveResponsiveComposition({
        viewport: parsed,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
        inputCapabilities: { touch: true, pointer: true, keyboard: true },
        accessibility: { textScale: 1, touchScale: 1 },
        ...(profile ? { previousProfile: profile } : {}),
        config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
      });
      if (composition.supported) profile = composition.profile;
      return composition;
    },
    completeProof(): void {
      const result = finalizeResult(accountant, {
        xpPerCorrect: 10,
        xpPerAccuracyPoint: 10,
        zeroAttemptsXp: 0,
      });
      completion.complete(result);
    },
    snapshot(): ExistingCoreQcSessionSnapshot {
      return Object.freeze({
        mechanic: mechanic.snapshot(),
        inputCounts: Object.freeze({ ...inputCounts }),
        completionCount,
        ...(profile ? { profile } : {}),
      });
    },
  });
}

function createQcCartridge(candidate: ExistingCoreSemanticAdoptionCandidate): ExistingCoreQcCartridge {
  const id = qcIdSchema.parse(candidate.publicId);
  const selectedStandardPackOutput = selectedSemanticKeys(candidate);
  const mechanicFactory = mechanicFactories[id];
  return Object.freeze({
    manifest: createManifest(candidate, selectedStandardPackOutput),
    semanticAdoption: Object.freeze({
      status: "accepted-for-task4-qc" as const,
      receiptSha256: ACCEPTED_EXISTING_CORE_SEMANTIC_RECEIPT_SHA256,
      temporalScope: candidate.evidenceTemporalScope,
      selectedStandardPackOutput,
    }),
    taskScope: Object.freeze({
      registration: "advantage-games-qc-only" as const,
      consumable: false as const,
      productionCatalogExposed: false as const,
      readingIntegration: false as const,
      primaryIntegration: false as const,
      retirementComplete: false as const,
    }),
    createDeterministicMechanic: mechanicFactory,
    createQcSession: (complete?: (result: GameResults) => void) =>
      createQcSession(id, mechanicFactory, complete),
  });
}

const candidatesById = new Map(
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]),
);

/** Exact five-title registry available only through the package's explicit QC subpath. */
export const EXISTING_CORE_QC_REGISTRY: readonly ExistingCoreQcRegistryEntry[] = Object.freeze(
  QC_IDS.map((id) => {
    const candidate = candidatesById.get(id);
    if (!candidate) throw new Error(`Accepted Task 4 QC candidate is missing for ${id}`);
    return Object.freeze({
      id,
      title: candidate.title,
      inputMode: candidate.inputMode,
      temporalScope: candidate.evidenceTemporalScope,
      registration: "advantage-games-qc-only" as const,
    });
  }),
);

/** Five QC-only dynamic loaders, deliberately separate from production cartridge loaders. */
export const EXISTING_CORE_QC_LOADERS: Readonly<Record<ExistingCoreQcId, ExistingCoreQcLoader>> = Object.freeze(
  Object.fromEntries(QC_IDS.map((id) => [
    id,
    async () => {
      const candidate = candidatesById.get(id);
      if (!candidate) throw new Error(`Accepted Task 4 QC candidate is missing for ${id}`);
      return createQcCartridge(candidate);
    },
  ])) as Record<ExistingCoreQcId, ExistingCoreQcLoader>,
);

/**
 * Looks up one explicit QC registry entry without consulting the production catalog.
 * @param cartridgeId Untrusted cartridge identifier.
 * @returns The matching QC registration, or undefined for an unknown identifier.
 */
export function getExistingCoreQcRegistryEntry(cartridgeId: string): ExistingCoreQcRegistryEntry | undefined {
  const parsed = qcIdSchema.safeParse(cartridgeId);
  if (!parsed.success) return undefined;
  return EXISTING_CORE_QC_REGISTRY.find((entry) => entry.id === parsed.data);
}

/**
 * Loads one accepted title adapter strictly for Advantage Games QC.
 * @param cartridgeId Untrusted QC cartridge identifier.
 * @returns The isolated non-consumable QC cartridge.
 * @throws When the identifier is outside the accepted five-title Task 4 registry.
 */
export async function loadExistingCoreQcCartridge(cartridgeId: string): Promise<ExistingCoreQcCartridge> {
  const id = qcIdSchema.parse(cartridgeId);
  return EXISTING_CORE_QC_LOADERS[id]();
}
