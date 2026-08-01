import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveResponsiveComposition, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { z } from "zod";

import { CASTLE_DEFENSE_CARTRIDGE } from "./castle-defense-cartridge.js";
import { STORM_CASTLE_TOWER_CARTRIDGE, StormCastleTowerEvidenceUnavailableError } from "./storm-castle-tower-cartridge.js";
import { VILLAGE_GUARDIAN_CARTRIDGE } from "./village-guardian-cartridge.js";
import { WIZARD_VS_ZOMBIE_CARTRIDGE } from "./wizard-vs-zombie-cartridge.js";
import {
  LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES,
  getLegacyDefenseSemanticAdoptionCandidate,
  type LegacyDefenseClaimReference,
  type LegacyDefenseSelectedUnion,
  type LegacyDefenseSemanticAdoptionCandidate,
} from "./legacy-defense-suitability.js";

const QC_IDS = ["castle-defense", "wizard-vs-zombie", "village-guardian", "storm-castle-tower"] as const;
const qcIdSchema = z.enum(QC_IDS);
const inputModalitySchema = z.enum(["keyboard", "pointer", "touch"]);
const inputIntentSchema = z.enum(["primary", "secondary"]);
const physicalInputSchema = z.discriminatedUnion("modality", [
  z.object({ modality: z.literal("keyboard"), key: z.enum(["Enter", " ", "Space"]), intent: inputIntentSchema }).strict(),
  z.object({ modality: z.literal("pointer"), button: z.literal(0), x: z.number().finite(), y: z.number().finite(), intent: inputIntentSchema }).strict(),
  z.object({ modality: z.literal("touch"), touchCount: z.number().int().positive(), x: z.number().finite(), y: z.number().finite(), intent: inputIntentSchema }).strict(),
]);

/** One browser modality proven through the isolated defense QC surface. */
export type LegacyDefenseQcInputModality = z.infer<typeof inputModalitySchema>;
/** One positive or secondary input intent applied to a title mechanic. */
export type LegacyDefenseQcInputIntent = z.infer<typeof inputIntentSchema>;
/** Exact defense QC identifier, unavailable from the production catalog. */
export type LegacyDefenseQcId = z.infer<typeof qcIdSchema>;

/** Raised when historical or absent source evidence is asked to execute in QC. */
export class LegacyDefenseEvidenceUnavailableError extends Error {
  /** Creates a provenance-bearing fail-closed error. */
  constructor(
    /** Exact title whose behavior is unavailable. */
    readonly titleId: LegacyDefenseQcId,
    /** Claim that blocks execution. */
    readonly claim: LegacyDefenseClaimReference,
  ) {
    super(`Legacy Defense ${titleId} cannot execute ${claim.claimId} at ${claim.locator}: ${claim.disposition}`);
    this.name = "LegacyDefenseEvidenceUnavailableError";
  }
}

/** Minimal mechanic state rendered by the QC host without a result-delivery path. */
export interface LegacyDefenseQcMechanicSnapshot {
  /** Source-backed titles can be active; Storm remains blocked. */
  readonly status: string;
  /** Completion is unavailable for every defense QC title. */
  readonly completionSupported: false;
  /** Exact evidence cited by the title operation. */
  readonly evidence: readonly LegacyDefenseClaimReference[];
}

/** Common source-backed mechanic bridge used only by the QC session. */
export interface LegacyDefenseQcMechanic {
  /** Applies the title's primary source-backed action. */
  applyPrimaryAction(): void;
  /** Applies the title's secondary source-backed action. */
  applySecondaryAction(): void;
  /** Returns a compact, result-free QC snapshot. */
  snapshot(): LegacyDefenseQcMechanicSnapshot;
}

/** Registry entry for one title rendered only under Advantage Games `/qc`. */
export interface LegacyDefenseQcRegistryEntry {
  /** Isolated title identifier. */
  readonly id: LegacyDefenseQcId;
  /** Student-visible title. */
  readonly title: string;
  /** QC-only lifecycle registration. */
  readonly registration: "advantage-games-qc-only";
}

