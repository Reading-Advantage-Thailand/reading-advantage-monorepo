import { z } from "zod";

import {
  assetContractV2SemanticRequirementSchema,
} from "./asset-contract-v2.js";
import { resolveAcceptedCanonicalReuse } from "./standard-pack-suitability-search.js";
import type { CanonicalSuitabilitySearch } from "./standard-pack-suitability-search.js";
import type {
  StandardPackSuitabilityAcceptedDecisionManifest,
  StandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";

const idSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const noProductionAuthorizationSchema = z.object({
  productionUseAuthorized: z.literal(false),
  migrationAuthorized: z.literal(false),
  cutoverAuthorized: z.literal(false),
  deploymentAuthorized: z.literal(false),
}).strict();

/** Validates the identity and immutable evidence references a cohort may present for one reuse decision. */
export const standardPackCohortSuitabilityEvidenceSchema = z.object({
  cohortId: idSchema,
  cohortBindingId: idSchema,
  cohortBindingDigest: digestSchema,
  requestingTitle: idSchema,
  requestingCartridge: idSchema,
  dossierId: idSchema,
  dossierDigest: digestSchema,
  manifestId: idSchema,
  manifestDigest: digestSchema,
  semantic: assetContractV2SemanticRequirementSchema,
  candidateId: idSchema,
  descriptorId: idSchema,
  authorization: noProductionAuthorizationSchema,
}).strict();

/** Cohort-owned references that must exactly match a validated dossier and accepted manifest. */
export type StandardPackCohortSuitabilityEvidence =
  z.infer<typeof standardPackCohortSuitabilityEvidenceSchema>;

/** Evidence-qualified identity returned to a cohort without an asset resolver, path, binding, union, or cartridge. */
export interface StandardPackCohortSuitabilityReceipt {
  /** Cohort identity supplied in the strict evidence request. */
  readonly cohortId: string;
  /** Immutable evidence-integrity identifier supplied by the caller; not a semantic binding or operational capability. */
  readonly cohortBindingId: string;
  /** SHA-256 evidence-integrity digest for fixed cohort request fields; not an operational capability. */
  readonly cohortBindingDigest: string;
  /** Requesting title exactly matched to the dossier request. */
  readonly requestingTitle: string;
  /** Verified requesting-cartridge identity exactly matched to the dossier request; not a resolved cartridge. */
  readonly requestingCartridge: string;
  /** Validated draft dossier identity and digest. */
  readonly dossierId: string;
  /** Exact validated dossier payload digest. */
  readonly dossierDigest: string;
  /** Validated accepted-manifest identity and digest. */
  readonly manifestId: string;
  /** Exact validated manifest payload digest. */
  readonly manifestDigest: string;
  /** Accepted semantic role/state identity only. */
  readonly semantic: Readonly<{ readonly role: string; readonly state: string }>;
  /** Accepted candidate identity only. */
  readonly candidateId: string;
  /** Accepted descriptor identity only. */
  readonly descriptorId: string;
  /** Literal non-production authorization retained from the validated decision. */
  readonly authorization: Readonly<{
    readonly productionUseAuthorized: false;
    readonly migrationAuthorized: false;
    readonly cutoverAuthorized: false;
    readonly deploymentAuthorized: false;
  }>;
  /** Restricts this result to identity evidence and forbids operational consumption. */
  readonly scope: "evidence-qualified-identity-only";
}

/** Checks whether a validated cohort request exactly identifies its dossier, manifest, and selected decision. */
function assertCohortEvidenceMatches(
  evidence: StandardPackCohortSuitabilityEvidence,
  dossier: StandardPackSuitabilityDossier,
  manifest: StandardPackSuitabilityAcceptedDecisionManifest,
): void {
  const expectedCohortBindingId = [
    dossier.request.requestingTitle,
    dossier.request.requestingCartridge,
    dossier.request.semantic.role,
    dossier.request.semantic.state,
  ].join("-");
  if (
    evidence.cohortId !== expectedCohortBindingId
    || evidence.cohortBindingId !== expectedCohortBindingId
  ) {
    throw new Error("Cohort suitability evidence does not carry the authoritative dossier-derived cohort binding identity");
  }
  if (
    evidence.requestingTitle !== dossier.request.requestingTitle
    || evidence.requestingCartridge !== dossier.request.requestingCartridge
  ) {
    throw new Error("Cohort suitability evidence does not match the dossier title and cartridge request");
  }
  if (
    evidence.dossierId !== dossier.dossierId
    || evidence.dossierDigest !== dossier.dossierDigest
    || evidence.manifestId !== manifest.manifestId
    || evidence.manifestDigest !== manifest.manifestDigest
  ) {
    throw new Error("Cohort suitability evidence does not match the validated dossier and manifest identities");
  }
  if (manifest.decision.disposition !== "reuse-canonical") {
    throw new Error("Cohort suitability evidence requires an accepted canonical reuse decision");
  }
  const candidate = dossier.candidates.find((item) => item.candidateId === manifest.decision.candidateId);
  if (
    !candidate
    || candidate.origin !== "canonical"
    || candidate.requiresCanonicalIngestion
    || candidate.descriptor.descriptorId !== manifest.decision.descriptorId
    || candidate.semantic.role !== evidence.semantic.role
    || candidate.semantic.state !== evidence.semantic.state
    || candidate.candidateId !== evidence.candidateId
    || candidate.descriptor.descriptorId !== evidence.descriptorId
  ) {
    throw new Error("Cohort suitability evidence does not match the accepted canonical candidate");
  }
  if (JSON.stringify(evidence.authorization) !== JSON.stringify(manifest.authorization)) {
    throw new Error("Cohort suitability evidence authorization does not match the accepted manifest");
  }
}

/**
 * Serializes the immutable cohort identity that is SHA-256-bound before evidence validation.
  * @param evidence Strict cohort evidence containing the binding fields.
 * @returns Deterministic JSON payload for the cohort binding digest.
 */
export function serializeStandardPackCohortSuitabilityBindingPayload(
  evidence: Pick<StandardPackCohortSuitabilityEvidence, "cohortId" | "cohortBindingId" | "requestingTitle" | "requestingCartridge" | "semantic">,
): string {
  return JSON.stringify({
    cohortId: evidence.cohortId,
    cohortBindingId: evidence.cohortBindingId,
    requestingTitle: evidence.requestingTitle,
    requestingCartridge: evidence.requestingCartridge,
    semantic: evidence.semantic,
  });
}

/** Computes a lowercase browser-safe SHA-256 digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates cohort evidence against raw hash-bound records and returns a non-operational identity receipt.
 * @param evidenceCandidate Untrusted strict cohort identity and evidence references.
 * @param dossierCandidate Untrusted draft suitability dossier.
 * @param manifestCandidate Untrusted accepted suitability manifest.
 * @returns A frozen identity-only receipt with literal false authorizations.
 * @throws When evidence is missing, stale, unaccepted, mismatched, or non-canonical reuse.
 */
export async function validateStandardPackCohortSuitabilityEvidence(
  evidenceCandidate: unknown,
  dossierCandidate: unknown,
  manifestCandidate: unknown,
  search: CanonicalSuitabilitySearch,
): Promise<StandardPackCohortSuitabilityReceipt> {
  const evidence = standardPackCohortSuitabilityEvidenceSchema.parse(evidenceCandidate);
  if (evidence.cohortBindingDigest !== await sha256(serializeStandardPackCohortSuitabilityBindingPayload(evidence))) {
    throw new Error("Cohort suitability binding digest does not match its immutable identity payload");
  }
  const reuse = await resolveAcceptedCanonicalReuse(dossierCandidate, manifestCandidate, search);
  const dossier = reuse.dossier;
  const manifest = reuse.manifest;
  assertCohortEvidenceMatches(evidence, dossier, manifest);
  return Object.freeze({
    cohortId: evidence.cohortId,
    cohortBindingId: evidence.cohortBindingId,
    cohortBindingDigest: evidence.cohortBindingDigest,
    requestingTitle: evidence.requestingTitle,
    requestingCartridge: evidence.requestingCartridge,
    dossierId: dossier.dossierId,
    dossierDigest: dossier.dossierDigest,
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    semantic: Object.freeze({ ...evidence.semantic }),
    candidateId: evidence.candidateId,
    descriptorId: evidence.descriptorId,
    authorization: Object.freeze({ ...manifest.authorization }),
    scope: "evidence-qualified-identity-only" as const,
  });
}
