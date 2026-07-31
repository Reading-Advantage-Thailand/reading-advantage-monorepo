import { describe, expect, it } from "vitest";

import { LEGACY_INGESTION_REQUIRED_FIXTURE } from "../../assets/standard-pack-suitability-test-fixtures.test-support.js";
import {
  serializeStandardPackSuitabilityAcceptedDecisionManifestPayload,
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityDossierPayload,
} from "../../assets/standard-pack-suitability.js";
import type {
  StandardPackSuitabilityAcceptedDecisionManifest,
  StandardPackSuitabilityDecision,
  StandardPackSuitabilityDossier,
} from "../../assets/standard-pack-suitability.js";
import { createStandardPackSuitabilityQcView } from "../qc-kit.js";

const DIGEST_A = "a".repeat(64);

/** Computes a deterministic SHA-256 digest for integrity-valid QC fixtures. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Returns a structurally and cryptographically valid legacy-ingestion dossier. */
async function createDossier(): Promise<StandardPackSuitabilityDossier> {
  const draft = structuredClone(LEGACY_INGESTION_REQUIRED_FIXTURE);
  const unsignedDecision = {
    ...draft.decision,
    decisionDigest: DIGEST_A,
  } as StandardPackSuitabilityDecision;
  const decision = {
    ...unsignedDecision,
    decisionDigest: await sha256(
      serializeStandardPackSuitabilityDecisionPayload(unsignedDecision),
    ),
  };
  const unsignedDossier = {
    ...draft,
    decision,
    dossierDigest: DIGEST_A,
  } as StandardPackSuitabilityDossier;
  return {
    ...unsignedDossier,
    dossierDigest: await sha256(
      serializeStandardPackSuitabilityDossierPayload(unsignedDossier),
    ),
  };
}

/** Returns an accepted manifest that binds the exact supplied dossier decision intent. */
async function createManifest(
  dossier: StandardPackSuitabilityDossier,
): Promise<StandardPackSuitabilityAcceptedDecisionManifest> {
  const ownerApproval = {
    status: "accepted" as const,
    actorId: "fixture-owner",
    decidedAt: "2026-07-29T09:00:00.000Z",
    evidenceDigest: DIGEST_A,
  };
  const unsignedDecision = {
    ...dossier.decision,
    ownerApproval,
    decisionDigest: DIGEST_A,
  } as StandardPackSuitabilityDecision;
  const decision = {
    ...unsignedDecision,
    decisionDigest: await sha256(
      serializeStandardPackSuitabilityDecisionPayload(unsignedDecision),
    ),
  };
  const unsignedManifest = {
    schemaVersion: 1 as const,
    manifestId: "fixture-legacy-ingestion-acceptance",
    acceptedAt: ownerApproval.decidedAt,
    dossierId: dossier.dossierId,
    dossierDigest: dossier.dossierDigest,
    decision,
    reviewerApproval: decision.reviewerApproval,
    ownerApproval,
    releaseBinding: dossier.releaseBinding,
    authorization: decision.authorization,
    manifestDigest: DIGEST_A,
  } as StandardPackSuitabilityAcceptedDecisionManifest;
  return {
    ...unsignedManifest,
    manifestDigest: await sha256(
      serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(unsignedManifest),
    ),
  };
}

describe("standard-pack suitability QC projection", () => {
  it("validates integrity and projects immutable evidence without resolving or publishing", async () => {
    const dossier = await createDossier();
    const view = await createStandardPackSuitabilityQcView(dossier);

    expect(view).toMatchObject({
      dossierId: dossier.dossierId,
      requestingTitle: "fixture-title",
      requestingCartridge: "fixture-cartridge",
      semantic: { role: "player", state: "walk", identity: "player:walk" },
      selectedDescriptor: {
        descriptorId: "legacy-hero-walk-proposed",
        catalogEntryKey: "proposed/top-down/characters/legacy-hero-walk",
        release: null,
      },
      decision: {
        disposition: "ingest-canonical",
        acceptanceStatus: "draft",
      },
      authorization: {
        productionUseAuthorized: false,
        migrationAuthorized: false,
        cutoverAuthorized: false,
        deploymentAuthorized: false,
      },
      acceptance: { status: "draft", manifestId: null, manifestDigest: null },
    });
    expect(view.candidates[0]).toMatchObject({
      comparison: {
        semanticFit: "pass",
        animationBehavior: "pass",
        sourceReceipt: "pass",
      },
      provenance: {
        sourceIdentity: "legacy:fixture-title/hero-walk",
      },
      license: { status: "approved" },
      credit: { required: true, displayText: "Fixture credit" },
    });
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.candidates)).toBe(true);
    expect(Object.isFrozen(view.candidates[0].comparison)).toBe(true);
    expect(Object.isFrozen(view.behavior.requiredDirections)).toBe(true);
    expect(JSON.stringify(view)).not.toContain("previewUrl");
  });

  it("validates an optional accepted manifest and exposes only its acceptance identity", async () => {
    const dossier = await createDossier();
    const manifest = await createManifest(dossier);
    const view = await createStandardPackSuitabilityQcView(dossier, manifest);

    expect(view.acceptance).toEqual({
      status: "accepted",
      manifestId: manifest.manifestId,
      manifestDigest: manifest.manifestDigest,
    });
    expect(view.decision).toMatchObject({
      acceptanceStatus: "accepted",
      reviewerApprovalStatus: "accepted",
      ownerApprovalStatus: "accepted",
    });
  });

  it("rejects forged dossier and accepted-manifest integrity", async () => {
    const dossier = await createDossier();
    const manifest = await createManifest(dossier);

    await expect(createStandardPackSuitabilityQcView({
      ...dossier,
      dossierDigest: DIGEST_A,
    })).rejects.toThrow(/dossier digest/i);
    await expect(createStandardPackSuitabilityQcView(dossier, {
      ...manifest,
      manifestDigest: DIGEST_A,
    })).rejects.toThrow(/manifest digest/i);
  });
});