/** Session snapshot for native-input and responsive evidence. */
export interface LegacyDefenseQcSessionSnapshot {
  /** Current title mechanic state. */
  readonly mechanic: LegacyDefenseQcMechanicSnapshot;
  /** Native inputs received by modality. */
  readonly inputCounts: Readonly<Record<LegacyDefenseQcInputModality, number>>;
  /** Inputs blocked by historical or absent source evidence. */
  readonly blockedInteractionCount: number;
  /** Always zero because no completion callback exists. */
  readonly completionCount: 0;
  /** Latest compact or wide composition profile. */
  readonly profile?: "compact" | "wide";
}

/** Mutable-in-memory QC session with no persistence or completion delivery. */
export interface LegacyDefenseQcSession {
  /** Records one native modality and executes only the title's cited operation. */
  dispatch(modality: LegacyDefenseQcInputModality, intent: LegacyDefenseQcInputIntent): void;
  /** Validates and records a physical input snapshot. */
  dispatchPhysicalInput(input: unknown): void;
  /** Reflows the same session state between compact and wide. */
  resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Rejects a synthetic completion attempt. */
  completeProof(): never;
  /** Returns native-input evidence without a result. */
  snapshot(): LegacyDefenseQcSessionSnapshot;
}

/** Isolated title adapter that cannot be consumed by a catalog or application host. */
export interface LegacyDefenseQcCartridge {
  /** Validated T11-style QC manifest. */
  readonly manifest: CartridgeManifest;
  /** Resolver-issued v2 descriptor selection. */
  readonly descriptorSelection: LegacyDefenseSelectedUnion;
  /** Explicit anti-promotion boundary. */
  readonly taskScope: Readonly<{ registration: "advantage-games-qc-only"; consumable: false; productionCatalogExposed: false; readingIntegration: false; primaryIntegration: false; completionSupported: false }>;
  /** Creates a source-backed or fail-closed title mechanic. */
  createDeterministicMechanic(): LegacyDefenseQcMechanic;
  /** Creates one native input session. */
  createQcSession(): LegacyDefenseQcSession;
}

/** Builds the small source-backed mechanic bridge for one title. */
function createMechanic(candidate: LegacyDefenseSemanticAdoptionCandidate): LegacyDefenseQcMechanic {
  switch (candidate.publicId) {
    case "castle-defense": {
      const mechanic = CASTLE_DEFENSE_CARTRIDGE.createMechanic([{ term: "hold the line", translation: "hold the line" }]);
      return Object.freeze({
        applyPrimaryAction(): void {
          const state = mechanic.snapshot();
          if (!state.sentenceComplete) mechanic.collectWord(state.targetIndex);
          else if (state.towersBuilt === 0) mechanic.buildTower(true);
          else if (state.activeEnemies === 0) mechanic.spawnNextEnemy();
          else mechanic.defeatEnemy();
        },
        applySecondaryAction: () => mechanic.enemyReachedBase("soldier"),
        snapshot: () => Object.freeze({ status: mechanic.snapshot().status, completionSupported: false as const, evidence: Object.freeze(Object.values(candidate.mechanicEvidence)) }),
      });
    }
    case "wizard-vs-zombie": {
      const mechanic = WIZARD_VS_ZOMBIE_CARTRIDGE.createMechanic([{ term: "run", translation: "run" }, { term: "jump", translation: "jump" }]);
      return Object.freeze({
        applyPrimaryAction: () => mechanic.collectOrb(mechanic.snapshot().targetIndex),
        applySecondaryAction: () => mechanic.collectOrb(-1),
        snapshot: () => Object.freeze({ status: mechanic.snapshot().status, completionSupported: false as const, evidence: Object.freeze(Object.values(candidate.mechanicEvidence)) }),
      });
    }
    case "village-guardian": {
      const mechanic = VILLAGE_GUARDIAN_CARTRIDGE.createMechanic([{ term: "safe home", translation: "safe home" }]);
      return Object.freeze({
        applyPrimaryAction: () => mechanic.rescueVillager(mechanic.snapshot().targetIndex),
        applySecondaryAction: () => mechanic.monsterAttack(0),
        snapshot: () => Object.freeze({ status: mechanic.snapshot().status, completionSupported: false as const, evidence: Object.freeze(Object.values(candidate.mechanicEvidence)) }),
      });
    }
    case "storm-castle-tower": {
      const mechanic = STORM_CASTLE_TOWER_CARTRIDGE.createMechanic();
      const toBoundaryError = (): never => {
        try {
          mechanic.selectWindow(0);
        } catch (error) {
          if (error instanceof StormCastleTowerEvidenceUnavailableError) {
            throw new LegacyDefenseEvidenceUnavailableError(candidate.publicId, error.claim);
          }
          throw error;
        }
        throw new Error("Storm mechanic did not fail closed");
      };
      return Object.freeze({
        applyPrimaryAction: toBoundaryError,
        applySecondaryAction: toBoundaryError,
        snapshot: () => Object.freeze({ status: "blocked", completionSupported: false as const, evidence: Object.freeze(Object.values(candidate.mechanicEvidence)) }),
      });
    }
  }
}

