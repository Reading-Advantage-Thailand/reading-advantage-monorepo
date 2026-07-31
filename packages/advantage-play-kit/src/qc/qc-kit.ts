import { z } from "zod";

import {
  assetContractV2SemanticRequirementSchema,
  validateAssetContractV2Descriptor,
} from "../assets/asset-contract-v2.js";
import type {
  AssetContractV2Anchor,
  AssetContractV2CollisionEnvelope,
  AssetContractV2Direction,
  AssetContractV2Geometry,
  AssetContractV2ReadabilityEnvelope,
  AssetContractV2ReleaseIdentity,
} from "../assets/asset-contract-v2.js";
import {
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "../assets/standard-pack-suitability.js";
import type {
  StandardPackPhysicalBehaviorConstraints,
  StandardPackSuitabilityComparison,
  StandardPackSuitabilityCredit,
  StandardPackSuitabilityDecision,
  StandardPackSuitabilityDossier,
} from "../assets/standard-pack-suitability.js";


/** Semantic identity shown separately on an Asset Contract v2 QC surface. */
export interface AssetContractV2QcSemanticIdentity {
  /** Product-facing semantic role. */
  readonly role: string;
  /** Product-facing semantic state. */
  readonly state: string;
  /** Stable role/state display identity. */
  readonly identity: string;
}

/** Safe physical descriptor metadata displayed by the Asset Contract v2 QC surface. */
export interface AssetContractV2QcPhysicalDescriptorView {
  /** Descriptor identity selected by the adapter. */
  readonly descriptorId: string;
  /** Catalog semantic key, never a direct physical path. */
  readonly catalogEntryKey: string;
  /** Descriptor media category. */
  readonly mediaKind: "image" | "animation" | "tileset" | "ui" | "audio";
  /** Exact release pin for the selected descriptor. */
  readonly release: AssetContractV2ReleaseIdentity;
  /** Encoded visual geometry when the media is visual. */
  readonly geometry: AssetContractV2Geometry | undefined;
  /** Descriptor-owned render anchor. */
  readonly anchor: AssetContractV2Anchor;
  /** Descriptor-owned visual scale. */
  readonly renderScale: number;
  /** Descriptor-owned collision envelope. */
  readonly collisionEnvelope: AssetContractV2CollisionEnvelope;
  /** Descriptor-owned readability requirements. */
  readonly readabilityEnvelope: AssetContractV2ReadabilityEnvelope;
}

/** Animation behavior displayed separately from semantic and physical descriptor identity. */
export interface AssetContractV2QcAnimationBehavior {
  /** Descriptor-defined clips and their actual frame/timing behavior. */
  readonly clips: readonly Readonly<{ clipId: string; frameCount: number; fps: number; loop: boolean }>[];
  /** Descriptor-defined direction-to-clip mappings. */
  readonly directions: readonly AssetContractV2Direction[];
}

/** Browser-safe, data-only Asset Contract v2 diagnostic view. */
export interface AssetContractV2QcDiagnostic {
  /** Gameplay-owned semantic request. */
  readonly semantic: AssetContractV2QcSemanticIdentity;
  /** Presentation-owned physical descriptor metadata. */
  readonly physicalDescriptor: AssetContractV2QcPhysicalDescriptorView;
  /** Presentation-owned animation behavior, or null for non-animated media. */
  readonly animation: AssetContractV2QcAnimationBehavior | null;
}

function copyAssetContractV2QcAnchor(anchor: AssetContractV2Anchor): AssetContractV2Anchor {
  return Object.freeze({ x: anchor.x, y: anchor.y });
}

function copyAssetContractV2QcCollisionEnvelope(envelope: AssetContractV2CollisionEnvelope): AssetContractV2CollisionEnvelope {
  return Object.freeze({ x: envelope.x, y: envelope.y, width: envelope.width, height: envelope.height });
}

function copyAssetContractV2QcReadabilityEnvelope(envelope: AssetContractV2ReadabilityEnvelope): AssetContractV2ReadabilityEnvelope {
  return Object.freeze({ minimumRenderPixels: envelope.minimumRenderPixels, minimumContrastRatio: envelope.minimumContrastRatio });
}

/**
 * Creates a browser-safe QC view that keeps product semantics, descriptor metadata, and animation behavior distinct.
 * @param semanticCandidate Untrusted semantic role/state requested by gameplay.
 * @param descriptorCandidate Untrusted physical descriptor selected by presentation.
 * @returns An immutable diagnostic payload with no direct physical asset path.
 * @throws When the semantic identity or descriptor fails its Asset Contract v2 validation boundary.
 */
export function createAssetContractV2QcDiagnostic(
  semanticCandidate: unknown,
  descriptorCandidate: unknown,
): AssetContractV2QcDiagnostic {
  const semantic = assetContractV2SemanticRequirementSchema.parse(semanticCandidate);
  const descriptor = validateAssetContractV2Descriptor(descriptorCandidate);
  const physicalDescriptor = Object.freeze({
    descriptorId: descriptor.descriptorId,
    catalogEntryKey: descriptor.catalogEntryKey,
    mediaKind: descriptor.mediaKind,
    release: Object.freeze({ ...descriptor.release }),
    geometry: descriptor.geometry ? Object.freeze({ ...descriptor.geometry }) : undefined,
    anchor: copyAssetContractV2QcAnchor(descriptor.anchor),
    renderScale: descriptor.renderScale,
    collisionEnvelope: copyAssetContractV2QcCollisionEnvelope(descriptor.collisionEnvelope),
    readabilityEnvelope: copyAssetContractV2QcReadabilityEnvelope(descriptor.readabilityEnvelope),
  });
  const animation = descriptor.mediaKind === "animation" && descriptor.clips && descriptor.directions
    ? Object.freeze({
      clips: Object.freeze(descriptor.clips.map((clip) => Object.freeze({
        clipId: clip.id,
        frameCount: clip.frames.length,
        fps: clip.timing.fps,
        loop: clip.timing.loop,
      }))),
      directions: Object.freeze(descriptor.directions.map((direction) => Object.freeze({ ...direction }))),
    })
    : null;
  return Object.freeze({
    semantic: Object.freeze({ role: semantic.role, state: semantic.state, identity: `${semantic.role}:${semantic.state}` }),
    physicalDescriptor,
    animation,
  });
}


/** Semantic identity projected for suitability review. */
export interface StandardPackSuitabilityQcSemanticView {
  /** Product-facing semantic role. */
  readonly role: string;
  /** Product-facing semantic state. */
  readonly state: string;
  /** Stable role/state display identity. */
  readonly identity: string;
}

/** Physical descriptor identity projected without resolving media. */
export interface StandardPackSuitabilityQcDescriptorView {
  /** Stable descriptor identity. */
  readonly descriptorId: string;
  /** Canonical or proposed semantic catalog key. */
  readonly catalogEntryKey: string;
  /** SHA-256 descriptor digest. */
  readonly descriptorDigest: string;
  /** Accepted release identity for canonical candidates, otherwise null. */
  readonly release: AssetContractV2ReleaseIdentity | null;
}

/** Independent reviewer finding projected with immutable evidence identifiers. */
export interface StandardPackSuitabilityQcReviewerFindingView {
  /** Candidate identity reviewed. */
  readonly candidateId: string;
  /** Independent reviewer identity. */
  readonly reviewerId: string;
  /** Review completion timestamp. */
  readonly reviewedAt: string;
  /** Reviewer suitability result. */
  readonly result: "suitable" | "ingestion-required" | "unsuitable";
  /** Evidence-backed reviewer summary. */
  readonly summary: string;
  /** Supporting evidence identifiers. */
  readonly evidenceIds: readonly string[];
  /** SHA-256 reviewer finding digest. */
  readonly findingDigest: string;
}

/** Immutable source provenance projected for suitability review. */
export interface StandardPackSuitabilityQcProvenanceView {
  /** Candidate identity. */
  readonly candidateId: string;
  /** Exact source identity. */
  readonly sourceIdentity: string;
  /** SHA-256 source digest. */
  readonly sourceSha256: string;
  /** SHA-256 source-receipt digest. */
  readonly sourceReceiptDigest: string;
  /** Ordered chain-of-custody evidence identifiers. */
  readonly chainOfCustody: readonly string[];
}

/** Fail-closed license review projected with immutable obligations. */
export interface StandardPackSuitabilityQcLicenseView {
  /** Candidate identity. */
  readonly candidateId: string;
  /** License review status. */
  readonly status: "pending" | "approved" | "rejected";
  /** Reviewed license identity, or null before approval. */
  readonly licenseId: string | null;
  /** Supporting evidence identity. */
  readonly evidenceId: string;
  /** Reviewer identity, or null before review. */
  readonly reviewedBy: string | null;
  /** Review timestamp, or null before review. */
  readonly reviewedAt: string | null;
  /** Retained license obligations. */
  readonly obligations: readonly string[];
}

/** Candidate comparison and attribution projected for suitability review. */
export interface StandardPackSuitabilityQcCandidateView {
  /** Stable candidate identity. */
  readonly candidateId: string;
  /** Canonical or legacy source class. */
  readonly origin: "canonical" | "legacy";
  /** Candidate semantic identity. */
  readonly semantic: StandardPackSuitabilityQcSemanticView;
  /** Candidate descriptor identity. */
  readonly descriptor: StandardPackSuitabilityQcDescriptorView;
  /** Complete visual and technical comparison matrix. */
  readonly comparison: Readonly<StandardPackSuitabilityComparison>;
  /** Whether the candidate still requires canonical ingestion. */
  readonly requiresCanonicalIngestion: boolean;
  /** Independent reviewer finding. */
  readonly reviewerFinding: StandardPackSuitabilityQcReviewerFindingView;
  /** Immutable source provenance. */
  readonly provenance: StandardPackSuitabilityQcProvenanceView;
  /** Fail-closed license review. */
  readonly license: StandardPackSuitabilityQcLicenseView;
  /** Credit obligation or evidence-backed waiver. */
  readonly credit: Readonly<StandardPackSuitabilityCredit>;
}

/** One disclosed limitation projected for suitability review. */
export interface StandardPackSuitabilityQcLimitationView {
  /** Stable limitation identity. */
  readonly limitationId: string;
  /** Candidate identity, or null for a dossier-wide limitation. */
  readonly candidateId: string | null;
  /** Review severity. */
  readonly severity: "low" | "medium" | "high" | "blocking";
  /** Evidence-backed limitation summary. */
  readonly summary: string;
  /** Supporting evidence identifiers. */
  readonly evidenceIds: readonly string[];
}

/** Decision state projected separately from candidate evidence. */
export interface StandardPackSuitabilityQcDecisionView {
  /** Closed suitability disposition. */
  readonly disposition: "reuse-canonical" | "ingest-canonical" | "blocked";
  /** Selected candidate, or null for blocked absence. */
  readonly candidateId: string | null;
  /** Selected descriptor, or null for blocked absence. */
  readonly descriptorId: string | null;
  /** Required next evidence action. */
  readonly nextStep: "publish-accepted-binding" | "canonical-ingestion-required" | "remain-blocked";
  /** Evidence-backed rationale. */
  readonly rationale: string;
  /** Independent reviewer approval status. */
  readonly reviewerApprovalStatus: "pending" | "accepted" | "rejected";
  /** Product-owner approval status. */
  readonly ownerApprovalStatus: "pending" | "accepted" | "rejected";
  /** Whether an accepted manifest was supplied and validated. */
  readonly acceptanceStatus: "draft" | "accepted";
}

/** Explicitly denied production and rollout authority. */
export interface StandardPackSuitabilityQcAuthorizationView {
  /** Production exposure remains prohibited. */
  readonly productionUseAuthorized: false;
  /** Title migration remains prohibited. */
  readonly migrationAuthorized: false;
  /** Cutover remains prohibited. */
  readonly cutoverAuthorized: false;
  /** Deployment remains prohibited. */
  readonly deploymentAuthorized: false;
}

/** Optional accepted-manifest identity projected without publication authority. */
export interface StandardPackSuitabilityQcAcceptanceView {
  /** Draft-only or accepted-manifest state. */
  readonly status: "draft" | "accepted";
  /** Accepted manifest identity, or null for a draft. */
  readonly manifestId: string | null;
  /** Accepted manifest digest, or null for a draft. */
  readonly manifestDigest: string | null;
}

/** Immutable evidence-only suitability view consumed by browser QC. */
export interface StandardPackSuitabilityQcView {
  /** Stable dossier identity. */
  readonly dossierId: string;
  /** Dossier creation timestamp. */
  readonly createdAt: string;
  /** Requesting product title. */
  readonly requestingTitle: string;
  /** Requesting cartridge. */
  readonly requestingCartridge: string;
  /** Requested semantic identity. */
  readonly semantic: StandardPackSuitabilityQcSemanticView;
  /** Requested behavior retained separately from candidate selection. */
  readonly behavior: Readonly<StandardPackPhysicalBehaviorConstraints>;
  /** All independently reviewed candidates. */
  readonly candidates: readonly StandardPackSuitabilityQcCandidateView[];
  /** Selected descriptor, or null for blocked absence. */
  readonly selectedDescriptor: StandardPackSuitabilityQcDescriptorView | null;
  /** Closed decision and approval state. */
  readonly decision: StandardPackSuitabilityQcDecisionView;
  /** Disclosed limitations. */
  readonly limitations: readonly StandardPackSuitabilityQcLimitationView[];
  /** Explicitly denied production and rollout authority. */
  readonly authorization: StandardPackSuitabilityQcAuthorizationView;
  /** Optional accepted-manifest identity. */
  readonly acceptance: StandardPackSuitabilityQcAcceptanceView;
}

/**
 * Copies one validated descriptor identity without resolving its catalog key.
 * @param descriptor Validated suitability descriptor identity.
 * @returns An immutable browser-safe descriptor identity.
 */
function copyStandardPackSuitabilityDescriptor(
  descriptor: StandardPackSuitabilityDossier["candidates"][number]["descriptor"],
): StandardPackSuitabilityQcDescriptorView {
  return Object.freeze({
    descriptorId: descriptor.descriptorId,
    catalogEntryKey: descriptor.catalogEntryKey,
    descriptorDigest: descriptor.descriptorDigest,
    release: descriptor.release ? Object.freeze({ ...descriptor.release }) : null,
  });
}

/**
 * Copies one validated candidate and its linked review evidence.
 * @param dossier Integrity-validated suitability dossier.
 * @param candidate Validated candidate to project.
 * @returns An immutable candidate review view.
 * @throws When required linked evidence is unexpectedly absent.
 */
function copyStandardPackSuitabilityCandidate(
  dossier: StandardPackSuitabilityDossier,
  candidate: StandardPackSuitabilityDossier["candidates"][number],
): StandardPackSuitabilityQcCandidateView {
  const reviewerFinding = dossier.reviewerFindings.find(
    (record) => record.candidateId === candidate.candidateId,
  );
  const provenance = dossier.provenance.find(
    (record) => record.candidateId === candidate.candidateId,
  );
  const license = dossier.licensing.find(
    (record) => record.candidateId === candidate.candidateId,
  );
  const credit = dossier.credits.find(
    (record) => record.candidateId === candidate.candidateId,
  );
  if (!reviewerFinding || !provenance || !license || !credit) {
    throw new Error("Validated suitability candidate is missing linked QC evidence");
  }
  return Object.freeze({
    candidateId: candidate.candidateId,
    origin: candidate.origin,
    semantic: Object.freeze({
      role: candidate.semantic.role,
      state: candidate.semantic.state,
      identity: candidate.semantic.role + ":" + candidate.semantic.state,
    }),
    descriptor: copyStandardPackSuitabilityDescriptor(candidate.descriptor),
    comparison: Object.freeze({ ...candidate.suitability }),
    requiresCanonicalIngestion: candidate.requiresCanonicalIngestion,
    reviewerFinding: Object.freeze({
      ...reviewerFinding,
      evidenceIds: Object.freeze([...reviewerFinding.evidenceIds]),
    }),
    provenance: Object.freeze({
      ...provenance,
      chainOfCustody: Object.freeze([...provenance.chainOfCustody]),
    }),
    license: Object.freeze({
      ...license,
      obligations: Object.freeze([...license.obligations]),
    }),
    credit: Object.freeze({ ...credit }),
  });
}

/**
 * Copies a validated suitability decision into a browser-safe review view.
 * @param decision Draft or accepted decision.
 * @param acceptanceStatus Whether an accepted manifest was validated.
 * @returns An immutable decision view.
 */
function copyStandardPackSuitabilityDecision(
  decision: StandardPackSuitabilityDecision,
  acceptanceStatus: "draft" | "accepted",
): StandardPackSuitabilityQcDecisionView {
  return Object.freeze({
    disposition: decision.disposition,
    candidateId: decision.candidateId,
    descriptorId: decision.descriptorId,
    nextStep: decision.nextStep,
    rationale: decision.rationale,
    reviewerApprovalStatus: decision.reviewerApproval.status,
    ownerApprovalStatus: decision.ownerApproval.status,
    acceptanceStatus,
  });
}

/**
 * Copies the validated request behavior without selecting or resolving media.
 * @param behavior Validated suitability behavior.
 * @returns A deeply immutable request behavior.
 */
function copyStandardPackSuitabilityBehavior(
  behavior: StandardPackPhysicalBehaviorConstraints,
): Readonly<StandardPackPhysicalBehaviorConstraints> {
  const requiredDirections = [...behavior.requiredDirections];
  const requiredClips = [...behavior.requiredClips];
  const audienceBands = [...behavior.audienceBands];
  const locales = [...behavior.locales];
  const accessibilityNeeds = [...behavior.accessibilityNeeds];
  Object.freeze(requiredDirections);
  Object.freeze(requiredClips);
  Object.freeze(audienceBands);
  Object.freeze(locales);
  Object.freeze(accessibilityNeeds);
  return Object.freeze({
    ...behavior,
    requiredDirections,
    requiredClips,
    minimumGeometry: behavior.minimumGeometry
      ? Object.freeze({ ...behavior.minimumGeometry })
      : null,
    audienceBands,
    locales,
    accessibilityNeeds,
  });
}

/**
 * Validates dossier integrity and projects an evidence-only suitability QC view.
 * @param dossierCandidate Untrusted hash-bound draft dossier.
 * @param acceptedManifestCandidate Optional untrusted accepted decision manifest.
 * @returns An immutable view that never resolves, materializes, ingests, creates releases, or publishes.
 * @throws When dossier or optional manifest structure, linkage, or SHA-256 integrity fails.
 */
export async function createStandardPackSuitabilityQcView(
  dossierCandidate: unknown,
  acceptedManifestCandidate?: unknown,
): Promise<StandardPackSuitabilityQcView> {
  const dossier = await validateStandardPackSuitabilityDossier(dossierCandidate);
  const acceptedManifest = acceptedManifestCandidate === undefined
    ? null
    : await validateStandardPackSuitabilityAcceptedDecisionManifest(
      dossier,
      acceptedManifestCandidate,
    );
  const decision = acceptedManifest?.decision ?? dossier.decision;
  const acceptanceStatus = acceptedManifest ? "accepted" : "draft";
  const candidates = Object.freeze(dossier.candidates.map(
    (candidate) => copyStandardPackSuitabilityCandidate(dossier, candidate),
  ));
  const selectedCandidate = decision.candidateId === null
    ? null
    : candidates.find((candidate) => candidate.candidateId === decision.candidateId) ?? null;
  return Object.freeze({
    dossierId: dossier.dossierId,
    createdAt: dossier.createdAt,
    requestingTitle: dossier.request.requestingTitle,
    requestingCartridge: dossier.request.requestingCartridge,
    semantic: Object.freeze({
      role: dossier.request.semantic.role,
      state: dossier.request.semantic.state,
      identity: dossier.request.semantic.role + ":" + dossier.request.semantic.state,
    }),
    behavior: copyStandardPackSuitabilityBehavior(dossier.request.behavior),
    candidates,
    selectedDescriptor: selectedCandidate?.descriptor ?? null,
    decision: copyStandardPackSuitabilityDecision(decision, acceptanceStatus),
    limitations: Object.freeze(dossier.limitations.map((limitation) => Object.freeze({
      ...limitation,
      evidenceIds: Object.freeze([...limitation.evidenceIds]),
    }))),
    authorization: Object.freeze({ ...decision.authorization }),
    acceptance: Object.freeze({
      status: acceptanceStatus,
      manifestId: acceptedManifest?.manifestId ?? null,
      manifestDigest: acceptedManifest?.manifestDigest ?? null,
    }),
  });
}

/** Runtime-validated Advantage Games QC control state. */
export const qcControlsSchema = z.object({
  fixture: z.enum(["english-short", "english-long", "thai-short", "thai-long", "duplicates"]).default("english-short"),
  difficulty: z.enum(["gentle", "standard", "challenge"]).default("standard"),
  profile: z.enum(["auto", "compact", "wide"]).default("auto"),
  inputMode: z.enum(["touch", "pointer-keyboard", "hybrid"]).default("pointer-keyboard"),
  textScale: z.number().finite().min(1).max(2).default(1),
  touchScale: z.number().finite().min(1).max(2).default(1),
  safeRegions: z.boolean().default(false),
}).strict();

/** Validated QC control state. */
export type QcControls = z.infer<typeof qcControlsSchema>;

/**
 * Parses untrusted authoring/QC controls and fails closed for unsupported values.
 * @param candidate Partial or complete external control values.
 * @returns Validated controls with deterministic defaults.
 * @throws When a value is unknown, out of range, or an undeclared field is present.
 */
export function parseQcControls(candidate: unknown): QcControls {
  const result = qcControlsSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`QC controls are invalid: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return Object.freeze(result.data);
}

/** Performance budgets enforced by the deterministic QC monitor. */
export interface PerformanceBudgets {
  /** Maximum frame time in milliseconds. */
  readonly frameTimeMs: number;
  /** Maximum live object count. */
  readonly objects: number;
  /** Maximum selected physical asset count. */
  readonly assets: number;
  /** Maximum observed memory bytes. */
  readonly memoryBytes: number;
  /** Maximum cartridge bundle bytes. */
  readonly bundleBytes: number;
}

/** One performance sample. */
export type PerformanceSample = PerformanceBudgets;

/** Performance metric identifier. */
export type PerformanceMetric = keyof PerformanceBudgets;

/** One deterministic budget violation. */
export interface PerformanceViolation {
  /** Metric exceeding its budget. */
  readonly metric: PerformanceMetric;
  /** Maximum observed value. */
  readonly observed: number;
  /** Configured budget ceiling. */
  readonly budget: number;
}

/** Deterministic performance report. */
export interface PerformanceReport {
  /** Whether every maximum remained within budget. */
  readonly passed: boolean;
  /** Maximum values observed across samples. */
  readonly maxima: PerformanceSample;
  /** Ordered budget violations. */
  readonly violations: readonly PerformanceViolation[];
}

/** Controllably sampled performance monitor. */
export interface PerformanceMonitor {
  /**
   * Records one complete instrumentation sample.
   * @param sample Frame, object, asset, memory, and bundle measurements.
   */
  record(sample: PerformanceSample): void;
  /** Returns a deterministic maximum-and-budget report. */
  report(): PerformanceReport;
  /** Clears all samples. */
  reset(): void;
}

const PERFORMANCE_METRICS: readonly PerformanceMetric[] = [
  "frameTimeMs",
  "objects",
  "assets",
  "memoryBytes",
  "bundleBytes",
];

function validatePerformanceValues(values: PerformanceBudgets, label: string): void {
  if (!PERFORMANCE_METRICS.every((metric) => Number.isFinite(values[metric]) && values[metric] >= 0)) {
    throw new Error(`${label} requires finite non-negative values for every metric`);
  }
}

/**
 * Creates a deterministic performance monitor for frame, object, asset, memory, and bundle budgets.
 * @param budgets Maximum accepted values.
 * @returns A monitor whose report uses maxima across controllably recorded samples.
 */
export function createPerformanceMonitor(budgets: PerformanceBudgets): PerformanceMonitor {
  validatePerformanceValues(budgets, "Performance budgets");
  let samples: PerformanceSample[] = [];
  return Object.freeze({
    record(sample: PerformanceSample): void {
      validatePerformanceValues(sample, "Performance sample");
      samples.push(Object.freeze({ ...sample }));
    },
    report(): PerformanceReport {
      const maxima = Object.fromEntries(PERFORMANCE_METRICS.map((metric) => [
        metric,
        samples.reduce((maximum, sample) => Math.max(maximum, sample[metric]), 0),
      ])) as unknown as PerformanceSample;
      const violations = PERFORMANCE_METRICS.flatMap((metric) => maxima[metric] > budgets[metric]
        ? [{ metric, observed: maxima[metric], budget: budgets[metric] }]
        : []);
      return Object.freeze({ passed: violations.length === 0, maxima: Object.freeze(maxima), violations: Object.freeze(violations) });
    },
    reset(): void {
      samples = [];
    },
  });
}

/** Provider-neutral locator boundary needed by browser QC helpers. */
export interface BrowserQcLocator {
  /** Activates the located semantic element. */
  click(): void | Promise<void>;
  /** Reads complete accessible text from the located element. */
  textContent(): string | null | Promise<string | null>;
}

/** Provider-neutral page boundary needed by browser QC helpers. */
export interface BrowserQcPageAdapter {
  /** Updates the real browser viewport. */
  setViewportSize(viewport: { width: number; height: number }): void | Promise<void>;
  /** Real keyboard adapter. */
  readonly keyboard: { press(key: string): void | Promise<void> };
  /** Real pointer adapter. */
  readonly mouse: { click(x: number, y: number): void | Promise<void> };
  /** Locates an element through the browser provider. */
  locator(selector: string): BrowserQcLocator;
}

/** Provider-neutral real-browser QC driver. */
export interface BrowserQcDriver {
  /** Resizes the real browser viewport. */
  resize(viewport: { width: number; height: number }): Promise<void>;
  /** Sends a real keyboard press. */
  press(key: string): Promise<void>;
  /** Sends a real pointer activation. */
  tap(point: { x: number; y: number }): Promise<void>;
  /** Activates a semantic control by selector. */
  click(selector: string): Promise<void>;
  /** Reads complete browser-rendered text by selector. */
  readText(selector: string): Promise<string>;
  /** Reads required attribution from the conventional credits surface. */
  inspectAttribution(): Promise<string>;
}

/**
 * Creates provider-neutral browser helpers over an injected Playwright-like page adapter.
 * @param page Browser page adapter supplied by tests or a host.
 * @returns Helpers for real input, resize, controls, status, completion, and attribution inspection.
 */
export function createBrowserQcDriver(page: BrowserQcPageAdapter): BrowserQcDriver {
  return Object.freeze({
    async resize(viewport: { width: number; height: number }): Promise<void> {
      if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width <= 0 || viewport.height <= 0) {
        throw new Error("Browser QC viewport must use positive integer dimensions");
      }
      await page.setViewportSize(viewport);
    },
    async press(key: string): Promise<void> {
      if (!key.trim()) throw new Error("Browser QC keyboard key must not be blank");
      await page.keyboard.press(key);
    },
    async tap(point: { x: number; y: number }): Promise<void> {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Browser QC pointer point must be finite");
      await page.mouse.click(point.x, point.y);
    },
    async click(selector: string): Promise<void> {
      if (!selector.trim()) throw new Error("Browser QC selector must not be blank");
      await page.locator(selector).click();
    },
    async readText(selector: string): Promise<string> {
      if (!selector.trim()) throw new Error("Browser QC selector must not be blank");
      return (await page.locator(selector).textContent()) ?? "";
    },
    async inspectAttribution(): Promise<string> {
      return (await page.locator("[data-apk-attribution]").textContent()) ?? "";
    },
  });
}
