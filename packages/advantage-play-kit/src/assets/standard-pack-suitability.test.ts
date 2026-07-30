import {
  readStandardPackCatalogFixture,
  readStandardPackCohortGuardSource,
} from "./standard-pack-test-paths.test-support.js";

import { describe, expect, it } from "vitest";

import {
  serializeStandardPackCanonicalIngestionReceiptPayload,
  serializeStandardPackSuitabilityAcceptedDecisionManifestPayload,
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityDossierPayload,
  STANDARD_PACK_SUITABILITY_DISPOSITIONS,
  standardPackSuitabilityAcceptedDecisionManifestSchema,
  standardPackSuitabilityDecisionSchema,
  standardPackSuitabilityDossierSchema,
  validateStandardPackCanonicalIngestionReceipt,
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";
import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import { createStandardAssetResolver, type StandardAssetCatalog } from "./standard-pack-release.js";
import {
  serializeStandardPackCohortSuitabilityBindingPayload,
  standardPackCohortSuitabilityEvidenceSchema,
  validateStandardPackCohortSuitabilityEvidence,
} from "./standard-pack-cohort-suitability.js";
import {
  compareCanonicalSuitabilityDescriptor,
  createCanonicalSuitabilitySearch,
  resolveAcceptedCanonicalReuse,
} from "./standard-pack-suitability-search.js";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const HERO_WALK_KEY = "side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72";
const HERO_IDLE_KEY = "top-down/32x32/characters/hero-01";
const acceptedCatalog = readStandardPackCatalogFixture();

function createApproval(status: "pending" | "accepted" = "accepted") {
  return status === "accepted"
    ? { status, actorId: "reviewer-1", decidedAt: "2026-07-29T02:00:00.000Z", evidenceDigest: DIGEST_C }
    : { status };
}

function createDecision(disposition: "reuse-canonical" | "ingest-canonical" | "blocked") {
  const common = {
    disposition,
    rationale: "The recorded evidence supports this bounded disposition.",
    reviewerApproval: createApproval(),
    ownerApproval: createApproval("pending"),
    authorization: {
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    },
    decisionDigest: DIGEST_B,
  };
  if (disposition === "blocked") {
    return { ...common, candidateId: null, descriptorId: null, nextStep: "remain-blocked" as const };
  }
  return {
    ...common,
    candidateId: disposition === "reuse-canonical" ? "canonical-player-walk" : "legacy-player-walk",
    descriptorId: disposition === "reuse-canonical" ? "player-walk-canonical" : "player-walk-proposed",
    nextStep: disposition === "reuse-canonical"
      ? "publish-accepted-binding" as const
      : "canonical-ingestion-required" as const,
  };
}

function createDossier() {
  const semantic = { role: "player", state: "walk" };
  const release = {
    version: "2026.07.23",
    catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
    sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
  };
  const candidateId = "canonical-player-walk";
  return {
    schemaVersion: 1,
    dossierId: "reading-player-walk-20260729",
    createdAt: "2026-07-29T01:00:00.000Z",
    request: {
      requestId: "reading-player-walk",
      requestingTitle: "reading-advantage",
      requestingCartridge: "word-runner",
      requestedAt: "2026-07-29T00:00:00.000Z",
      semantic,
      behavior: {
        mediaKind: "animation",
        requiredDirections: ["down"],
        requiredClips: ["walk"],
        minimumFramesPerClip: 3,
        minimumGeometry: { width: 32, height: 32 },
        collisionEnvelopeRequired: true,
        audienceBands: ["grades-3-5"],
        locales: ["en"],
        accessibilityNeeds: ["high-contrast-silhouette"],
      },
    },
    sourceEvidence: [
      {
        evidenceId: "canonical-source",
        kind: "canonical-catalog",
        locator: "standard-pack-release.json",
        sha256: DIGEST_A,
        sourceReceiptDigest: release.sourceReceiptDigest,
        capturedAt: "2026-07-29T00:10:00.000Z",
        recordedBy: "reviewer-1",
      },
      {
        evidenceId: "visual-comparison",
        kind: "visual-comparison",
        locator: "reviews/player-walk-visual.json",
        sha256: DIGEST_B,
        sourceReceiptDigest: release.sourceReceiptDigest,
        capturedAt: "2026-07-29T00:20:00.000Z",
        recordedBy: "reviewer-1",
      },
      {
        evidenceId: "technical-comparison",
        kind: "technical-comparison",
        locator: "reviews/player-walk-technical.json",
        sha256: DIGEST_C,
        sourceReceiptDigest: release.sourceReceiptDigest,
        capturedAt: "2026-07-29T00:30:00.000Z",
        recordedBy: "reviewer-1",
      },
    ],
    candidates: [{
      candidateId,
      origin: "canonical",
      semantic,
      descriptor: {
        descriptorId: "player-walk-canonical",
        catalogEntryKey: "side-view/native/player/walk",
        descriptorDigest: DIGEST_A,
        release,
      },
      sourceEvidenceIds: ["canonical-source"],
      comparisonEvidenceIds: ["visual-comparison", "technical-comparison"],
      suitability: {
        semanticFit: "pass",
        visualReadability: "pass",
        frameDirectionCompatibility: "pass",
        animationBehavior: "pass",
        geometry: "pass",
        collisionEnvelope: "pass",
        audienceAppropriateness: "pass",
        localization: "not-applicable",
        accessibility: "pass",
        sourceReceipt: "pass",
        creditObligations: "pass",
      },
      requiresCanonicalIngestion: false,
    }],
    reviewerFindings: [{
      candidateId,
      reviewerId: "reviewer-1",
      reviewedAt: "2026-07-29T01:30:00.000Z",
      result: "suitable",
      summary: "The canonical descriptor meets the requested visual and technical behavior.",
      evidenceIds: ["visual-comparison", "technical-comparison"],
      findingDigest: DIGEST_C,
    }],
    limitations: [],
    provenance: [{
      candidateId,
      sourceIdentity: "standard-pack:side-view/native/player/walk",
      sourceSha256: DIGEST_A,
      sourceReceiptDigest: release.sourceReceiptDigest,
      chainOfCustody: ["canonical-source"],
    }],
    licensing: [{
      candidateId,
      status: "approved",
      licenseId: "LicenseRef-ElvGames",
      evidenceId: "canonical-source",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-07-29T01:10:00.000Z",
      obligations: ["retain-credit"],
    }],
    credits: [{
      candidateId,
      required: true,
      displayText: "ElvGames standard asset pack",
      evidenceId: "canonical-source",
    }],
    releaseBinding: {
      predecessorRelease: release,
      predecessorDescriptorIds: ["player-walk-canonical"],
      proposedSuccessorRelease: null,
      policy: "successor-evidence-required-before-publication",
    },
    decision: createDecision("reuse-canonical"),
    dossierDigest: DIGEST_A,
  };
}

/** Computes a deterministic SHA-256 digest for an async integrity fixture. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Returns a structurally and cryptographically valid draft dossier fixture. */
async function createDigestValidDossier() {
  const draft = createDossier();
  const decision = { ...draft.decision, decisionDigest: "" };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision as never));
  const dossier = { ...draft, decision, dossierDigest: "" };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier as never));
  return dossier;
}

