import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import type { AssetContractV2SemanticSelection } from "@reading-advantage/advantage-play-kit/assets";

import {
  DRAGON_RIDER_TRAVERSAL_CARTRIDGE,
  createDragonRiderTraversalMechanic,
} from "./dragon-rider-cartridge.js";
import {
  GRIFFIN_RIDERS_ESCAPE_TRAVERSAL_CARTRIDGE,
  createGriffinRidersEscapeTraversalMechanic,
} from "./griffin-riders-escape-cartridge.js";
import {
  LABYRINTH_GOBLIN_KING_TRAVERSAL_CARTRIDGE,
  createLabyrinthGoblinKingTraversalMechanic,
} from "./labyrinth-goblin-king-cartridge.js";
import {
  SHADOW_GATE_DUNGEON_TRAVERSAL_CARTRIDGE,
  createShadowGateDungeonTraversalMechanic,
} from "./shadow-gate-dungeon-cartridge.js";
import {
  SPELLWEAVERS_RUN_TRAVERSAL_CARTRIDGE,
  createSpellweaversRunTraversalMechanic,
} from "./spellweavers-run-cartridge.js";
import {
  TRAVERSAL_TITLE_IDS,
  getTraversalSelectedSemanticKeys,
  type TraversalTitleId,
} from "./traversal-suitability.js";

const traversalQcIdSchema = new Set<string>(TRAVERSAL_TITLE_IDS);
const QC_CONTENT = Object.freeze([
  Object.freeze({ term: "moon path", translation: "เส้นทางดวงจันทร์" }),
  Object.freeze({ term: "silver gate", translation: "ประตูเงิน" }),
]);

/** A physical input modality observed by the isolated traversal QC canvas. */
export type LegacyTraversalQcInputModality = "keyboard" | "pointer" | "touch";

/** A bounded input intent emitted by the isolated traversal QC canvas. */
export type LegacyTraversalQcInputIntent = "left" | "right" | "up" | "down" | "primary";

/** One title exposed exclusively through the Advantage Games QC registry. */
export interface LegacyTraversalQcRegistryEntry {
  /** Stable title identifier. */
  readonly id: TraversalTitleId;
  /** User-facing title. */
  readonly title: string;
  /** Explicit route and host boundary. */
  readonly registration: "advantage-games-qc-only";
}

/** A resolver-issued v2 descriptor union associated with one exact traversal title. */
export interface LegacyTraversalQcSelectedUnion extends AssetContractV2SemanticSelection {
  /** Title that owns the selected semantic union. */
  readonly id: TraversalTitleId;
}

/** The state exposed by a local QC session without a production completion callback. */
export interface LegacyTraversalQcSessionSnapshot {
  /** Title-specific source-bound mechanic snapshot. */
  readonly mechanic: Readonly<Record<string, unknown>>;
  /** Browser-native input counts by modality. */
  readonly inputCounts: Readonly<Record<LegacyTraversalQcInputModality, number>>;
  /** Local mechanic completions never escape to a host persistence callback. */
  readonly hostCompletionEmissions: 0;
  /** Last responsive composition profile. */
  readonly profile?: "compact" | "wide";
}

/** An isolated native-input session used only by the `/qc` client component. */
export interface LegacyTraversalQcSession {
  /**
   * Applies one native input after it was captured by the QC canvas.
   * @param modality Native browser input modality.
   * @param intent Bounded direction or primary action.
   */
  dispatch(modality: LegacyTraversalQcInputModality, intent: LegacyTraversalQcInputIntent): void;
  /**
   * Recomposes the inspection canvas without recreating mechanic state.
   * @param viewport Browser viewport to inspect.
   * @returns The public responsive composition.
   */
  resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Returns immutable local input and mechanic evidence. */
  snapshot(): LegacyTraversalQcSessionSnapshot;
}

/** A traversal title adapter that is not part of any product catalog or host registry. */
export interface LegacyTraversalQcCartridge {
  /** T11-compatible manifest whose QC route is `/qc`. */
  readonly manifest: Readonly<{ id: TraversalTitleId; title: string; qcRegistration: Readonly<{ route: "/qc" }> }>;
  /** Resolver-issued selected union for this exact title only. */
  readonly descriptorSelection: LegacyTraversalQcSelectedUnion;
  /** Non-production lifecycle guard. */
  readonly taskScope: Readonly<{
    registration: "advantage-games-qc-only";
    productionCatalogExposed: false;
    readingIntegration: false;
    primaryIntegration: false;
    completionPersistence: false;
  }>;
  /** Creates a fresh local native-input session. */
  createQcSession(): LegacyTraversalQcSession;
}

const cartridgeById = Object.freeze({
  "dragon-rider": DRAGON_RIDER_TRAVERSAL_CARTRIDGE,
  "spellweavers-run": SPELLWEAVERS_RUN_TRAVERSAL_CARTRIDGE,
  "shadow-gate-dungeon": SHADOW_GATE_DUNGEON_TRAVERSAL_CARTRIDGE,
  "labyrinth-goblin-king": LABYRINTH_GOBLIN_KING_TRAVERSAL_CARTRIDGE,
  "griffin-riders-escape": GRIFFIN_RIDERS_ESCAPE_TRAVERSAL_CARTRIDGE,
} as const);

/** The only registry of legacy traversal titles, deliberately scoped to Advantage Games QC. */
export const LEGACY_TRAVERSAL_QC_REGISTRY: readonly LegacyTraversalQcRegistryEntry[] = Object.freeze(
  TRAVERSAL_TITLE_IDS.map((id) => Object.freeze({
    id,
    title: cartridgeById[id].manifest.title,
    registration: "advantage-games-qc-only" as const,
  })),
);

