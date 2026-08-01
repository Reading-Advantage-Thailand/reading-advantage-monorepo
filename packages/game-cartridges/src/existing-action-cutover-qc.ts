import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  validateCartridgeManifest,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import type { ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import type { CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import { z } from "zod";

import {
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES,
  assertExistingActionCandidateNotConsumable,
  assertExistingActionCandidateRoleStatesOwnerApproved,
  assertExistingActionProgressionEvidenceCurrent,
} from "./existing-action-cutover-semantic-candidates.js";
import type {
  ExistingActionCandidateSelectedUnion,
  ExistingActionSemanticAdoptionCandidate,
} from "./existing-action-cutover-semantic-candidates.js";

const QC_IDS = ["archers-revenge", "paladins-twin-soul", "griffin-sky-joust", "gryphon-patrol", "realm-carver"] as const;
const qcIdSchema = z.enum(QC_IDS);
const inputModalitySchema = z.enum(["keyboard", "pointer", "touch"]);
const inputIntentSchema = z.enum(["primary", "secondary"]);
const viewportSchema = z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict();
const physicalInputSchema = z.discriminatedUnion("modality", [
  z.object({ modality: z.literal("keyboard"), key: z.enum(["Enter", " ", "Space"]), intent: inputIntentSchema }).strict(),
  z.object({ modality: z.literal("pointer"), button: z.literal(0), x: z.number().finite(), y: z.number().finite(), intent: inputIntentSchema }).strict(),
  z.object({ modality: z.literal("touch"), touchCount: z.number().int().positive(), x: z.number().finite(), y: z.number().finite(), intent: inputIntentSchema }).strict(),
]);
const evidenceActionSchema = z.enum([
  "shoot-shield-down-target",
  "shoot-shield-up-enemy",
  "rescue-captured-twin",
  "clear-next-word-wave",
  "strike-next-rider-from-above",
  "strike-wrong-rider-from-above",
  "hit-next-aerial-target",
  "collect-next-word-orb",
  "close-circuit-with-next-word",
  "close-circuit-with-wrong-word",
]);

/** One exact evidence action retained as a non-promoting QC interaction label. */
export type ExistingActionEvidenceAction = z.infer<typeof evidenceActionSchema>;
/** One supported physical input modality normalized by the QC session. */
export type ExistingActionQcInputModality = z.infer<typeof inputModalitySchema>;
/** One positive or negative title-owned input intent. */
export type ExistingActionQcInputIntent = z.infer<typeof inputIntentSchema>;
/** Validated keyboard, pointer, or touch input data received by the QC surface. */
export type ExistingActionQcPhysicalInput = z.infer<typeof physicalInputSchema>;
/** One exact QC-only title identifier. */
export type ExistingActionQcId = z.infer<typeof qcIdSchema>;

/** Raised when a historical or unknown claim is offered as a current progression or completion rule. */
export class ExistingActionEvidenceUnavailableError extends Error {
  /** Creates a fail-closed evidence-scope error. */
  constructor(
    readonly titleId: ExistingActionQcId,
    readonly claimId: string,
    readonly locator: string,
  ) {
    super(`Existing Action ${titleId} cannot execute ${claimId} at ${locator}: current evidence is unavailable`);
    this.name = "ExistingActionEvidenceUnavailableError";
  }
}

/** Immutable blocked mechanic snapshot that cannot invent a learning result. */
export interface ExistingActionMechanicSnapshot {
  /** Mechanic lifecycle is blocked rather than active or complete. */
  readonly status: "blocked";
  /** No evidence-supported scored attempts have occurred. */
  readonly attempts: 0;
  /** No evidence-supported correct answers have occurred. */
  readonly correctAnswers: 0;
  /** No evidence-supported educational progression has occurred. */
  readonly progress: 0;
  /** No synthetic score has been created. */
  readonly score: 0;
  /** No synthetic completion has been emitted. */
  readonly completions: 0;
  /** Exact first unresolved claim that blocks the title. */
  readonly blockingClaim: Readonly<{ claimId: string; locator: string; temporalScope: "historical-source-only" | "unknown" }>;
}

/** Deterministic title adapter that rejects non-current mechanics instead of simulating them. */
export interface ExistingActionEvidenceMechanic {
  /** Applies a claim-named action only when it has current accepted evidence. */
  applyEvidenceAction(action: ExistingActionEvidenceAction): void;
  /** Returns the immutable fail-closed mechanic state. */
  snapshot(): ExistingActionMechanicSnapshot;
}

/** Metadata for an isolated Advantage Games QC title. */
export interface ExistingActionQcRegistryEntry {
  /** Title identifier. */
  readonly id: ExistingActionQcId;
  /** Title display name. */
  readonly title: string;
  /** Educational input mode. */
  readonly inputMode: "vocabulary" | "sentence";
  /** QC registration boundary. */
  readonly registration: "advantage-games-qc-only";
}

/** T11-compatible manifest for the isolated action QC adapter. */
export interface ExistingActionQcManifest extends CartridgeManifest {
  /** Current developer-kit ABI version. */
  readonly developerKitApiVersion: typeof DEVELOPER_KIT_API_VERSION;
  /** Input proof scope; no result ABI is exposed while progression is blocked. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
}

/** Immutable state retained while compact and wide presentations recompose. */
export interface ExistingActionQcSessionSnapshot {
  /** Current fail-closed mechanic state. */
  readonly mechanic: ExistingActionMechanicSnapshot;
  /** Physical inputs observed by modality. */
  readonly inputCounts: Readonly<Record<ExistingActionQcInputModality, number>>;
  /** Inputs normalized but deliberately blocked before mechanic progression. */
  readonly blockedInteractionCount: number;
  /** Completion must always remain zero under historical or unknown evidence. */
  readonly completionCount: 0;
  /** Most recently resolved responsive profile. */
  readonly profile?: "compact" | "wide";
}

/** In-memory QC session that records native inputs without claiming educational progression. */
export interface ExistingActionQcSession {
  /** Dispatches one physical modality and title intent to the fail-closed evidence adapter. */
  dispatch(modality: ExistingActionQcInputModality, intent: ExistingActionQcInputIntent): void;
  /** Validates and dispatches one native event snapshot. */
  dispatchPhysicalInput(input: unknown): void;
  /** Reflows presentation without changing the blocked mechanic state. */
  resize(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /** Rejects synthetic completion when no current supported progression exists. */
  completeProof(): never;
  /** Returns the latest immutable native-input and responsive-state evidence. */
  snapshot(): ExistingActionQcSessionSnapshot;
}

/** An isolated title cartridge that may only be rendered by the Advantage Games QC route. */
export interface ExistingActionQcCartridge {
  /** T11-compatible cartridge manifest. */
  readonly manifest: ExistingActionQcManifest;
  /** Resolver-issued v2 descriptor selection for this title only. */
  readonly descriptorSelection: ExistingActionCandidateSelectedUnion;
  /** Explicit non-production lifecycle boundary. */
  readonly taskScope: Readonly<{
    registration: "advantage-games-qc-only";
    consumable: false;
    productionCatalogExposed: false;
    readingIntegration: false;
    primaryIntegration: false;
    retirementComplete: false;
    progressionSupported: false;
  }>;
  /** Creates a fresh title evidence adapter. */
  createDeterministicMechanic(): ExistingActionEvidenceMechanic;
  /** Creates a fresh native-input QC session. */
  createQcSession(): ExistingActionQcSession;
}

/** Dynamic loader used exclusively by the action-only Advantage Games QC registration. */
export type ExistingActionQcLoader = (
  selection: ExistingActionCandidateSelectedUnion,
) => Promise<ExistingActionQcCartridge>;

const actionById: Readonly<Record<ExistingActionQcId, Readonly<Record<ExistingActionQcInputIntent, ExistingActionEvidenceAction>>>> = Object.freeze({
  "archers-revenge": Object.freeze({ primary: "shoot-shield-down-target", secondary: "shoot-shield-up-enemy" }),
  "paladins-twin-soul": Object.freeze({ primary: "clear-next-word-wave", secondary: "rescue-captured-twin" }),
  "griffin-sky-joust": Object.freeze({ primary: "strike-next-rider-from-above", secondary: "strike-wrong-rider-from-above" }),
  "gryphon-patrol": Object.freeze({ primary: "hit-next-aerial-target", secondary: "collect-next-word-orb" }),
  "realm-carver": Object.freeze({ primary: "close-circuit-with-next-word", secondary: "close-circuit-with-wrong-word" }),
});

/** Rejects a claim action unless its exact title evidence is current and explicitly supported. */
function createMechanic(candidate: ExistingActionSemanticAdoptionCandidate): ExistingActionEvidenceMechanic {
  const id = qcIdSchema.parse(candidate.publicId);
  const blocked = candidate.mechanicEvidence.find((evidence) => (
    evidence.temporalScope !== "current-source" || evidence.disposition !== "supported"
  ));
  if (!blocked) {
    throw new Error(`Existing Action ${id} must not expose a QC mechanic without a fail-closed evidence blocker`);
  }
  if (blocked.temporalScope === "current-source") {
    throw new Error(`Existing Action ${id} cannot treat current evidence as a historical-or-unknown QC blocker`);
  }
  const snapshot: ExistingActionMechanicSnapshot = Object.freeze({
    status: "blocked",
    attempts: 0,
    correctAnswers: 0,
    progress: 0,
    score: 0,
    completions: 0,
    blockingClaim: Object.freeze({
      claimId: blocked.claimId,
      locator: blocked.locator,
      temporalScope: blocked.temporalScope,
    }),
  });
  return Object.freeze({
    applyEvidenceAction(action: ExistingActionEvidenceAction): void {
      const parsed = evidenceActionSchema.parse(action);
      const evidence = candidate.mechanicEvidence.find((candidateEvidence) => candidateEvidence.action === parsed);
      if (!evidence) throw new Error(`Evidence action ${parsed} is not accepted for ${id}`);
      try {
        assertExistingActionProgressionEvidenceCurrent(candidate);
      } catch {
        throw new ExistingActionEvidenceUnavailableError(id, evidence.claimId, evidence.locator);
      }
      throw new ExistingActionEvidenceUnavailableError(id, evidence.claimId, evidence.locator);
    },
    snapshot: () => snapshot,
  });
}

/** Validates that a client-visible selection was issued for the exact title's v2 roles. */
function assertDescriptorSelection(
  candidate: ExistingActionSemanticAdoptionCandidate,
  selection: ExistingActionCandidateSelectedUnion,
): void {
  if (selection.publicId !== candidate.publicId || selection.registrations.length !== candidate.roleStateRequirements.length) {
    throw new Error(`Existing Action QC descriptor selection does not belong to ${candidate.publicId}`);
  }
  const expectedRoles = new Set(candidate.roleStateRequirements.map((requirement) => requirement.titleRole));
  for (const role of selection.resolved) {
    if (
      !expectedRoles.delete(role.titleRole)
      || role.evidenceClaim.claimId.length === 0
      || role.evidenceClaim.locator.length === 0
      || role.descriptorDigest.length !== 64
      || !role.sourceReceiptLocator.startsWith("CURATED-RECEIPT.tsv:")
    ) {
      throw new Error(`Existing Action QC rejects an unproven descriptor registration for ${candidate.publicId}`);
    }
  }
  if (expectedRoles.size !== 0) {
    throw new Error(`Existing Action QC descriptor selection is missing title roles for ${candidate.publicId}`);
  }
}

/** Creates a T11 QC manifest with no result-emission capability. */
function createManifest(
  candidate: ExistingActionSemanticAdoptionCandidate,
  selection: ExistingActionCandidateSelectedUnion,
): ExistingActionQcManifest {
  const manifest = validateCartridgeManifest({
    schemaVersion: 1,
    id: candidate.publicId,
    title: candidate.title,
    description: `Evidence-blocked ${candidate.title} native-input adapter for Advantage Games QC only.`,
    version: "0.2.0",
    runtimeApiVersion: "1.0.0",
    inputMode: candidate.inputMode,
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: selection.semanticKeys,
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  });
  return Object.freeze({
    ...manifest,
    developerKitApiVersion: DEVELOPER_KIT_API_VERSION,
    inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true } as const),
  });
}

/** Creates one native-input session that preserves a blocked evidence disposition. */
function createQcSession(candidate: ExistingActionSemanticAdoptionCandidate): ExistingActionQcSession {
  const id = qcIdSchema.parse(candidate.publicId);
  const mechanic = createMechanic(candidate);
  const inputCounts: Record<ExistingActionQcInputModality, number> = { keyboard: 0, pointer: 0, touch: 0 };
  let blockedInteractionCount = 0;
  let profile: "compact" | "wide" | undefined;
  const dispatch = (modality: ExistingActionQcInputModality, intent: ExistingActionQcInputIntent): void => {
    const parsedModality = inputModalitySchema.parse(modality);
    const parsedIntent = inputIntentSchema.parse(intent);
    inputCounts[parsedModality] += 1;
    try {
      mechanic.applyEvidenceAction(actionById[id][parsedIntent]);
    } catch (error) {
      if (error instanceof ExistingActionEvidenceUnavailableError) {
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
    completeProof(): never {
      const blocker = mechanic.snapshot().blockingClaim;
      throw new ExistingActionEvidenceUnavailableError(id, blocker.claimId, blocker.locator);
    },
    snapshot(): ExistingActionQcSessionSnapshot {
      return Object.freeze({
        mechanic: mechanic.snapshot(),
        inputCounts: Object.freeze({ ...inputCounts }),
        blockedInteractionCount,
        completionCount: 0,
        ...(profile ? { profile } : {}),
      });
    },
  });
}

/** Creates an isolated QC cartridge after verifying title-specific descriptor registrations. */
function createQcCartridge(
  candidate: ExistingActionSemanticAdoptionCandidate,
  selection: ExistingActionCandidateSelectedUnion,
): ExistingActionQcCartridge {
  assertExistingActionCandidateNotConsumable(candidate);
  assertExistingActionCandidateRoleStatesOwnerApproved(candidate);
  assertDescriptorSelection(candidate, selection);
  return Object.freeze({
    manifest: createManifest(candidate, selection),
    descriptorSelection: selection,
    taskScope: Object.freeze({
      registration: "advantage-games-qc-only" as const,
      consumable: false as const,
      productionCatalogExposed: false as const,
      readingIntegration: false as const,
      primaryIntegration: false as const,
      retirementComplete: false as const,
      progressionSupported: false as const,
    }),
    createDeterministicMechanic: () => createMechanic(candidate),
    createQcSession: () => createQcSession(candidate),
  });
}

const candidatesById = new Map(EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]));

/** Exact five-title registry available only to the isolated Advantage Games QC integration. */
export const EXISTING_ACTION_QC_REGISTRY: readonly ExistingActionQcRegistryEntry[] = Object.freeze(QC_IDS.map((id) => {
  const candidate = candidatesById.get(id);
  if (!candidate) throw new Error(`Existing Action candidate missing for ${id}`);
  return Object.freeze({ id, title: candidate.title, inputMode: candidate.inputMode, registration: "advantage-games-qc-only" as const });
}));

/** Dynamic loaders intentionally separate from root catalog and public loader exports. */
export const EXISTING_ACTION_QC_LOADERS: Readonly<Record<ExistingActionQcId, ExistingActionQcLoader>> = Object.freeze(
  Object.fromEntries(QC_IDS.map((id) => [id, async (selection: ExistingActionCandidateSelectedUnion) => {
    const candidate = candidatesById.get(id);
    if (!candidate) throw new Error(`Existing Action candidate missing for ${id}`);
    return createQcCartridge(candidate, selection);
  }])) as Record<ExistingActionQcId, ExistingActionQcLoader>,
);

/** Returns an isolated QC registration or undefined for titles outside this cohort. */
export function getExistingActionQcRegistryEntry(cartridgeId: string): ExistingActionQcRegistryEntry | undefined {
  const parsed = qcIdSchema.safeParse(cartridgeId);
  return parsed.success ? EXISTING_ACTION_QC_REGISTRY.find((entry) => entry.id === parsed.data) : undefined;
}

/** Loads one non-consumable action title after its v2 descriptor registrations have been materialized. */
export async function loadExistingActionQcCartridge(
  cartridgeId: string,
  selection: ExistingActionCandidateSelectedUnion,
): Promise<ExistingActionQcCartridge> {
  const id = qcIdSchema.parse(cartridgeId);
  return EXISTING_ACTION_QC_LOADERS[id](selection);
}