/** Returns a valid owner-accepted manifest bound to the supplied draft dossier. */
async function createDigestValidManifest(dossier: Awaited<ReturnType<typeof createDigestValidDossier>>) {
  const decision = {
    ...dossier.decision,
    reviewerApproval: createApproval(),
    ownerApproval: {
      status: "accepted" as const,
      actorId: "owner-1",
      decidedAt: "2026-07-29T03:00:00.000Z",
      evidenceDigest: DIGEST_A,
    },
    decisionDigest: "",
  };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision as never));
  const manifest = {
    schemaVersion: 1 as const,
    manifestId: "reading-player-walk-acceptance-20260729",
    acceptedAt: "2026-07-29T03:00:00.000Z",
    dossierId: dossier.dossierId,
    dossierDigest: dossier.dossierDigest,
    decision,
    reviewerApproval: decision.reviewerApproval,
    ownerApproval: decision.ownerApproval,
    releaseBinding: dossier.releaseBinding,
    authorization: decision.authorization,
    manifestDigest: "",
  };
  manifest.manifestDigest = await sha256(serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifest as never));
  return manifest;
}


/** Returns a structurally valid legacy-ingestion dossier for negative factor tests. */
function createIngestionDossier() {
  const dossier = createDossier();
  const candidateId = "legacy-player-walk";
  dossier.sourceEvidence[0] = {
    ...dossier.sourceEvidence[0],
    evidenceId: "legacy-source",
    kind: "legacy-source",
  };
  dossier.candidates = [{
    ...dossier.candidates[0],
    candidateId,
    origin: "legacy",
    descriptor: {
      ...dossier.candidates[0].descriptor,
      descriptorId: "player-walk-proposed",
      catalogEntryKey: "side-view/proposed/player/walk",
      release: null,
    },
    sourceEvidenceIds: ["legacy-source"],
    requiresCanonicalIngestion: true,
  }];
  dossier.reviewerFindings = [{
    ...dossier.reviewerFindings[0],
    candidateId,
    result: "ingestion-required",
  }];
  dossier.provenance = [{
    ...dossier.provenance[0],
    candidateId,
    chainOfCustody: ["legacy-source"],
  }];
  dossier.licensing = [{ ...dossier.licensing[0], candidateId, evidenceId: "legacy-source" }];
  dossier.credits = [{ ...dossier.credits[0], candidateId, evidenceId: "legacy-source" }];
  dossier.decision = createDecision("ingest-canonical");
  return dossier;
}

