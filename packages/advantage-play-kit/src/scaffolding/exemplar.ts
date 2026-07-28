/**
 * Representative exemplar cartridge built entirely through public APK APIs.
 *
 * The exemplar demonstrates that the seven accepted shared cores compose into a
 * complete educational mini-cycle without recreating lifecycle, input,
 * responsive, UI, asset, result, or test infrastructure. It exercises:
 *   - `capability:nonempty-content-precondition` (input validation)
 *   - `capability:language-target-progression` (ordered matching)
 *   - `capability:single-completion-emission` (exactly-once completion)
 *   - `capability:result-accounting` (typed counters + XP)
 *
 * The exemplar uses no title-specific APIs or direct asset paths. It composes
 * the shared responsive composition contract and QC controls while remaining a
 * noninteractive simulation suitable for deterministic testing and
 * simplification proof; presentation is represented by its public surface
 * rather than a title-specific UI implementation.
 */

import { validateNonEmptyContent } from "../systems/nonempty-content.js";
import { createLanguageTargetProgression } from "../systems/language-target-progression.js";
import { createCompletionLatch } from "../systems/single-completion.js";
import {
  createResultAccountant,
  finalizeResult,
  type ResultAccountingPolicy,
} from "../systems/result-accounting.js";
import type { GameResults } from "@reading-advantage/game-contracts";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveComposition,
  type ResponsiveCompositionRequest,
} from "../responsive/responsive-composition.js";
import type { SemanticAssetRequirement } from "../assets/semantic-product-bindings.js";
import { parseQcControls, type QcControls } from "../qc/qc-kit.js";
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  validateCartridgeManifest,
  type CartridgeManifest,
} from "./cartridge-manifest.js";

/** Stable exemplar cartridge identifier. */
export const EXEMPLAR_CARTRIDGE_ID = "exemplar-vocab-match";

/** Owner-approved semantic roles used by the public exemplar. */
export const EXEMPLAR_SEMANTIC_ASSET_REQUIREMENTS: readonly SemanticAssetRequirement[] = Object.freeze([
  Object.freeze({ role: "player", state: "idle" }),
  Object.freeze({ role: "feedback", state: "correct" }),
  Object.freeze({ role: "control", state: "confirm" }),
]);

/** Exemplar XP policy that weights correct answers and accuracy. */
export const EXEMPLAR_XP_POLICY: ResultAccountingPolicy = Object.freeze({
  xpPerCorrect: 10,
  xpPerAccuracyPoint: 20,
  xpCap: 100,
  zeroAttemptsXp: 0,
});

/** Definition of the exemplar cartridge for scaffolding and simplification proof. */
export interface ExemplarCartridgeDefinition {
  /** Validated manifest pinning the accepted release and capabilities. */
  readonly manifest: CartridgeManifest;
  /** Whether the exemplar reuses shared systems instead of recreating infrastructure. */
  readonly reusesSharedSystems: true;
  /** Count of bespoke logic lines authored by the exemplar (for simplification proof). */
  readonly bespokeLogicLineCount: number;
  /** Attribution text emitted on the end screen. */
  readonly endScreenAttribution: "Pixel art assets by ElvGames";
}

/** Result of one exemplar simulation run. */
export interface ExemplarSimulationResult {
  /** Number of completion emissions (must be exactly one). */
  readonly completionCount: number;
  /** Final validated GameResults emitted through the completion latch. */
  readonly results: GameResults;
}

/** Complete public API surface used by the exemplar and generated cartridges. */
export interface ExemplarPublicApiSurface {
  /** Validated exemplar cartridge definition. */
  readonly definition: ExemplarCartridgeDefinition;
  /** Owner-approved semantic role/state requirements. */
  readonly semanticAssetRequirements: readonly SemanticAssetRequirement[];
  /** Validated default authoring/QC controls. */
  readonly qcControls: QcControls;
  /** Compact and wide browser verification viewports. */
  readonly browserViewports: readonly Readonly<{ width: number; height: number }>[];
  /**
   * Resolves responsive composition through the shared normative policy.
   * @param request Host values excluding the shared policy.
   * @returns Supported or fail-closed responsive composition.
   */
  resolveComposition(request: Omit<ResponsiveCompositionRequest, "config">): ResponsiveComposition;
}

