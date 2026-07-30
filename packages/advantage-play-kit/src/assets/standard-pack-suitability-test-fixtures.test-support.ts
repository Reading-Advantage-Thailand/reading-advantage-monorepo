import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const FIXTURE_TIME = "2026-07-29T06:00:00.000Z";

const acceptedRelease = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});

const noProductionAuthorization = Object.freeze({
  productionUseAuthorized: false as const,
  migrationAuthorized: false as const,
  cutoverAuthorized: false as const,
  deploymentAuthorized: false as const,
});

const ownerPending = Object.freeze({ status: "pending" as const });
const reviewerAccepted = Object.freeze({
  status: "accepted" as const,
  actorId: "fixture-reviewer",
  decidedAt: FIXTURE_TIME,
  evidenceDigest: DIGEST_C,
});

const passingComparison = Object.freeze({
  semanticFit: "pass" as const,
  visualReadability: "pass" as const,
  frameDirectionCompatibility: "pass" as const,
  animationBehavior: "pass" as const,
  geometry: "pass" as const,
  collisionEnvelope: "pass" as const,
  audienceAppropriateness: "pass" as const,
  localization: "not-applicable" as const,
  accessibility: "pass" as const,
  sourceReceipt: "pass" as const,
  creditObligations: "pass" as const,
});

/** Returns an immutable draft request shared by deterministic comparison fixtures. */
function createRequest() {
  return {
    requestId: "fixture-player-walk",
    requestingTitle: "fixture-title",
    requestingCartridge: "fixture-cartridge",
    requestedAt: FIXTURE_TIME,
    semantic: { role: "player", state: "walk" },
    behavior: {
      mediaKind: "animation" as const,
      requiredDirections: ["down"] as const,
      requiredClips: ["walk"] as const,
      minimumFramesPerClip: 6,
      minimumGeometry: { width: 192, height: 32 },
      collisionEnvelopeRequired: true,
      audienceBands: ["grades-3-5"],
      locales: ["en"],
      accessibilityNeeds: ["high-contrast-silhouette"],
    },
  };
}

/** Creates hash-shaped evidence records with safe repository-relative fixture locators. */
function createEvidence(id: string, kind: "canonical-catalog" | "legacy-source" | "visual-comparison" | "technical-comparison" | "absence", digest: string) {
  return {
    evidenceId: id,
    kind,
    locator: `measure/tracks/apk_standard_pack_suitability_ingestion_20260728/fixtures/${id}.json`,
    sha256: digest,
    sourceReceiptDigest: acceptedRelease.sourceReceiptDigest,
    capturedAt: FIXTURE_TIME,
    recordedBy: "fixture-reviewer",
  };
}

/** Creates a draft decision with no production, migration, cutover, or deployment authority. */
function createDecision(
  disposition: "reuse-canonical" | "ingest-canonical" | "blocked",
  candidateId: string | null,
  descriptorId: string | null,
) {
  if (disposition === "blocked") {
    return {
      disposition,
      candidateId: null,
      descriptorId: null,
      nextStep: "remain-blocked" as const,
      rationale: "The deterministic fixture records an evidence-backed absence.",
      reviewerApproval: reviewerAccepted,
      ownerApproval: ownerPending,
      authorization: noProductionAuthorization,
      decisionDigest: DIGEST_B,
    };
  }
  return {
    disposition,
    candidateId: candidateId ?? "missing-candidate",
    descriptorId: descriptorId ?? "missing-descriptor",
    nextStep: disposition === "reuse-canonical"
      ? "publish-accepted-binding" as const
      : "canonical-ingestion-required" as const,
    rationale: "The deterministic fixture remains a non-authoritative draft decision.",
    reviewerApproval: reviewerAccepted,
    ownerApproval: ownerPending,
    authorization: noProductionAuthorization,
    decisionDigest: DIGEST_B,
  };
}