/** Validates a resolver-issued v2 selection before it can reach browser QC. */
function assertDescriptorSelection(candidate: LegacyDefenseSemanticAdoptionCandidate, selection: LegacyDefenseSelectedUnion): void {
  if (selection.publicId !== candidate.publicId || selection.resolved.length !== candidate.roleStateRequirements.length) {
    throw new Error(`Legacy Defense descriptor selection does not belong to ${candidate.publicId}`);
  }
  const expectedRoles = new Set(candidate.roleStateRequirements.map((role) => role.titleRole));
  for (const role of selection.resolved) {
    if (!expectedRoles.delete(role.titleRole) || role.descriptorDigest.length !== 64 || !role.sourceReceiptLocator.startsWith("CURATED-RECEIPT.tsv:") || role.evidenceClaim.claimId.length === 0 || !role.evidenceClaim.locator.includes(role.evidenceClaim.claimId)) {
      throw new Error(`Legacy Defense QC rejects an unproven descriptor role for ${candidate.publicId}`);
    }
  }
  if (expectedRoles.size !== 0) throw new Error(`Legacy Defense QC selection is missing roles for ${candidate.publicId}`);
}

/** Creates a manifest with no completion-emission capability. */
function createManifest(candidate: LegacyDefenseSemanticAdoptionCandidate, selection: LegacyDefenseSelectedUnion): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1,
    id: candidate.publicId,
    title: candidate.title,
    description: `Evidence-bounded ${candidate.title} adapter for Advantage Games /qc only.`,
    version: "0.2.0",
    runtimeApiVersion: DEVELOPER_KIT_API_VERSION,
    inputMode: candidate.inputMode,
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: selection.semanticKeys,
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  });
}

