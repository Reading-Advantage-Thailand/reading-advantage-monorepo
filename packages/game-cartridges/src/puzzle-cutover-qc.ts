import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import type { CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import type { AssetContractV2SemanticSelection, StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import {
  PUZZLE_TITLE_BINDINGS,
  createPuzzleTask2CanonicalResolver,
  createPuzzleCartridgeScope,
  getPuzzleTitleBinding,
  resolvePuzzleTitleCanonicalAssets,
  type PuzzleCartridgeScope,
  type PuzzleTitleId,
} from "./puzzle-suitability.js";
import { buildAlchemistsSynthesisPuzzleCartridge } from "./puzzle/alchemists-synthesis-cartridge.js";
import { buildEnchantedLibraryPuzzleCartridge } from "./puzzle/enchanted-library-cartridge.js";
import { buildPotionRushPuzzleCartridge } from "./puzzle/potion-rush-cartridge.js";
import { buildRuneForgeChamberPuzzleCartridge } from "./puzzle/rune-forge-chamber-cartridge.js";
import { buildRuneMatchPuzzleCartridge } from "./puzzle/rune-match-cartridge.js";

/** Supported native browser input modalities counted by the isolated puzzle QC adapter. */
export type PuzzleQcInputModality = "keyboard" | "pointer" | "touch";

/** Registry entry available only through the explicit Advantage Games QC subpath. */
export interface PuzzleQcRegistryEntry {
  /** Stable title identity. */
  readonly id: PuzzleTitleId;
  /** Student-visible title. */
  readonly title: string;
  /** Frozen content ABI. */
  readonly inputMode: "vocabulary" | "sentence";
  /** The only authorized registration. */
  readonly registration: "advantage-games-qc-only";
}

/** Resolver-issued selected union serialized across the `/qc` server boundary. */
export interface PuzzleQcSelectedUnion {
  /** Stable title identity. */
  readonly titleId: PuzzleTitleId;
  /** Descriptor-aware output without physical paths. */
  readonly selection: AssetContractV2SemanticSelection;
  /** Source claim IDs rendered in QC evidence. */
  readonly claimIds: readonly string[];
}

/** Mutable-session snapshot exposed to the browser QC canvas. */
export interface PuzzleQcSessionSnapshot {
  /** Native event counts that reached a title's T11 physical-input normalizer. */
  readonly inputCounts: Readonly<Record<PuzzleQcInputModality, number>>;
  /** The last semantic actions emitted by that normalizer. */
  readonly lastActions: readonly string[];
  /** Most recent supported responsive profile. */
  readonly profile?: "compact" | "wide";
  /** Source claims bound to this selected title. */
  readonly claimIds: readonly string[];
}

/** One stateful Advantage Games-only native-input and responsive QC session. */
export interface PuzzleQcSession {
  /** Records a browser input modality through the title-owned T11 normalizer. */
  dispatch(modality: PuzzleQcInputModality): void;
  /** Resolves responsive geometry without replacing the cartridge instance. */
  resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Returns immutable diagnostics for the QC canvas. */
  snapshot(): PuzzleQcSessionSnapshot;
}

/** Isolated QC cartridge that cannot enter any production loader or host. */
export interface PuzzleQcCartridge {
  /** The title's accepted-but-quarantined cartridge manifest. */
  readonly manifest: CartridgeManifest;
  /** No-host scope persisted by the owner acceptance. */
  readonly scope: PuzzleCartridgeScope;
  /** Resolver-issued descriptor registrations for the title-selected union. */
  readonly descriptorSelection: AssetContractV2SemanticSelection;
  /** Source claim IDs behind the displayed mechanic evidence. */
  readonly claimIds: readonly string[];
  /** Creates one fresh native input and responsive QC session. */
  createQcSession(): PuzzleQcSession;
}

/** Exact five-title registration available only from this non-root package subpath. */
export const PUZZLE_QC_REGISTRY: readonly PuzzleQcRegistryEntry[] = Object.freeze(
  PUZZLE_TITLE_BINDINGS.map((binding) => Object.freeze({
    id: binding.titleId,
    title: binding.title,
    inputMode: binding.inputMode,
    registration: "advantage-games-qc-only" as const,
  })),
);

/**
 * Creates the five resolver-issued selected unions permitted to cross the `/qc` server boundary.
 * @param catalog Complete standard-pack catalog pinned to the accepted release.
 * @returns Serializable title selections containing no physical asset paths or host registrations.
 */
export async function createPuzzleQcSelections(
  catalog: StandardAssetCatalog,
): Promise<readonly PuzzleQcSelectedUnion[]> {
  const resolver = await createPuzzleTask2CanonicalResolver(catalog);
  return Object.freeze(PUZZLE_TITLE_BINDINGS.map((binding) => Object.freeze({
    titleId: binding.titleId,
    selection: resolvePuzzleTitleCanonicalAssets(resolver, binding.titleId),
    claimIds: Object.freeze([...binding.claimIds]),
  })));
}

/** Looks up one QC title without consulting the production catalog. */
export function getPuzzleQcRegistryEntry(cartridgeId: string): PuzzleQcRegistryEntry | undefined {
  return PUZZLE_QC_REGISTRY.find((entry) => entry.id === cartridgeId);
}

/** Gets the built candidate for one title while preserving its isolated package boundary. */
function buildPuzzleCartridge(titleId: PuzzleTitleId) {
  switch (titleId) {
    case "enchanted-library": return buildEnchantedLibraryPuzzleCartridge();
    case "rune-match": return buildRuneMatchPuzzleCartridge();
    case "alchemists-synthesis": return buildAlchemistsSynthesisPuzzleCartridge();
    case "potion-rush": return buildPotionRushPuzzleCartridge();
    case "rune-forge-chamber": return buildRuneForgeChamberPuzzleCartridge();
  }
}

/** Sends one trusted QC proof event through the matching title-owned physical input normalizer. */
function dispatchTitleInput(
  titleId: PuzzleTitleId,
  modality: PuzzleQcInputModality,
): readonly string[] {
  const physical = modality === "keyboard"
    ? { modality: "keyboard" as const, code: ["enchanted-library", "potion-rush"].includes(titleId) ? "KeyD" : "Enter" }
    : ["enchanted-library", "potion-rush"].includes(titleId)
      ? { modality: "pointer" as const, phase: "drag" as const, x: 24, y: 24, deltaX: 24 }
      : { modality: "pointer" as const, phase: "down" as const, x: 24, y: 24 };
  switch (titleId) {
    case "enchanted-library": return buildEnchantedLibraryPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]).dispatchPhysicalInput(physical);
    case "rune-match": return buildRuneMatchPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]).dispatchPhysicalInput(physical);
    case "alchemists-synthesis": return buildAlchemistsSynthesisPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }], "easy").dispatchPhysicalInput(physical);
    case "potion-rush": return buildPotionRushPuzzleCartridge().createSession([{ term: "moon potion", translation: "pocion luna" }]).dispatchPhysicalInput(physical);
    case "rune-forge-chamber": return buildRuneForgeChamberPuzzleCartridge().createSession([{ term: "moon rune", translation: "runa luna" }]).dispatchPhysicalInput(physical);
  }
}