/** Creates candidate-linked records required by the dossier cross-reference contract. */
function createCandidateRecords(candidateId: string, sourceEvidenceId: string, sourceIdentity: string) {
  return {
    reviewerFinding: {
      candidateId,
      reviewerId: "fixture-reviewer",
      reviewedAt: FIXTURE_TIME,
      result: "suitable" as const,
      summary: "The candidate satisfies the requested fixture behavior.",
      evidenceIds: [`${candidateId}-visual`, `${candidateId}-technical`],
      findingDigest: DIGEST_C,
    },
    provenance: {
      candidateId,
      sourceIdentity,
      sourceSha256: DIGEST_A,
      sourceReceiptDigest: acceptedRelease.sourceReceiptDigest,
      chainOfCustody: [sourceEvidenceId],
    },
    license: {
      candidateId,
      status: "approved" as const,
      licenseId: "LicenseRef-Fixture",
      evidenceId: sourceEvidenceId,
      reviewedBy: "fixture-reviewer",
      reviewedAt: FIXTURE_TIME,
      obligations: ["retain-credit"],
    },
    credit: {
      candidateId,
      required: true as const,
      displayText: "Fixture credit",
      evidenceId: sourceEvidenceId,
    },
  };
}

const reusableCandidateId = "canonical-hero-01-walk";
const reusableRecords = createCandidateRecords(
  reusableCandidateId,
  "canonical-hero-01-source",
  "standard-pack:top-down/32x32/characters/hero-01",
);

/** A valid reuse draft pinned to the real hero-01 key and root-accepted release triple. */
export const SUITABLE_HERO_01_REUSE_FIXTURE = Object.freeze({
  schemaVersion: 1 as const,
  dossierId: "fixture-hero-01-reuse",
  createdAt: FIXTURE_TIME,
  request: createRequest(),
  sourceEvidence: [
    createEvidence("canonical-hero-01-source", "canonical-catalog", DIGEST_A),
    createEvidence(`${reusableCandidateId}-visual`, "visual-comparison", DIGEST_B),
    createEvidence(`${reusableCandidateId}-technical`, "technical-comparison", DIGEST_C),
  ],
  candidates: [{
    candidateId: reusableCandidateId,
    origin: "canonical" as const,
    semantic: { role: "player", state: "walk" },
    descriptor: {
      descriptorId: "hero-01-walk-canonical",
      catalogEntryKey: "top-down/32x32/characters/hero-01",
      descriptorDigest: DIGEST_A,
      release: acceptedRelease,
    },
    sourceEvidenceIds: ["canonical-hero-01-source"],
    comparisonEvidenceIds: [`${reusableCandidateId}-visual`, `${reusableCandidateId}-technical`],
    suitability: passingComparison,
    requiresCanonicalIngestion: false,
  }],
  reviewerFindings: [reusableRecords.reviewerFinding],
  limitations: [],
  provenance: [reusableRecords.provenance],
  licensing: [reusableRecords.license],
  credits: [reusableRecords.credit],
  releaseBinding: {
    predecessorRelease: acceptedRelease,
    predecessorDescriptorIds: ["hero-01-walk-canonical"],
    proposedSuccessorRelease: null,
    policy: "successor-evidence-required-before-publication" as const,
  },
  decision: createDecision("reuse-canonical", reusableCandidateId, "hero-01-walk-canonical"),
  dossierDigest: DIGEST_A,
});

const incompatibleCandidateId = "canonical-hero-02-walk";
const incompatibleRecords = createCandidateRecords(
  incompatibleCandidateId,
  "canonical-hero-02-source",
  "standard-pack:side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72",
);

/** A comparison draft where a visually similar canonical candidate is recorded but unselectable for behavior. */
export const VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE = Object.freeze({
  ...SUITABLE_HERO_01_REUSE_FIXTURE,
  dossierId: "fixture-hero-01-comparison",
  sourceEvidence: [
    ...SUITABLE_HERO_01_REUSE_FIXTURE.sourceEvidence,
    createEvidence("canonical-hero-02-source", "canonical-catalog", DIGEST_A),
    createEvidence(`${incompatibleCandidateId}-visual`, "visual-comparison", DIGEST_B),
    createEvidence(`${incompatibleCandidateId}-technical`, "technical-comparison", DIGEST_C),
  ],
  candidates: [
    ...SUITABLE_HERO_01_REUSE_FIXTURE.candidates,
    {
      candidateId: incompatibleCandidateId,
      origin: "canonical" as const,
      semantic: { role: "player", state: "walk" },
      descriptor: {
        descriptorId: "hero-02-walk-incompatible",
        catalogEntryKey: "side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72",
        descriptorDigest: DIGEST_B,
        release: acceptedRelease,
      },
      sourceEvidenceIds: ["canonical-hero-02-source"],
      comparisonEvidenceIds: [`${incompatibleCandidateId}-visual`, `${incompatibleCandidateId}-technical`],
      suitability: {
        ...passingComparison,
        frameDirectionCompatibility: "fail" as const,
        animationBehavior: "fail" as const,
      },
      requiresCanonicalIngestion: false,
    },
  ],
  reviewerFindings: [
    ...SUITABLE_HERO_01_REUSE_FIXTURE.reviewerFindings,
    {
      ...incompatibleRecords.reviewerFinding,
      result: "unsuitable" as const,
      summary: "The similar hero image lacks the required six-frame down walk behavior.",
    },
  ],
  provenance: [...SUITABLE_HERO_01_REUSE_FIXTURE.provenance, incompatibleRecords.provenance],
  licensing: [...SUITABLE_HERO_01_REUSE_FIXTURE.licensing, incompatibleRecords.license],
  credits: [...SUITABLE_HERO_01_REUSE_FIXTURE.credits, incompatibleRecords.credit],
});