/** Creates a native-input session that retains its source-evidence boundary through responsive recomposition. */
function createQcSession(candidate: LegacyDefenseSemanticAdoptionCandidate): LegacyDefenseQcSession {
  const mechanic = createMechanic(candidate);
  const inputCounts: Record<LegacyDefenseQcInputModality, number> = { keyboard: 0, pointer: 0, touch: 0 };
  let blockedInteractionCount = 0;
  let profile: "compact" | "wide" | undefined;
  const dispatch = (modality: LegacyDefenseQcInputModality, intent: LegacyDefenseQcInputIntent): void => {
    inputCounts[inputModalitySchema.parse(modality)] += 1;
    try {
      if (intent === "primary") mechanic.applyPrimaryAction();
      else mechanic.applySecondaryAction();
    } catch (error) {
      if (error instanceof LegacyDefenseEvidenceUnavailableError) {
        blockedInteractionCount += 1;
        return;
      }
      throw error;
    }
  };
  return Object.freeze({
    dispatch,
    dispatchPhysicalInput(input: unknown): void {
      const parsed = physicalInputSchema.parse(input);
      dispatch(parsed.modality, parsed.intent);
    },
    resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
      const parsed = z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict().parse(viewport);
      const composition = resolveResponsiveComposition({ viewport: parsed, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, ...(profile ? { previousProfile: profile } : {}), config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
      if (composition.supported) profile = composition.profile;
      return composition;
    },
    completeProof(): never {
      const claim = candidate.publicId === "storm-castle-tower"
        ? candidate.mechanicEvidence.missingCurrentImplementation!
        : Object.values(candidate.mechanicEvidence)[0]!;
      throw new LegacyDefenseEvidenceUnavailableError(candidate.publicId, claim);
    },
    snapshot(): LegacyDefenseQcSessionSnapshot {
      return Object.freeze({ mechanic: mechanic.snapshot(), inputCounts: Object.freeze({ ...inputCounts }), blockedInteractionCount, completionCount: 0, ...(profile ? { profile } : {}) });
    },
  });
}

/** Creates an isolated QC cartridge after verifying its descriptor selection. */
function createQcCartridge(candidate: LegacyDefenseSemanticAdoptionCandidate, selection: LegacyDefenseSelectedUnion): LegacyDefenseQcCartridge {
  if (candidate.consumable) throw new Error(`Legacy Defense ${candidate.publicId} cannot bypass its QC-only boundary`);
  assertDescriptorSelection(candidate, selection);
  return Object.freeze({
    manifest: createManifest(candidate, selection),
    descriptorSelection: selection,
    taskScope: Object.freeze({ registration: "advantage-games-qc-only" as const, consumable: false as const, productionCatalogExposed: false as const, readingIntegration: false as const, primaryIntegration: false as const, completionSupported: false as const }),
    createDeterministicMechanic: () => createMechanic(candidate),
    createQcSession: () => createQcSession(candidate),
  });
}

/** Exact four-title registry mounted only by the Advantage Games `/qc` page. */
export const LEGACY_DEFENSE_QC_REGISTRY: readonly LegacyDefenseQcRegistryEntry[] = Object.freeze(QC_IDS.map((id) => {
  const candidate = getLegacyDefenseSemanticAdoptionCandidate(id);
  if (!candidate) throw new Error(`Legacy Defense candidate missing for ${id}`);
  return Object.freeze({ id, title: candidate.title, registration: "advantage-games-qc-only" as const });
}));

/** Returns a QC registry entry for this cohort only. */
export function getLegacyDefenseQcRegistryEntry(titleId: string): LegacyDefenseQcRegistryEntry | undefined {
  const parsed = qcIdSchema.safeParse(titleId);
  return parsed.success ? LEGACY_DEFENSE_QC_REGISTRY.find((entry) => entry.id === parsed.data) : undefined;
}

/**
 * Loads one defense QC cartridge after the server materializes its v2 descriptor union.
 * @param titleId Exact defense title identifier.
 * @param selection Resolver-issued descriptor selection for that title.
 * @returns An isolated QC cartridge.
 * @throws When the title is outside the cohort or the selection has drifted.
 */
export async function loadLegacyDefenseQcCartridge(titleId: string, selection: LegacyDefenseSelectedUnion): Promise<LegacyDefenseQcCartridge> {
  const id = qcIdSchema.parse(titleId);
  const candidate = getLegacyDefenseSemanticAdoptionCandidate(id);
  if (!candidate) throw new Error(`Legacy Defense candidate missing for ${id}`);
  return createQcCartridge(candidate, selection);
}

/** Retains the candidate list as a dependency-visible QC-only denominator. */
export const LEGACY_DEFENSE_QC_CANDIDATES = LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES;