/** Resolves title responsive geometry through the title-owned cartridge instead of a generic substitute. */
function resolveTitleComposition(titleId: PuzzleTitleId, viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  const composition = resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
  if (!composition.supported) return composition;
  switch (titleId) {
    case "enchanted-library": buildEnchantedLibraryPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]).resolveQcComposition(viewport); break;
    case "rune-match": buildRuneMatchPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]).resolveQcComposition(viewport); break;
    case "alchemists-synthesis": buildAlchemistsSynthesisPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }], "easy").resolveQcComposition(viewport); break;
    case "potion-rush": buildPotionRushPuzzleCartridge().createSession([{ term: "moon potion", translation: "pocion luna" }]).resolveQcComposition(viewport); break;
    case "rune-forge-chamber": buildRuneForgeChamberPuzzleCartridge().createSession([{ term: "moon rune", translation: "runa luna" }]).resolveQcComposition(viewport); break;
  }
  return composition;
}

/** Creates an isolated title QC cartridge after checking its server-issued selected union. */
function createPuzzleQcCartridge(selection: PuzzleQcSelectedUnion): PuzzleQcCartridge {
  const binding = getPuzzleTitleBinding(selection.titleId);
  if (selection.selection.semanticKeys.length !== 1 || selection.selection.semanticKeys[0] !== binding.semanticKey) {
    throw new Error(`Puzzle QC selected union drifted for ${selection.titleId}`);
  }
  const candidate = buildPuzzleCartridge(selection.titleId);
  if (candidate.manifest.semanticAssetRequirements.length !== 1 || candidate.manifest.semanticAssetRequirements[0] !== binding.semanticKey) {
    throw new Error(`Puzzle QC cartridge manifest drifted for ${selection.titleId}`);
  }
  return Object.freeze({
    manifest: candidate.manifest,
    scope: createPuzzleCartridgeScope(selection.titleId),
    descriptorSelection: selection.selection,
    claimIds: Object.freeze([...selection.claimIds]),
    createQcSession(): PuzzleQcSession {
      const inputCounts: Record<PuzzleQcInputModality, number> = { keyboard: 0, pointer: 0, touch: 0 };
      let lastActions: readonly string[] = Object.freeze([]);
      let profile: "compact" | "wide" | undefined;
      return Object.freeze({
        dispatch(modality: PuzzleQcInputModality): void {
          inputCounts[modality] += 1;
          lastActions = Object.freeze([...dispatchTitleInput(selection.titleId, modality)]);
        },
        resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
          const composition = resolveTitleComposition(selection.titleId, viewport);
          if (composition.supported) profile = composition.profile;
          return composition;
        },
        snapshot(): PuzzleQcSessionSnapshot {
          return Object.freeze({
            inputCounts: Object.freeze({ ...inputCounts }),
            lastActions,
            ...(profile ? { profile } : {}),
            claimIds: Object.freeze([...selection.claimIds]),
          });
        },
      });
    },
  });
}

/**
 * Loads one title only into the isolated Advantage Games `/qc` registry.
 * @param cartridgeId Untrusted QC title identity.
 * @param selection Resolver-issued title-specific selected union from the server boundary.
 * @returns An isolated QC cartridge with no public catalog, Reading, or Primary registration.
 * @throws When the id, selected union, or candidate manifest drifts from the accepted v2 binding.
 */
export async function loadPuzzleQcCartridge(
  cartridgeId: string,
  selection: PuzzleQcSelectedUnion,
): Promise<PuzzleQcCartridge> {
  const entry = getPuzzleQcRegistryEntry(cartridgeId);
  if (!entry || entry.id !== selection.titleId) throw new Error(`Unknown or mismatched puzzle QC cartridge ${JSON.stringify(cartridgeId)}`);
  return createPuzzleQcCartridge(selection);
}