/** Returns a valid SHA-256-bound evidence-only canonical ingestion receipt. */
async function createDigestValidIngestionReceipt() {
  const dossier = createIngestionDossier();
  const candidate = dossier.candidates[0];
  const receipt = {
    schemaVersion: 1 as const,
    receiptId: "legacy-player-walk-ingestion-20260729",
    createdAt: "2026-07-29T04:00:00.000Z",
    candidateId: candidate.candidateId,
    sourceIdentity: dossier.provenance[0].sourceIdentity,
    sourceSha256: dossier.provenance[0].sourceSha256,
    sourceReceiptDigest: dossier.provenance[0].sourceReceiptDigest,
    license: dossier.licensing[0],
    credit: dossier.credits[0],
    catalogEntryKey: candidate.descriptor.catalogEntryKey,
    descriptorId: candidate.descriptor.descriptorId,
    descriptorDigest: DIGEST_B,
    predecessorRelease: dossier.releaseBinding.predecessorRelease,
    additiveRelease: {
      version: "2026.07.29",
      catalogDigest: DIGEST_B,
      sourceReceiptDigest: DIGEST_C,
    },
    authorization: dossier.decision.authorization,
    receiptDigest: "",
  };
  receipt.receiptDigest = await sha256(
    serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never),
  );
  return receipt;
}

/** Returns a structurally valid evidence-backed blocked dossier. */
function createBlockedDossier() {
  const dossier = createDossier();
  dossier.sourceEvidence.push({
    evidenceId: "candidate-absence",
    kind: "absence",
    locator: "reviews/player-walk-absence.json",
    sha256: DIGEST_A,
    sourceReceiptDigest: dossier.releaseBinding.predecessorRelease.sourceReceiptDigest,
    capturedAt: "2026-07-29T00:40:00.000Z",
    recordedBy: "reviewer-1",
  });
  dossier.candidates = [];
  dossier.reviewerFindings = [];
  dossier.provenance = [];
  dossier.licensing = [];
  dossier.credits = [];
  dossier.limitations = [{
    limitationId: "no-suitable-candidate",
    candidateId: null,
    severity: "blocking",
    summary: "No canonical or ingestible legacy candidate meets the requested behavior.",
    evidenceIds: ["candidate-absence"],
  }];
  dossier.decision = createDecision("blocked");
  return dossier;
}