const legacyCandidateId = "legacy-hero-walk";
const legacyRecords = createCandidateRecords(
  legacyCandidateId,
  "legacy-hero-source",
  "legacy:fixture-title/hero-walk",
);

/** A legacy draft that must remain unbound until canonical ingestion creates an additive release. */
export const LEGACY_INGESTION_REQUIRED_FIXTURE = Object.freeze({
  ...SUITABLE_HERO_01_REUSE_FIXTURE,
  dossierId: "fixture-legacy-hero-ingestion",
  sourceEvidence: [
    createEvidence("legacy-hero-source", "legacy-source", DIGEST_A),
    createEvidence(`${legacyCandidateId}-visual`, "visual-comparison", DIGEST_B),
    createEvidence(`${legacyCandidateId}-technical`, "technical-comparison", DIGEST_C),
  ],
  candidates: [{
    candidateId: legacyCandidateId,
    origin: "legacy" as const,
    semantic: { role: "player", state: "walk" },
    descriptor: {
      descriptorId: "legacy-hero-walk-proposed",
      catalogEntryKey: "proposed/top-down/characters/legacy-hero-walk",
      descriptorDigest: DIGEST_A,
      release: null,
    },
    sourceEvidenceIds: ["legacy-hero-source"],
    comparisonEvidenceIds: [`${legacyCandidateId}-visual`, `${legacyCandidateId}-technical`],
    suitability: passingComparison,
    requiresCanonicalIngestion: true,
  }],
  reviewerFindings: [{
    ...legacyRecords.reviewerFinding,
    result: "ingestion-required" as const,
    summary: "The legacy source meets behavior but cannot claim a canonical release before ingestion.",
  }],
  provenance: [legacyRecords.provenance],
  licensing: [legacyRecords.license],
  credits: [legacyRecords.credit],
  releaseBinding: {
    predecessorRelease: acceptedRelease,
    predecessorDescriptorIds: ["legacy-hero-walk-proposed"],
    proposedSuccessorRelease: null,
    policy: "successor-evidence-required-before-publication" as const,
  },
  decision: createDecision("ingest-canonical", legacyCandidateId, "legacy-hero-walk-proposed"),
});

/** An evidence-backed absence draft that blocks the requested role without a candidate or publication authority. */
export const BLOCKED_ABSENCE_FIXTURE = Object.freeze({
  ...SUITABLE_HERO_01_REUSE_FIXTURE,
  dossierId: "fixture-hero-walk-blocked-absence",
  sourceEvidence: [
    createEvidence("canonical-search", "canonical-catalog", DIGEST_A),
    createEvidence("absence-visual", "visual-comparison", DIGEST_B),
    createEvidence("absence-technical", "technical-comparison", DIGEST_C),
    createEvidence("candidate-absence", "absence", DIGEST_A),
  ],
  candidates: [],
  reviewerFindings: [],
  limitations: [{
    limitationId: "no-suitable-candidate",
    candidateId: null,
    severity: "blocking" as const,
    summary: "No canonical or ingestible legacy candidate satisfies the requested behavior.",
    evidenceIds: ["candidate-absence"],
  }],
  provenance: [],
  licensing: [],
  credits: [],
  decision: createDecision("blocked", null, null),
});