/** Validates a server-issued union without exposing source or physical asset paths. */
function assertSelection(id: TraversalTitleId, selection: LegacyTraversalQcSelectedUnion): void {
  const expectedKeys = getTraversalSelectedSemanticKeys(id);
  if (
    selection.materialization !== "accepted-cartridge-selected-union-only"
    || selection.semanticKeys.length !== expectedKeys.length
    || selection.semanticKeys.some((key, index) => key !== expectedKeys[index])
    || selection.registrations.length !== expectedKeys.length
  ) {
    throw new Error(`Traversal QC selection is not the accepted v2 selected union for ${id}`);
  }
  if (/\b(?:path|legacy|apps\/)\b/iu.test(JSON.stringify(selection.registrations))) {
    throw new Error(`Traversal QC rejects a path-bearing descriptor registration for ${id}`);
  }
}

/** Creates an isolated source-bound mechanic and maps QC native intents to its cited actions. */
function createQcSession(id: TraversalTitleId): LegacyTraversalQcSession {
  const inputCounts: Record<LegacyTraversalQcInputModality, number> = { keyboard: 0, pointer: 0, touch: 0 };
  let profile: "compact" | "wide" | undefined;

  const dragon = id === "dragon-rider" ? createDragonRiderTraversalMechanic(QC_CONTENT) : undefined;
  const spellweaver = id === "spellweavers-run" ? createSpellweaversRunTraversalMechanic(QC_CONTENT) : undefined;
  const shadow = id === "shadow-gate-dungeon" ? createShadowGateDungeonTraversalMechanic(QC_CONTENT) : undefined;
  const labyrinth = id === "labyrinth-goblin-king" ? createLabyrinthGoblinKingTraversalMechanic(QC_CONTENT) : undefined;
  const griffin = id === "griffin-riders-escape" ? createGriffinRidersEscapeTraversalMechanic(QC_CONTENT) : undefined;

  const dispatch = (modality: LegacyTraversalQcInputModality, intent: LegacyTraversalQcInputIntent): void => {
    inputCounts[modality] += 1;
    if (dragon) {
      if (intent === "left" || intent === "right") dragon.selectGate(intent);
      else dragon.advanceTime(60);
      return;
    }
    if (spellweaver) {
      if (intent === "left" || intent === "right") spellweaver.selectLane(intent);
      else if (intent === "down") spellweaver.selectLane("center");
      spellweaver.advanceTime(3_000);
      if (intent === "primary") spellweaver.collectLane();
      return;
    }
    if (shadow) {
      const direction = intent === "left" ? { x: -1, y: 0 }
        : intent === "right" ? { x: 1, y: 0 }
          : intent === "up" ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
      shadow.move(direction, 60);
      shadow.advanceTime(60);
      return;
    }
    if (labyrinth) {
      const direction = intent === "left" ? { x: -1, y: 0 }
        : intent === "right" ? { x: 1, y: 0 }
          : intent === "up" ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
      labyrinth.move(direction, 60);
      labyrinth.advanceTime(60);
      return;
    }
    if (griffin) {
      if (intent === "left" || intent === "right") griffin.switchLane(intent);
      else griffin.advanceTime(2_000);
    }
  };

  const mechanicSnapshot = (): Readonly<Record<string, unknown>> => {
    const snapshot = dragon?.snapshot() ?? spellweaver?.snapshot() ?? shadow?.snapshot() ?? labyrinth?.snapshot() ?? griffin?.snapshot();
    return Object.freeze({ ...snapshot });
  };

  return Object.freeze({
    dispatch,
    resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
      const composition = resolveResponsiveComposition({
        viewport,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
        inputCapabilities: { keyboard: true, pointer: true, touch: true },
        accessibility: { textScale: 1, touchScale: 1 },
        ...(profile ? { previousProfile: profile } : {}),
        config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
      });
      if (composition.supported) profile = composition.profile;
      return composition;
    },
    snapshot(): LegacyTraversalQcSessionSnapshot {
      return Object.freeze({
        mechanic: mechanicSnapshot(),
        inputCounts: Object.freeze({ ...inputCounts }),
        hostCompletionEmissions: 0,
        ...(profile ? { profile } : {}),
      });
    },
  });
}

/** Returns one traversal QC registry entry without registering it in a product catalog. */
export function getLegacyTraversalQcRegistryEntry(cartridgeId: string): LegacyTraversalQcRegistryEntry | undefined {
  return traversalQcIdSchema.has(cartridgeId)
    ? LEGACY_TRAVERSAL_QC_REGISTRY.find((entry) => entry.id === cartridgeId)
    : undefined;
}

/** Loads one QC-only traversal title after validating its server-issued v2 selected union. */
export async function loadLegacyTraversalQcCartridge(
  cartridgeId: string,
  selection: LegacyTraversalQcSelectedUnion,
): Promise<LegacyTraversalQcCartridge> {
  const entry = getLegacyTraversalQcRegistryEntry(cartridgeId);
  if (!entry) throw new Error(`Traversal QC has no registration for ${cartridgeId}`);
  assertSelection(entry.id, selection);
  const cartridge = cartridgeById[entry.id];
  if (cartridge.manifest.qcRegistration.route !== "/qc") {
    throw new Error(`Traversal QC rejects a non-/qc registration for ${entry.id}`);
  }
  return Object.freeze({
    manifest: Object.freeze({ id: entry.id, title: cartridge.manifest.title, qcRegistration: Object.freeze({ route: "/qc" as const }) }),
    descriptorSelection: selection,
    taskScope: Object.freeze({
      registration: "advantage-games-qc-only" as const,
      productionCatalogExposed: false as const,
      readingIntegration: false as const,
      primaryIntegration: false as const,
      completionPersistence: false as const,
    }),
    createQcSession: () => createQcSession(entry.id),
  });
}