describe("standard-pack suitability contracts", () => {
  it("accepts only the three explicit dispositions", () => {
    expect(STANDARD_PACK_SUITABILITY_DISPOSITIONS).toEqual([
      "reuse-canonical",
      "ingest-canonical",
      "blocked",
    ]);
    for (const disposition of STANDARD_PACK_SUITABILITY_DISPOSITIONS) {
      expect(standardPackSuitabilityDecisionSchema.safeParse(createDecision(disposition)).success).toBe(true);
    }
    expect(standardPackSuitabilityDecisionSchema.safeParse({
      ...createDecision("reuse-canonical"),
      disposition: "fallback-canonical",
    }).success).toBe(false);
  });

  it("rejects dossiers with incomplete source or comparison evidence", () => {
    const dossier = createDossier();
    expect(standardPackSuitabilityDossierSchema.parse(dossier).decision.disposition).toBe("reuse-canonical");
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      sourceEvidence: dossier.sourceEvidence.filter((evidence) => evidence.kind !== "technical-comparison"),
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: [{
        ...dossier.candidates[0],
        comparisonEvidenceIds: ["visual-comparison"],
      }],
    }).success).toBe(false);
  });

  it("rejects provisional or production authorization at the dossier boundary", () => {
    const dossier = createDossier();
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      decision: {
        ...dossier.decision,
        reviewerApproval: { status: "provisional" },
      },
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      decision: {
        ...dossier.decision,
        authorization: {
          ...dossier.decision.authorization,
          productionUseAuthorized: true,
        },
      },
    }).success).toBe(false);
  });

  it("rejects forged decision, dossier, and accepted-manifest SHA-256 values", async () => {
    const dossier = await createDigestValidDossier();
    await expect(validateStandardPackSuitabilityDossier(dossier)).resolves.toMatchObject({
      dossierId: dossier.dossierId,
    });
    await expect(validateStandardPackSuitabilityDossier({
      ...dossier,
      decision: { ...dossier.decision, decisionDigest: DIGEST_A },
    })).rejects.toThrow(/decision digest/i);
    await expect(validateStandardPackSuitabilityDossier({
      ...dossier,
      dossierDigest: DIGEST_B,
    })).rejects.toThrow(/dossier digest/i);

    const manifest = await createDigestValidManifest(dossier);
    await expect(validateStandardPackSuitabilityAcceptedDecisionManifest(dossier, manifest))
      .resolves.toMatchObject({ manifestId: manifest.manifestId });
    await expect(validateStandardPackSuitabilityAcceptedDecisionManifest(dossier, {
      ...manifest,
      manifestDigest: DIGEST_C,
    })).rejects.toThrow(/manifest digest/i);
  });

  it("rejects duplicate, dangling, and mislinked stable identifiers", () => {
    const dossier = createDossier();
    const duplicateEvidence = {
      ...dossier.sourceEvidence[0],
      locator: "reviews/duplicate-source.json",
    };
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      sourceEvidence: [...dossier.sourceEvidence, duplicateEvidence],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: [{
        ...dossier.candidates[0],
        sourceEvidenceIds: ["missing-source"],
      }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      decision: {
        ...dossier.decision,
        descriptorId: "different-descriptor",
      },
    }).success).toBe(false);
  });

  it.each([
    "https://example.invalid/review.json",
    "reviews/./review.json",
    "reviews/%2e%2e/secret.json",
  ])("rejects unsafe evidence locator %s", (locator) => {
    const dossier = createDossier();
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      sourceEvidence: [
        { ...dossier.sourceEvidence[0], locator },
        ...dossier.sourceEvidence.slice(1),
      ],
    }).success).toBe(false);
  });

  it.each(["pending", "rejected"] as const)(
    "rejects a %s reviewer approval on a selected draft decision",
    (status) => {
      const dossier = createDossier();
      const reviewerApproval = status === "pending"
        ? { status }
        : {
            status,
            actorId: "reviewer-1",
            decidedAt: "2026-07-29T02:00:00.000Z",
            evidenceDigest: DIGEST_C,
          };
      expect(standardPackSuitabilityDossierSchema.safeParse({
        ...dossier,
        decision: { ...dossier.decision, reviewerApproval },
      }).success).toBe(false);
    },
  );

  it.each(["pending", "rejected"] as const)(
    "rejects a %s approval in an accepted decision manifest",
    async (status) => {
      const dossier = await createDigestValidDossier();
      const manifest = await createDigestValidManifest(dossier);
      const ownerApproval = status === "pending"
        ? { status }
        : {
            status,
            actorId: "owner-1",
            decidedAt: "2026-07-29T03:00:00.000Z",
            evidenceDigest: DIGEST_A,
          };
      expect(standardPackSuitabilityAcceptedDecisionManifestSchema.safeParse({
        ...manifest,
        ownerApproval,
        decision: { ...manifest.decision, ownerApproval },
      }).success).toBe(false);
    },
  );

  it("rejects selected license, credit, factor, and predecessor failures", () => {
    const dossier = createDossier();
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      licensing: [{ ...dossier.licensing[0], status: "pending", licenseId: null, reviewedBy: null, reviewedAt: null }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      credits: [{ ...dossier.credits[0], required: false, displayText: null }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: [{
        ...dossier.candidates[0],
        suitability: { ...dossier.candidates[0].suitability, accessibility: "fail" },
      }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      releaseBinding: {
        ...dossier.releaseBinding,
        predecessorRelease: {
          ...dossier.releaseBinding.predecessorRelease,
          catalogDigest: DIGEST_A,
        },
      },
    }).success).toBe(false);
  });

  it("accepts a qualified ingestion decision and rejects behavior or source failures", () => {
    const dossier = createIngestionDossier();
    expect(standardPackSuitabilityDossierSchema.safeParse(dossier).success).toBe(true);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: [{
        ...dossier.candidates[0],
        suitability: { ...dossier.candidates[0].suitability, animationBehavior: "fail" },
      }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: [{
        ...dossier.candidates[0],
        suitability: { ...dossier.candidates[0].suitability, sourceReceipt: "fail" },
      }],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      sourceEvidence: [
        { ...dossier.sourceEvidence[0], kind: "visual-comparison" },
        ...dossier.sourceEvidence.slice(1),
      ],
    }).success).toBe(false);
  });

  it("requires nonempty unique predecessor descriptors and retains the selected canonical descriptor", () => {
    const dossier = createDossier();
    for (const predecessorDescriptorIds of [
      [],
      ["player-walk-canonical", "player-walk-canonical"],
      ["different-predecessor-descriptor"],
    ]) {
      expect(standardPackSuitabilityDossierSchema.safeParse({
        ...dossier,
        releaseBinding: {
          ...dossier.releaseBinding,
          predecessorDescriptorIds,
        },
      }).success).toBe(false);
    }
  });

  it("validates deterministic ingestion-receipt SHA-256 and rejects tampering or stale predecessors", async () => {
    const receipt = await createDigestValidIngestionReceipt();
    await expect(validateStandardPackCanonicalIngestionReceipt(receipt)).resolves.toMatchObject({
      receiptId: receipt.receiptId,
    });
    await expect(validateStandardPackCanonicalIngestionReceipt({
      ...receipt,
      sourceIdentity: `${receipt.sourceIdentity}:tampered`,
    })).rejects.toThrow(/receipt digest/i);
    await expect(validateStandardPackCanonicalIngestionReceipt({
      ...receipt,
      receiptDigest: DIGEST_A,
    })).rejects.toThrow(/receipt digest/i);
    await expect(validateStandardPackCanonicalIngestionReceipt({
      ...receipt,
      predecessorRelease: {
        ...receipt.predecessorRelease,
        catalogDigest: DIGEST_A,
      },
    })).rejects.toThrow(/predecessor/i);
  });

  it("permits a later receipt only when its caller supplies the exact accepted prior successor", async () => {
    const rootReceipt = await createDigestValidIngestionReceipt();
    const laterReceipt = {
      ...rootReceipt,
      predecessorRelease: rootReceipt.additiveRelease,
      additiveRelease: { version: "2026.07.31", catalogDigest: DIGEST_C, sourceReceiptDigest: DIGEST_A },
      receiptDigest: "",
    };
    laterReceipt.receiptDigest = await sha256(
      serializeStandardPackCanonicalIngestionReceiptPayload(laterReceipt as never),
    );

    await expect(validateStandardPackCanonicalIngestionReceipt(laterReceipt)).rejects.toThrow(/predecessor/i);
    await expect(validateStandardPackCanonicalIngestionReceipt(
      laterReceipt,
      rootReceipt.additiveRelease,
    )).resolves.toMatchObject({ receiptId: laterReceipt.receiptId });
    await expect(validateStandardPackCanonicalIngestionReceipt(
      laterReceipt,
      { ...rootReceipt.additiveRelease, catalogDigest: DIGEST_A },
    )).rejects.toThrow(/predecessor/i);
  });

  it("accepts only an evidence-backed blocked-absence policy", () => {
    const dossier = createBlockedDossier();
    expect(standardPackSuitabilityDossierSchema.safeParse(dossier).success).toBe(true);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      limitations: [],
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      sourceEvidence: dossier.sourceEvidence.filter((evidence) => evidence.kind !== "absence"),
    }).success).toBe(false);
    expect(standardPackSuitabilityDossierSchema.safeParse({
      ...dossier,
      candidates: createDossier().candidates,
    }).success).toBe(false);
  });

  it("searches and technically compares only accepted resolver entries without social verdicts", async () => {
    const resolver = await createAcceptedStandardAssetResolver(acceptedCatalog, {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    });
    const search = createCanonicalSuitabilitySearch(resolver, [HERO_WALK_KEY, HERO_IDLE_KEY]);
    expect(search.search("side-view/native/platformer-world/heroes").map((entry) => entry.semanticKey)).toEqual([HERO_WALK_KEY]);
    expect(search.resolve(HERO_IDLE_KEY).asset.key).toBe(HERO_IDLE_KEY);
    expect(() => search.resolve("side-view/native/platformer-world/heroes/not-indexed")).toThrow(/not indexed/i);
    expect(() => createCanonicalSuitabilitySearch(resolver, [HERO_WALK_KEY, HERO_WALK_KEY])).toThrow(/duplicate/i);
    expect(() => createCanonicalSuitabilitySearch(resolver, ["assets/hero.png"])).toThrow(/semantic keys/i);

    const unissued = createStandardAssetResolver(acceptedCatalog, {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    });
    expect(() => createCanonicalSuitabilitySearch(unissued, [HERO_WALK_KEY])).toThrow(/accepted standard asset resolver/i);

    const comparison = compareCanonicalSuitabilityDescriptor(createDossier().request, {
      contractVersion: 2,
      descriptorId: "suitability-hero-walk",
      catalogEntryKey: HERO_WALK_KEY,
      release: {
        version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
        catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
        sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
      },
      mediaKind: "animation",
      geometry: { width: 192, height: 32, frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
      clips: [{
        id: "walk",
        frames: [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 2, row: 0 }, { column: 3, row: 0 }, { column: 4, row: 0 }, { column: 5, row: 0 }],
        timing: { fps: 12, loop: true },
      }],
      directions: [{ direction: "down", clipId: "walk" }],
      anchor: { x: 0.5, y: 1 },
      renderScale: 2,
      collisionEnvelope: { x: 0.2, y: 0.4, width: 0.6, height: 0.6 },
      readabilityEnvelope: { minimumRenderPixels: 24, minimumContrastRatio: 3 },
    }, search);
    expect(comparison.factors).toEqual({
      frameDirectionCompatibility: "pass",
      animationBehavior: "pass",
      geometry: "pass",
      collisionEnvelope: "pass",
      sourceReceipt: "pass",
    });
    expect(Object.keys(comparison.factors)).not.toContain("visualReadability");

    const baseDossier = await createDigestValidDossier();
    const dossier = {
      ...baseDossier,
      candidates: [{
        ...baseDossier.candidates[0],
        descriptor: { ...baseDossier.candidates[0].descriptor, catalogEntryKey: HERO_IDLE_KEY },
      }],
      dossierDigest: "",
    };
    dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier as never));
    const manifest = await createDigestValidManifest(dossier as typeof baseDossier);
    await expect(resolveAcceptedCanonicalReuse(dossier, manifest, search)).resolves.toMatchObject({
      canonical: { semanticKey: HERO_IDLE_KEY },
    });
    await expect(resolveAcceptedCanonicalReuse(dossier, {
      ...manifest,
      ownerApproval: { status: "pending" },
    }, search)).rejects.toThrow();

    const staleReleaseBinding = {
      ...dossier.releaseBinding,
      predecessorRelease: { ...dossier.releaseBinding.predecessorRelease, catalogDigest: DIGEST_A },
    };
    const staleDossier = { ...dossier, releaseBinding: staleReleaseBinding, dossierDigest: "" };
    staleDossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(staleDossier as never));
    const staleDossierManifest = {
      ...manifest,
      dossierDigest: staleDossier.dossierDigest,
      releaseBinding: staleReleaseBinding,
      manifestDigest: "",
    };
    staleDossierManifest.manifestDigest = await sha256(
      serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(staleDossierManifest as never),
    );
    await expect(resolveAcceptedCanonicalReuse(staleDossier, staleDossierManifest, search))
      .rejects.toThrow(/root-accepted predecessor/i);

    const staleManifest = { ...manifest, releaseBinding: staleReleaseBinding, manifestDigest: "" };
    staleManifest.manifestDigest = await sha256(
      serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(staleManifest as never),
    );
    await expect(resolveAcceptedCanonicalReuse(dossier, staleManifest, search))
      .rejects.toThrow(/root-accepted predecessor/i);

    const pendingReviewerDecision = {
      ...manifest.decision,
      reviewerApproval: { status: "pending" },
      decisionDigest: "",
    };
    pendingReviewerDecision.decisionDigest = await sha256(
      serializeStandardPackSuitabilityDecisionPayload(pendingReviewerDecision as never),
    );
    const pendingReviewerManifest = {
      ...manifest,
      decision: pendingReviewerDecision,
      reviewerApproval: pendingReviewerDecision.reviewerApproval,
      manifestDigest: "",
    };
    pendingReviewerManifest.manifestDigest = await sha256(
      serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(pendingReviewerManifest as never),
    );
    await expect(resolveAcceptedCanonicalReuse(dossier, pendingReviewerManifest, search)).rejects.toThrow();

    await expect(resolveAcceptedCanonicalReuse(dossier, manifest, {
      resolve: search.resolve,
      search: search.search,
    })).rejects.toThrow(/issued accepted-resolver search facade/i);

    const cohortEvidence = {
      cohortId: "reading-advantage-word-runner-player-walk",
      cohortBindingId: "reading-advantage-word-runner-player-walk",
      cohortBindingDigest: "",
      requestingTitle: dossier.request.requestingTitle,
      requestingCartridge: dossier.request.requestingCartridge,
      dossierId: dossier.dossierId,
      dossierDigest: dossier.dossierDigest,
      manifestId: manifest.manifestId,
      manifestDigest: manifest.manifestDigest,
      semantic: dossier.request.semantic,
      candidateId: manifest.decision.candidateId,
      descriptorId: manifest.decision.descriptorId,
      authorization: manifest.authorization,
    };
    cohortEvidence.cohortBindingDigest = await sha256(
      serializeStandardPackCohortSuitabilityBindingPayload(cohortEvidence as never),
    );
    const cohortReceipt = await validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, manifest, search);
    expect(cohortReceipt).toEqual({
      ...cohortEvidence,
      scope: "evidence-qualified-identity-only",
    });
    expect(Object.keys(cohortReceipt)).not.toContain("path");
    expect(Object.keys(cohortReceipt)).not.toContain("canonical");
    expect(standardPackCohortSuitabilityEvidenceSchema.safeParse({ ...cohortEvidence, resolver: "forbidden" }).success).toBe(false);
    await expect(validateStandardPackCohortSuitabilityEvidence(
      { ...cohortEvidence, candidateId: "mismatched-candidate" }, dossier, manifest, search,
    )).rejects.toThrow(/does not (match|carry)/i);
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, undefined, manifest, search)).rejects.toThrow();
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, undefined, search)).rejects.toThrow();

    for (const patch of [
      { cohortId: "another-cohort" },
      { requestingTitle: "another-title" },
      { requestingCartridge: "another-cartridge" },
      { semantic: { role: "player", state: "idle" } },
      { candidateId: "mismatched-candidate" },
      { descriptorId: "mismatched-descriptor" },
    ]) {
      const mismatched = { ...cohortEvidence, ...patch, cohortBindingDigest: "" };
      mismatched.cohortBindingDigest = await sha256(
        serializeStandardPackCohortSuitabilityBindingPayload(mismatched as never),
      );
      await expect(validateStandardPackCohortSuitabilityEvidence(mismatched, dossier, manifest, search)).rejects.toThrow(/does not (match|carry)/i);
    }
    const missingSelectedKeySearch = createCanonicalSuitabilitySearch(resolver, [HERO_WALK_KEY]);
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, manifest, missingSelectedKeySearch)).rejects.toThrow(/not indexed/i);
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, manifest, {
      resolve: search.resolve, search: search.search,
    })).rejects.toThrow(/issued accepted-resolver search facade/i);
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, staleDossier, staleDossierManifest, search)).rejects.toThrow();
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, pendingReviewerManifest, search)).rejects.toThrow();

    const ownerPendingDecision = {
      ...manifest.decision,
      ownerApproval: { status: "pending" },
      decisionDigest: "",
    };
    ownerPendingDecision.decisionDigest = await sha256(
      serializeStandardPackSuitabilityDecisionPayload(ownerPendingDecision as never),
    );
    const ownerPendingManifest = {
      ...manifest,
      decision: ownerPendingDecision,
      ownerApproval: ownerPendingDecision.ownerApproval,
      manifestDigest: "",
    };
    ownerPendingManifest.manifestDigest = await sha256(
      serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(ownerPendingManifest as never),
    );
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, dossier, ownerPendingManifest, search)).rejects.toThrow();

    const ingestionDraft = createIngestionDossier();
    const ingestionDecision = { ...ingestionDraft.decision, decisionDigest: "" };
    ingestionDecision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(ingestionDecision as never));
    const ingestionDossier = { ...ingestionDraft, decision: ingestionDecision, dossierDigest: "" };
    ingestionDossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(ingestionDossier as never));
    const ingestionManifest = await createDigestValidManifest(ingestionDossier as typeof baseDossier);
    await expect(validateStandardPackCohortSuitabilityEvidence(cohortEvidence, ingestionDossier, ingestionManifest, search))
      .rejects.toThrow(/canonical reuse/i);

    const blockedBase = createBlockedDossier();
    blockedBase.decision.decisionDigest = "";
    blockedBase.decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(blockedBase.decision as never));
    blockedBase.dossierDigest = "";
    blockedBase.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(blockedBase as never));
    const blockedManifest = await createDigestValidManifest(blockedBase as typeof baseDossier);
    await expect(validateStandardPackCohortSuitabilityEvidence({
      ...cohortEvidence, dossierId: blockedBase.dossierId, dossierDigest: blockedBase.dossierDigest,
      manifestId: blockedManifest.manifestId, manifestDigest: blockedManifest.manifestDigest,
      candidateId: "canonical-player-walk", descriptorId: "player-walk-canonical",
    }, blockedBase, blockedManifest, search)).rejects.toThrow(/canonical reuse/i);

    const cohortSource = readStandardPackCohortGuardSource();
    expect(cohortSource).not.toMatch(/from "..\//);
    expect(cohortSource).not.toMatch(/(?:materializeStandardAssetUnion|createStandardAssetResolver|selectedUnion|publish.*Binding)/);
    expect(cohortSource).not.toMatch(/from "(?:node:|.*\/apps\/)/);
  });

});