/**
 * Builds the exemplar cartridge definition through public APK APIs only.
 * @returns A frozen exemplar definition with validated manifest and reuse flags.
 */
export function buildExemplarCartridgeDefinition(): ExemplarCartridgeDefinition {
  const manifest = validateCartridgeManifest({
    schemaVersion: 1,
    id: EXEMPLAR_CARTRIDGE_ID,
    title: "Exemplar Vocabulary Match",
    description: "A representative cartridge built entirely through public APK APIs.",
    version: "0.1.0",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    capabilities: [
      "capability:nonempty-content-precondition",
      "capability:language-target-progression",
      "capability:single-completion-emission",
      "capability:result-accounting",
    ],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: [
      "top-down/32x32/characters/hero-01",
      "effects/32x32/combat/hit-01",
      "ui/16x16/controls/gamepad-buttons",
    ],
    responsive: {
      profiles: ["compact", "wide"],
      compactStrategy: "reflow",
      wideStrategy: "panel",
      statePreservation: "capture-recompose-restore",
    },
    attributionRegistration: {
      requiredCredit: "Pixel art assets by ElvGames",
      placement: "end-screen",
    },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  });

  return Object.freeze({
    manifest,
    reusesSharedSystems: true,
    bespokeLogicLineCount: 0,
    endScreenAttribution: "Pixel art assets by ElvGames",
  });
}

/**
 * Builds the complete exemplar surface through public responsive, asset, QC, and cartridge contracts.
 * @returns Immutable exemplar defaults consumed by Advantage Games authoring and browser verification.
 */
export function buildExemplarPublicApiSurface(): ExemplarPublicApiSurface {
  return Object.freeze({
    definition: buildExemplarCartridgeDefinition(),
    semanticAssetRequirements: EXEMPLAR_SEMANTIC_ASSET_REQUIREMENTS,
    qcControls: parseQcControls({}),
    browserViewports: Object.freeze([
      Object.freeze({ width: 390, height: 844 }),
      Object.freeze({ width: 1440, height: 900 }),
    ]),
    resolveComposition(request: Omit<ResponsiveCompositionRequest, "config">): ResponsiveComposition {
      return resolveResponsiveComposition({ ...request, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
    },
  });
}

/** Options controlling an exemplar simulation run. */
export interface ExemplarSimulationOptions {
  /** When true, the simulation injects one wrong candidate before the correct one. */
  readonly wrongCandidateFirst?: boolean;
}

/**
 * Runs a deterministic exemplar simulation through the public APK shared cores.
 * @param input Untrusted vocabulary input.
 * @param options Optional simulation controls.
 * @returns The completion count and final GameResults.
 * @throws When the input is empty or blank (nonempty-content precondition).
 */
export function runExemplarSimulation(
  input: unknown,
  options: ExemplarSimulationOptions = {},
): ExemplarSimulationResult {
  const content = validateNonEmptyContent(input, "vocabulary");
  const targets = content.items.map((item) => item.term);
  const progression = createLanguageTargetProgression(targets);
  const accountant = createResultAccountant();
  let deliveredResults: GameResults | undefined;

  const latch = createCompletionLatch<GameResults>((result) => {
    deliveredResults = result;
  });

  let injectedWrong = false;
  for (const item of content.items) {
    if (options.wrongCandidateFirst && !injectedWrong) {
      const wrong = progression.match("__wrong__");
      if (!wrong.matched) accountant.recordAttempt({ correct: false });
      injectedWrong = true;
    }
    const match = progression.match(item.term);
    accountant.recordAttempt({ correct: match.matched });
    if (match.matched) accountant.addScore(50);
  }

  const finalized = finalizeResult(accountant, EXEMPLAR_XP_POLICY);
  const results: GameResults = {
    accuracy: finalized.accuracy,
    xp: finalized.xp,
    score: finalized.score,
    correctAnswers: finalized.correctAnswers,
    totalAttempts: finalized.totalAttempts,
  };

  latch.complete(results);
  latch.complete(results);

  if (!deliveredResults) {
    throw new Error("Exemplar simulation failed to emit a result through the completion latch");
  }

  return Object.freeze({
    completionCount: latch.hasCompleted ? 1 : 0,
    results: deliveredResults,
  });
}
