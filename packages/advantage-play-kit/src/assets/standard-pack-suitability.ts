import { z } from "zod";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import {
  assetContractV2ReleaseIdentitySchema,
  assetContractV2SemanticRequirementSchema,
} from "./asset-contract-v2.js";

/** Current schema version for standard-pack suitability dossiers. */
export const STANDARD_PACK_SUITABILITY_SCHEMA_VERSION = 1 as const;

/** The only dispositions permitted by the standard-pack suitability process. */
export const STANDARD_PACK_SUITABILITY_DISPOSITIONS = [
  "reuse-canonical",
  "ingest-canonical",
  "blocked",
] as const;

const idSchema = z.string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Identifiers must use lowercase kebab-case");
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u, "Digests must be lowercase SHA-256 values");
const timestampSchema = z.string().datetime({ offset: true });
const catalogEntryKeySchema = z.string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/u, "Catalog keys must use lowercase slash or kebab-case segments")
  .refine((value) => !value.includes("//") && !value.includes("."), "Catalog keys must not be physical paths");
const evidenceLocatorSchema = z.string()
  .min(1)
  .refine(
    (value) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        return false;
      }
      return decoded === value
        && !value.startsWith("/")
        && !value.includes(String.fromCharCode(92))
        && !/^[a-z][a-z0-9+.-]*:/iu.test(value)
        && !value.split("/").some((segment) => segment === "." || segment === "..");
    },
    "Evidence locators must be safe repository-relative paths",
  );
const comparisonResultSchema = z.enum(["pass", "fail", "not-applicable"]);

/** Validates a closed standard-pack suitability disposition. */
export const standardPackSuitabilityDispositionSchema = z.enum(STANDARD_PACK_SUITABILITY_DISPOSITIONS);

/** One closed standard-pack suitability disposition. */
export type StandardPackSuitabilityDisposition = z.infer<typeof standardPackSuitabilityDispositionSchema>;

/** Validates the requested physical behavior without selecting a physical asset. */
export const standardPackPhysicalBehaviorConstraintsSchema = z.object({
  mediaKind: z.enum(["image", "animation", "tileset", "ui", "audio"]),
  requiredDirections: z.array(z.enum(["up", "down", "left", "right"])),
  requiredClips: z.array(idSchema),
  minimumFramesPerClip: z.number().int().positive().nullable(),
  minimumGeometry: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).strict().nullable(),
  collisionEnvelopeRequired: z.boolean(),
  audienceBands: z.array(idSchema).min(1),
  locales: z.array(z.string().min(2).max(35)).min(1),
  accessibilityNeeds: z.array(idSchema),
}).strict().superRefine((behavior, context) => {
  if (behavior.mediaKind === "animation") {
    if (behavior.requiredClips.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Animation behavior requires at least one named clip",
        path: ["requiredClips"],
      });
    }
    if (behavior.minimumFramesPerClip === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Animation behavior requires a minimum frame count",
        path: ["minimumFramesPerClip"],
      });
    }
  } else if (
    behavior.requiredDirections.length > 0
    || behavior.requiredClips.length > 0
    || behavior.minimumFramesPerClip !== null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only animation behavior may declare directions, clips, or frame counts",
    });
  }
});

/** Physical behavior constraints used to compare candidates without hardcoding presentation behavior. */
export type StandardPackPhysicalBehaviorConstraints =
  z.infer<typeof standardPackPhysicalBehaviorConstraintsSchema>;

/** Validates one title-scoped request for a semantic role and behavior contract. */
export const standardPackSuitabilityRequestSchema = z.object({
  requestId: idSchema,
  requestingTitle: idSchema,
  requestingCartridge: idSchema,
  requestedAt: timestampSchema,
  semantic: assetContractV2SemanticRequirementSchema,
  behavior: standardPackPhysicalBehaviorConstraintsSchema,
}).strict();

/** A title request that identifies semantics and behavior without selecting a candidate. */
export type StandardPackSuitabilityRequest = z.infer<typeof standardPackSuitabilityRequestSchema>;

/** Validates immutable source, comparison, provenance, license, or credit evidence. */
export const standardPackSuitabilitySourceEvidenceSchema = z.object({
  evidenceId: idSchema,
  kind: z.enum([
    "canonical-catalog",
    "legacy-source",
    "visual-comparison",
    "technical-comparison",
    "provenance",
    "license",
    "credit",
    "absence",
  ]),
  locator: evidenceLocatorSchema,
  sha256: digestSchema,
  sourceReceiptDigest: digestSchema,
  capturedAt: timestampSchema,
  recordedBy: idSchema,
}).strict();

/** One hash-bound, repository-locatable evidence record. */
export type StandardPackSuitabilitySourceEvidence =
  z.infer<typeof standardPackSuitabilitySourceEvidenceSchema>;

/** Validates the descriptor identity evaluated by a suitability candidate. */
export const standardPackSuitabilityDescriptorIdentitySchema = z.object({
  descriptorId: idSchema,
  catalogEntryKey: catalogEntryKeySchema,
  descriptorDigest: digestSchema,
  release: assetContractV2ReleaseIdentitySchema.nullable(),
}).strict();

/** A descriptor identity that is pinned for canonical art or proposed for legacy ingestion. */
export type StandardPackSuitabilityDescriptorIdentity =
  z.infer<typeof standardPackSuitabilityDescriptorIdentitySchema>;

/** Validates the complete visual and technical comparison matrix for one candidate. */
export const standardPackSuitabilityComparisonSchema = z.object({
  semanticFit: comparisonResultSchema,
  visualReadability: comparisonResultSchema,
  frameDirectionCompatibility: comparisonResultSchema,
  animationBehavior: comparisonResultSchema,
  geometry: comparisonResultSchema,
  collisionEnvelope: comparisonResultSchema,
  audienceAppropriateness: comparisonResultSchema,
  localization: comparisonResultSchema,
  accessibility: comparisonResultSchema,
  sourceReceipt: comparisonResultSchema,
  creditObligations: comparisonResultSchema,
}).strict();

/** The required factor-by-factor candidate comparison. */
export type StandardPackSuitabilityComparison =
  z.infer<typeof standardPackSuitabilityComparisonSchema>;

/** Validates one canonical or approved-legacy candidate and its evidence references. */
export const standardPackSuitabilityCandidateSchema = z.object({
  candidateId: idSchema,
  origin: z.enum(["canonical", "legacy"]),
  semantic: assetContractV2SemanticRequirementSchema,
  descriptor: standardPackSuitabilityDescriptorIdentitySchema,
  sourceEvidenceIds: z.array(idSchema).min(1),
  comparisonEvidenceIds: z.array(idSchema).min(2),
  suitability: standardPackSuitabilityComparisonSchema,
  requiresCanonicalIngestion: z.boolean(),
}).strict().superRefine((candidate, context) => {
  if (candidate.origin === "canonical") {
    if (candidate.descriptor.release === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Canonical candidates require a pinned release identity",
        path: ["descriptor", "release"],
      });
    }
    if (candidate.requiresCanonicalIngestion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Canonical candidates cannot require canonical ingestion",
        path: ["requiresCanonicalIngestion"],
      });
    }
  } else {
    if (candidate.descriptor.release !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Legacy candidates cannot claim a canonical release before ingestion",
        path: ["descriptor", "release"],
      });
    }
    if (!candidate.requiresCanonicalIngestion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Legacy candidates must require canonical ingestion",
        path: ["requiresCanonicalIngestion"],
      });
    }
  }
});

/** One candidate considered for reuse, ingestion, or rejection. */
export type StandardPackSuitabilityCandidate =
  z.infer<typeof standardPackSuitabilityCandidateSchema>;

/** Validates an independent reviewer finding for one evaluated candidate. */
export const standardPackSuitabilityReviewerFindingSchema = z.object({
  candidateId: idSchema,
  reviewerId: idSchema,
  reviewedAt: timestampSchema,
  result: z.enum(["suitable", "ingestion-required", "unsuitable"]),
  summary: z.string().min(1),
  evidenceIds: z.array(idSchema).min(1),
  findingDigest: digestSchema,
}).strict();

/** An independent, hash-bound reviewer finding. */
export type StandardPackSuitabilityReviewerFinding =
  z.infer<typeof standardPackSuitabilityReviewerFindingSchema>;

/** Validates one disclosed limitation on a dossier or selected candidate. */
export const standardPackSuitabilityLimitationSchema = z.object({
  limitationId: idSchema,
  candidateId: idSchema.nullable(),
  severity: z.enum(["low", "medium", "high", "blocking"]),
  summary: z.string().min(1),
  evidenceIds: z.array(idSchema),
}).strict();

/** A disclosed limitation retained with the dossier decision. */
export type StandardPackSuitabilityLimitation =
  z.infer<typeof standardPackSuitabilityLimitationSchema>;

/** Validates the provenance chain for one candidate source. */
export const standardPackSuitabilityProvenanceSchema = z.object({
  candidateId: idSchema,
  sourceIdentity: z.string().min(1),
  sourceSha256: digestSchema,
  sourceReceiptDigest: digestSchema,
  chainOfCustody: z.array(idSchema).min(1),
}).strict();

/** Hash-bound provenance for a canonical or legacy candidate. */
export type StandardPackSuitabilityProvenance =
  z.infer<typeof standardPackSuitabilityProvenanceSchema>;

/** Validates a fail-closed license review for one candidate. */
export const standardPackSuitabilityLicenseSchema = z.object({
  candidateId: idSchema,
  status: z.enum(["pending", "approved", "rejected"]),
  licenseId: z.string().min(1).nullable(),
  evidenceId: idSchema,
  reviewedBy: idSchema.nullable(),
  reviewedAt: timestampSchema.nullable(),
  obligations: z.array(idSchema),
}).strict().superRefine((license, context) => {
  if (
    license.status === "approved"
    && (license.licenseId === null || license.reviewedBy === null || license.reviewedAt === null)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Approved licensing requires a license identity and completed review",
    });
  }
});

/** A candidate license decision that cannot silently treat pending review as approval. */
export type StandardPackSuitabilityLicense =
  z.infer<typeof standardPackSuitabilityLicenseSchema>;

/** Validates one required or explicitly waived credit record. */
export const standardPackSuitabilityCreditSchema = z.discriminatedUnion("required", [
  z.object({
    candidateId: idSchema,
    required: z.literal(true),
    displayText: z.string().min(1),
    evidenceId: idSchema,
  }).strict(),
  z.object({
    candidateId: idSchema,
    required: z.literal(false),
    displayText: z.null(),
    evidenceId: idSchema,
  }).strict(),
]);

/** A credit obligation or evidence-backed waiver for one candidate. */
export type StandardPackSuitabilityCredit = z.infer<typeof standardPackSuitabilityCreditSchema>;

const predecessorDescriptorIdsSchema = z.array(idSchema).min(1).superRefine((descriptorIds, context) => {
  const seen = new Set<string>();
  for (const [index, descriptorId] of descriptorIds.entries()) {
    if (seen.has(descriptorId)) {
      addSuitabilityIssue(
        context,
        `Duplicate predecessor descriptor identity ${JSON.stringify(descriptorId)}`,
        [index],
      );
    }
    seen.add(descriptorId);
  }
});

/** Validates a predecessor-bound release record that cannot claim an uncreated successor release. */
export const standardPackSuitabilityReleaseBindingSchema = z.object({
  predecessorRelease: assetContractV2ReleaseIdentitySchema,
  predecessorDescriptorIds: predecessorDescriptorIdsSchema,
  proposedSuccessorRelease: z.null(),
  policy: z.literal("successor-evidence-required-before-publication"),
}).strict();

/** The release boundary retained by a pre-ingestion suitability dossier. */
export type StandardPackSuitabilityReleaseBinding =
  z.infer<typeof standardPackSuitabilityReleaseBindingSchema>;

const pendingApprovalSchema = z.object({
  status: z.literal("pending"),
}).strict();
const completedApprovalSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  actorId: idSchema,
  decidedAt: timestampSchema,
  evidenceDigest: digestSchema,
}).strict();
const approvalSchema = z.union([pendingApprovalSchema, completedApprovalSchema]);
const noProductionAuthorizationSchema = z.object({
  productionUseAuthorized: z.literal(false),
  migrationAuthorized: z.literal(false),
  cutoverAuthorized: z.literal(false),
  deploymentAuthorized: z.literal(false),
}).strict();
const decisionCommonShape = {
  rationale: z.string().min(1),
  reviewerApproval: approvalSchema,
  ownerApproval: approvalSchema,
  authorization: noProductionAuthorizationSchema,
  decisionDigest: digestSchema,
};
const reuseDecisionSchema = z.object({
  ...decisionCommonShape,
  disposition: z.literal("reuse-canonical"),
  candidateId: idSchema,
  descriptorId: idSchema,
  nextStep: z.literal("publish-accepted-binding"),
}).strict();
const ingestDecisionSchema = z.object({
  ...decisionCommonShape,
  disposition: z.literal("ingest-canonical"),
  candidateId: idSchema,
  descriptorId: idSchema,
  nextStep: z.literal("canonical-ingestion-required"),
}).strict();
const blockedDecisionSchema = z.object({
  ...decisionCommonShape,
  disposition: z.literal("blocked"),
  candidateId: z.null(),
  descriptorId: z.null(),
  nextStep: z.literal("remain-blocked"),
}).strict();

/** Validates a closed decision that cannot provisionally authorize production behavior. */
export const standardPackSuitabilityDecisionSchema = z.discriminatedUnion("disposition", [
  reuseDecisionSchema,
  ingestDecisionSchema,
  blockedDecisionSchema,
]);

/** A suitability disposition with explicit approval state and no production authority. */
export type StandardPackSuitabilityDecision =
  z.infer<typeof standardPackSuitabilityDecisionSchema>;

/** Validates a complete, cross-referenced and fail-closed suitability dossier. */
const standardPackSuitabilityDossierStructureSchema = z.object({
  schemaVersion: z.literal(STANDARD_PACK_SUITABILITY_SCHEMA_VERSION),
  dossierId: idSchema,
  createdAt: timestampSchema,
  request: standardPackSuitabilityRequestSchema,
  sourceEvidence: z.array(standardPackSuitabilitySourceEvidenceSchema).min(3),
  candidates: z.array(standardPackSuitabilityCandidateSchema),
  reviewerFindings: z.array(standardPackSuitabilityReviewerFindingSchema),
  limitations: z.array(standardPackSuitabilityLimitationSchema),
  provenance: z.array(standardPackSuitabilityProvenanceSchema),
  licensing: z.array(standardPackSuitabilityLicenseSchema),
  credits: z.array(standardPackSuitabilityCreditSchema),
  releaseBinding: standardPackSuitabilityReleaseBindingSchema,
  decision: standardPackSuitabilityDecisionSchema,
  dossierDigest: digestSchema,
}).strict().superRefine((dossier, context) => {
  const evidenceById = new Map(dossier.sourceEvidence.map((evidence) => [evidence.evidenceId, evidence]));
  const evidenceKinds = new Set(dossier.sourceEvidence.map((evidence) => evidence.kind));
  if (!evidenceKinds.has("canonical-catalog") && !evidenceKinds.has("legacy-source")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Dossiers require canonical-catalog or legacy-source evidence",
      path: ["sourceEvidence"],
    });
  }
  for (const kind of ["visual-comparison", "technical-comparison"] as const) {
    if (!evidenceKinds.has(kind)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dossiers require ${kind} evidence`,
        path: ["sourceEvidence"],
      });
    }
  }

  const candidateById = new Map(dossier.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const findingByCandidateId = new Map(
    dossier.reviewerFindings.map((finding) => [finding.candidateId, finding]),
  );
  for (const [index, candidate] of dossier.candidates.entries()) {
    if (
      candidate.semantic.role !== dossier.request.semantic.role
      || candidate.semantic.state !== dossier.request.semantic.state
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate semantics must match the dossier request",
        path: ["candidates", index, "semantic"],
      });
    }
    for (const evidenceId of candidate.sourceEvidenceIds) {
      if (!evidenceById.has(evidenceId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown source evidence ${JSON.stringify(evidenceId)}`,
          path: ["candidates", index, "sourceEvidenceIds"],
        });
      }
    }
    const comparisonKinds = new Set(
      candidate.comparisonEvidenceIds.map((evidenceId) => evidenceById.get(evidenceId)?.kind),
    );
    if (!comparisonKinds.has("visual-comparison") || !comparisonKinds.has("technical-comparison")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each candidate requires visual and technical comparison evidence",
        path: ["candidates", index, "comparisonEvidenceIds"],
      });
    }
    if (!findingByCandidateId.has(candidate.candidateId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each candidate requires an independent reviewer finding",
        path: ["reviewerFindings"],
      });
    }
    if (!dossier.provenance.some((record) => record.candidateId === candidate.candidateId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each candidate requires provenance",
        path: ["provenance"],
      });
    }
    if (!dossier.licensing.some((record) => record.candidateId === candidate.candidateId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each candidate requires a licensing decision",
        path: ["licensing"],
      });
    }
    if (!dossier.credits.some((record) => record.candidateId === candidate.candidateId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each candidate requires a credit record",
        path: ["credits"],
      });
    }
  }

  const decision = dossier.decision;
  if (decision.disposition === "blocked") {
    const absenceEvidenceIds = new Set(
      dossier.sourceEvidence
        .filter((evidence) => evidence.kind === "absence")
        .map((evidence) => evidence.evidenceId),
    );
    const blockingAbsence = dossier.limitations.some((limitation) => (
      limitation.candidateId === null
      && limitation.severity === "blocking"
      && limitation.evidenceIds.some((evidenceId) => absenceEvidenceIds.has(evidenceId))
    ));
    if (dossier.candidates.length !== 0
      || dossier.reviewerFindings.length !== 0
      || dossier.provenance.length !== 0
      || dossier.licensing.length !== 0
      || dossier.credits.length !== 0) {
      addSuitabilityIssue(
        context,
        "Blocked dossiers must record an evidence-backed absence without candidate or candidate-linked records",
        ["decision"],
      );
    }
    if (!blockingAbsence) {
      addSuitabilityIssue(
        context,
        "Blocked dossiers require a blocking absence limitation linked to absence evidence",
        ["limitations"],
      );
    }
    return;
  }
  const selectedCandidate = candidateById.get(decision.candidateId);
  if (!selectedCandidate || selectedCandidate.descriptor.descriptorId !== decision.descriptorId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The decision must select a candidate and descriptor from this dossier",
      path: ["decision"],
    });
    return;
  }
  const selectedFinding = findingByCandidateId.get(selectedCandidate.candidateId);
  if (decision.disposition === "reuse-canonical") {
    const hasFailedFactor = Object.values(selectedCandidate.suitability).includes("fail");
    const release = selectedCandidate.descriptor.release;
    if (
      selectedCandidate.origin !== "canonical"
      || selectedCandidate.requiresCanonicalIngestion
      || selectedFinding?.result !== "suitable"
      || hasFailedFactor
      || release === null
      || release.version !== dossier.releaseBinding.predecessorRelease.version
      || release.catalogDigest !== dossier.releaseBinding.predecessorRelease.catalogDigest
      || release.sourceReceiptDigest !== dossier.releaseBinding.predecessorRelease.sourceReceiptDigest
      || !dossier.releaseBinding.predecessorDescriptorIds.includes(selectedCandidate.descriptor.descriptorId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Canonical reuse requires a retained suitable accepted-release descriptor with no failed factor",
        path: ["decision"],
      });
    }
  } else if (
    selectedCandidate.origin !== "legacy"
    || !selectedCandidate.requiresCanonicalIngestion
    || selectedCandidate.descriptor.release !== null
    || selectedFinding?.result !== "ingestion-required"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Canonical ingestion requires an approved legacy candidate without claimed release evidence",
      path: ["decision"],
    });
  }
});

/** A complete suitability record that remains non-authoritative for production exposure. */
export type StandardPackSuitabilityDossier =
  z.infer<typeof standardPackSuitabilityDossierSchema>;


/** Checks whether a release identity is exactly the root-accepted standard-pack release. */
function isAcceptedStandardPackRelease(release: {
  readonly version: string;
  readonly catalogDigest: string;
  readonly sourceReceiptDigest: string;
}): boolean {
  return release.version === ACCEPTED_STANDARD_ASSET_RELEASE.version
    && release.catalogDigest === ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest
    && release.sourceReceiptDigest === ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest;
}

/** Adds a fail-closed validation issue to a suitability schema refinement. */
function addSuitabilityIssue(
  context: z.RefinementCtx,
  message: string,
  path: readonly (string | number)[],
): void {
  context.addIssue({ code: z.ZodIssueCode.custom, message, path: [...path] });
}

/** Checks a collection for duplicate stable identifiers. */
function requireUniqueIds(
  values: readonly { readonly [key: string]: unknown }[],
  key: string,
  label: string,
  context: z.RefinementCtx,
  path: readonly (string | number)[],
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    const id = value[key];
    if (typeof id !== "string") continue;
    if (seen.has(id)) addSuitabilityIssue(context, `Duplicate ${label} ${JSON.stringify(id)}`, [...path, index, key]);
    seen.add(id);
  }
}

/** Returns the stable JSON encoding used by suitability SHA-256 payloads. */
function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  throw new Error("Suitability digest payload contains a non-JSON value");
}

/** Produces a SHA-256 digest using the browser-safe Web Crypto implementation. */
async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is required to validate suitability evidence");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Validates draft-only dossier integrity in addition to the structural contract. */
export const standardPackSuitabilityDossierSchema = standardPackSuitabilityDossierStructureSchema.superRefine(
  (dossier, context) => {
    requireUniqueIds(dossier.sourceEvidence, "evidenceId", "evidence id", context, ["sourceEvidence"]);
    requireUniqueIds(dossier.candidates, "candidateId", "candidate id", context, ["candidates"]);
    requireUniqueIds(dossier.reviewerFindings, "candidateId", "reviewer finding candidate", context, ["reviewerFindings"]);
    requireUniqueIds(dossier.provenance, "candidateId", "provenance candidate", context, ["provenance"]);
    requireUniqueIds(dossier.licensing, "candidateId", "license candidate", context, ["licensing"]);
    requireUniqueIds(dossier.credits, "candidateId", "credit candidate", context, ["credits"]);
    requireUniqueIds(dossier.limitations, "limitationId", "limitation id", context, ["limitations"]);

    const evidenceById = new Map(dossier.sourceEvidence.map((evidence) => [evidence.evidenceId, evidence]));
    const locatorOwners = new Map<string, string>();
    for (const [index, evidence] of dossier.sourceEvidence.entries()) {
      const prior = locatorOwners.get(evidence.locator);
      if (prior) addSuitabilityIssue(context, `Duplicate evidence locator ${JSON.stringify(evidence.locator)}`, ["sourceEvidence", index, "locator"]);
      locatorOwners.set(evidence.locator, evidence.evidenceId);
    }
    const candidateById = new Map(dossier.candidates.map((candidate) => [candidate.candidateId, candidate]));
    const descriptorOwners = new Map<string, string>();
    const catalogOwners = new Map<string, string>();
    for (const [index, candidate] of dossier.candidates.entries()) {
      const descriptorOwner = descriptorOwners.get(candidate.descriptor.descriptorId);
      const catalogOwner = catalogOwners.get(candidate.descriptor.catalogEntryKey);
      if (descriptorOwner) addSuitabilityIssue(context, `Duplicate descriptor identity ${JSON.stringify(candidate.descriptor.descriptorId)}`, ["candidates", index, "descriptor", "descriptorId"]);
      if (catalogOwner) addSuitabilityIssue(context, `Duplicate catalog entry ${JSON.stringify(candidate.descriptor.catalogEntryKey)}`, ["candidates", index, "descriptor", "catalogEntryKey"]);
      descriptorOwners.set(candidate.descriptor.descriptorId, candidate.candidateId);
      catalogOwners.set(candidate.descriptor.catalogEntryKey, candidate.candidateId);

      const sourceIds = new Set<string>();
      for (const evidenceId of candidate.sourceEvidenceIds) {
        if (sourceIds.has(evidenceId)) addSuitabilityIssue(context, `Duplicate source evidence ${JSON.stringify(evidenceId)}`, ["candidates", index, "sourceEvidenceIds"]);
        sourceIds.add(evidenceId);
        const evidence = evidenceById.get(evidenceId);
        if (!evidence || !["canonical-catalog", "legacy-source"].includes(evidence.kind)) {
          addSuitabilityIssue(context, "Candidate source evidence must reference canonical-catalog or legacy-source evidence", ["candidates", index, "sourceEvidenceIds"]);
        }
      }
      const comparisonIds = new Set<string>();
      for (const evidenceId of candidate.comparisonEvidenceIds) {
        if (comparisonIds.has(evidenceId)) addSuitabilityIssue(context, `Duplicate comparison evidence ${JSON.stringify(evidenceId)}`, ["candidates", index, "comparisonEvidenceIds"]);
        comparisonIds.add(evidenceId);
        if (!evidenceById.has(evidenceId)) addSuitabilityIssue(context, `Unknown comparison evidence ${JSON.stringify(evidenceId)}`, ["candidates", index, "comparisonEvidenceIds"]);
      }
      if (candidate.origin === "canonical" && candidate.descriptor.release !== null && !isAcceptedStandardPackRelease(candidate.descriptor.release)) {
        addSuitabilityIssue(context, "Canonical candidates must pin the root-accepted standard-pack release", ["candidates", index, "descriptor", "release"]);
      }
    }

    for (const [index, finding] of dossier.reviewerFindings.entries()) {
      if (!candidateById.has(finding.candidateId)) addSuitabilityIssue(context, `Reviewer finding references unknown candidate ${JSON.stringify(finding.candidateId)}`, ["reviewerFindings", index, "candidateId"]);
      for (const evidenceId of finding.evidenceIds) {
        if (!evidenceById.has(evidenceId)) addSuitabilityIssue(context, `Reviewer finding references unknown evidence ${JSON.stringify(evidenceId)}`, ["reviewerFindings", index, "evidenceIds"]);
      }
    }
    const provenanceSources = new Map<string, string>();
    for (const [index, provenance] of dossier.provenance.entries()) {
      const candidate = candidateById.get(provenance.candidateId);
      const duplicateOwner = provenanceSources.get(`${provenance.sourceIdentity}:${provenance.sourceSha256}`);
      if (duplicateOwner) addSuitabilityIssue(context, "Duplicate physical source provenance is prohibited", ["provenance", index]);
      provenanceSources.set(`${provenance.sourceIdentity}:${provenance.sourceSha256}`, provenance.candidateId);
      if (!candidate) {
        addSuitabilityIssue(context, `Provenance references unknown candidate ${JSON.stringify(provenance.candidateId)}`, ["provenance", index, "candidateId"]);
        continue;
      }
      const sources = candidate.sourceEvidenceIds.map((id) => evidenceById.get(id)).filter((value): value is StandardPackSuitabilitySourceEvidence => value !== undefined);
      if (!sources.some((source) => source.sha256 === provenance.sourceSha256 && source.sourceReceiptDigest === provenance.sourceReceiptDigest)) {
        addSuitabilityIssue(context, "Provenance must match a candidate source evidence hash and source receipt", ["provenance", index]);
      }
      for (const evidenceId of provenance.chainOfCustody) {
        if (!evidenceById.has(evidenceId)) addSuitabilityIssue(context, `Chain of custody references unknown evidence ${JSON.stringify(evidenceId)}`, ["provenance", index, "chainOfCustody"]);
      }
    }
    for (const [index, license] of dossier.licensing.entries()) {
      if (!candidateById.has(license.candidateId)) addSuitabilityIssue(context, `License references unknown candidate ${JSON.stringify(license.candidateId)}`, ["licensing", index, "candidateId"]);
      if (!evidenceById.has(license.evidenceId)) addSuitabilityIssue(context, `License references unknown evidence ${JSON.stringify(license.evidenceId)}`, ["licensing", index, "evidenceId"]);
    }
    for (const [index, credit] of dossier.credits.entries()) {
      if (!candidateById.has(credit.candidateId)) addSuitabilityIssue(context, `Credit references unknown candidate ${JSON.stringify(credit.candidateId)}`, ["credits", index, "candidateId"]);
      if (!evidenceById.has(credit.evidenceId)) addSuitabilityIssue(context, `Credit references unknown evidence ${JSON.stringify(credit.evidenceId)}`, ["credits", index, "evidenceId"]);
    }
    for (const [index, limitation] of dossier.limitations.entries()) {
      if (limitation.candidateId !== null && !candidateById.has(limitation.candidateId)) addSuitabilityIssue(context, `Limitation references unknown candidate ${JSON.stringify(limitation.candidateId)}`, ["limitations", index, "candidateId"]);
      for (const evidenceId of limitation.evidenceIds) {
        if (!evidenceById.has(evidenceId)) addSuitabilityIssue(context, `Limitation references unknown evidence ${JSON.stringify(evidenceId)}`, ["limitations", index, "evidenceIds"]);
      }
    }

    if (!isAcceptedStandardPackRelease(dossier.releaseBinding.predecessorRelease)) {
      addSuitabilityIssue(context, "Dossiers must retain the exact root-accepted predecessor release", ["releaseBinding", "predecessorRelease"]);
    }
    if (dossier.decision.ownerApproval.status !== "pending") {
      addSuitabilityIssue(context, "Draft dossiers cannot contain an owner-accepted decision; use an accepted decision manifest", ["decision", "ownerApproval"]);
    }
    if (dossier.decision.disposition === "blocked") return;
    if (dossier.decision.reviewerApproval.status !== "accepted") {
      addSuitabilityIssue(context, "Selected draft decisions require accepted reviewer approval", ["decision", "reviewerApproval"]);
    }
    const selected = candidateById.get(dossier.decision.candidateId);
    const license = dossier.licensing.find((record) => record.candidateId === dossier.decision.candidateId);
    const credit = dossier.credits.find((record) => record.candidateId === dossier.decision.candidateId);
    if (!selected) return;
    if (Object.values(selected.suitability).includes("fail")) addSuitabilityIssue(context, "Selected decisions cannot retain failed suitability factors", ["decision"]);
    if (license?.status !== "approved") addSuitabilityIssue(context, "Selected decisions require approved licensing", ["decision"]);
    if (!credit || !credit.required) addSuitabilityIssue(context, "Selected decisions require an approved credit obligation", ["decision"]);
  },
);

/** Serializes the digest-independent payload for a draft suitability decision. */
export function serializeStandardPackSuitabilityDecisionPayload(decision: StandardPackSuitabilityDecision): string {
  const { decisionDigest: _decisionDigest, ...payload } = decision;
  return stableJson(payload);
}

/** Serializes the digest-independent payload for a draft suitability dossier. */
export function serializeStandardPackSuitabilityDossierPayload(dossier: StandardPackSuitabilityDossier): string {
  const { dossierDigest: _dossierDigest, ...payload } = dossier;
  return stableJson(payload);
}

/** Validates structural and real SHA-256 integrity for a draft suitability dossier. */
export async function validateStandardPackSuitabilityDossier(candidate: unknown): Promise<StandardPackSuitabilityDossier> {
  const dossier = standardPackSuitabilityDossierSchema.parse(candidate);
  const decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(dossier.decision));
  if (decisionDigest !== dossier.decision.decisionDigest) throw new Error("Suitability decision digest does not match its deterministic payload");
  const dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier));
  if (dossierDigest !== dossier.dossierDigest) throw new Error("Suitability dossier digest does not match its deterministic payload");
  return Object.freeze(dossier);
}

const acceptedApprovalSchema = completedApprovalSchema.refine((approval) => approval.status === "accepted", {
  message: "Accepted decisions require an accepted approval record",
});

/** Validates an owner-accepted decision manifest kept separate from its draft dossier. */
export const standardPackSuitabilityAcceptedDecisionManifestSchema = z.object({
  schemaVersion: z.literal(STANDARD_PACK_SUITABILITY_SCHEMA_VERSION),
  manifestId: idSchema,
  acceptedAt: timestampSchema,
  dossierId: idSchema,
  dossierDigest: digestSchema,
  decision: standardPackSuitabilityDecisionSchema,
  reviewerApproval: acceptedApprovalSchema,
  ownerApproval: acceptedApprovalSchema,
  releaseBinding: standardPackSuitabilityReleaseBindingSchema,
  authorization: noProductionAuthorizationSchema,
  manifestDigest: digestSchema,
}).strict().superRefine((manifest, context) => {
  if (manifest.decision.reviewerApproval.status !== "accepted" || manifest.decision.ownerApproval.status !== "accepted") {
    addSuitabilityIssue(context, "Accepted manifest decisions require reviewer and owner acceptance", ["decision"]);
  }
  if (stableJson(manifest.reviewerApproval) !== stableJson(manifest.decision.reviewerApproval)) {
    addSuitabilityIssue(context, "Accepted manifest reviewer approval must match the decision approval", ["reviewerApproval"]);
  }
  if (stableJson(manifest.ownerApproval) !== stableJson(manifest.decision.ownerApproval)) {
    addSuitabilityIssue(context, "Accepted manifest owner approval must match the decision approval", ["ownerApproval"]);
  }
  if (stableJson(manifest.authorization) !== stableJson(manifest.decision.authorization)) {
    addSuitabilityIssue(context, "Accepted manifest authorization must match the decision authorization", ["authorization"]);
  }
  if (!isAcceptedStandardPackRelease(manifest.releaseBinding.predecessorRelease)) {
    addSuitabilityIssue(context, "Accepted manifests must retain the root-accepted predecessor release", ["releaseBinding", "predecessorRelease"]);
  }
});

/** An accepted, non-production decision record that binds a draft dossier by SHA-256 digest. */
export type StandardPackSuitabilityAcceptedDecisionManifest =
  z.infer<typeof standardPackSuitabilityAcceptedDecisionManifestSchema>;

/** Serializes the digest-independent payload for an accepted decision manifest. */
export function serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(
  manifest: StandardPackSuitabilityAcceptedDecisionManifest,
): string {
  const { manifestDigest: _manifestDigest, ...payload } = manifest;
  return stableJson(payload);
}

/** Serializes immutable decision intent while excluding its approval and digest records. */
function serializeStandardPackSuitabilityDecisionIntent(decision: StandardPackSuitabilityDecision): string {
  const { reviewerApproval: _reviewerApproval, ownerApproval: _ownerApproval, decisionDigest: _decisionDigest, ...intent } = decision;
  return stableJson(intent);
}

/** Validates an accepted manifest against the exact hash-bound draft dossier it approves. */
export async function validateStandardPackSuitabilityAcceptedDecisionManifest(
  dossierCandidate: unknown,
  manifestCandidate: unknown,
): Promise<StandardPackSuitabilityAcceptedDecisionManifest> {
  const dossier = await validateStandardPackSuitabilityDossier(dossierCandidate);
  const manifest = standardPackSuitabilityAcceptedDecisionManifestSchema.parse(manifestCandidate);
  if (manifest.dossierId !== dossier.dossierId || manifest.dossierDigest !== dossier.dossierDigest) {
    throw new Error("Accepted suitability manifest does not bind the supplied draft dossier");
  }
  if (serializeStandardPackSuitabilityDecisionIntent(manifest.decision) !== serializeStandardPackSuitabilityDecisionIntent(dossier.decision)) {
    throw new Error("Accepted suitability manifest decision does not match the draft dossier decision intent");
  }
  if (stableJson(manifest.releaseBinding) !== stableJson(dossier.releaseBinding)) {
    throw new Error("Accepted suitability manifest release binding does not match the draft dossier");
  }
  const decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(manifest.decision));
  if (decisionDigest !== manifest.decision.decisionDigest) throw new Error("Accepted suitability manifest decision digest does not match its deterministic payload");
  const manifestDigest = await sha256(serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifest));
  if (manifestDigest !== manifest.manifestDigest) throw new Error("Accepted suitability manifest digest does not match its deterministic payload");
  return Object.freeze(manifest);
}

/** Validates the evidence-only receipt shape required before a legacy ingestion can be generated. */
export const standardPackCanonicalIngestionReceiptSchema = z.object({
  schemaVersion: z.literal(STANDARD_PACK_SUITABILITY_SCHEMA_VERSION),
  receiptId: idSchema,
  createdAt: timestampSchema,
  candidateId: idSchema,
  sourceIdentity: z.string().min(1),
  sourceSha256: digestSchema,
  sourceReceiptDigest: digestSchema,
  license: standardPackSuitabilityLicenseSchema,
  credit: standardPackSuitabilityCreditSchema,
  catalogEntryKey: catalogEntryKeySchema,
  descriptorId: idSchema,
  descriptorDigest: digestSchema,
  predecessorRelease: assetContractV2ReleaseIdentitySchema,
  additiveRelease: assetContractV2ReleaseIdentitySchema,
  authorization: noProductionAuthorizationSchema,
  receiptDigest: digestSchema,
}).strict().superRefine((receipt, context) => {
  if (receipt.license.candidateId !== receipt.candidateId || receipt.license.status !== "approved") {
    addSuitabilityIssue(context, "Ingestion receipts require approved licensing for their candidate", ["license"]);
  }
  if (receipt.credit.candidateId !== receipt.candidateId || !receipt.credit.required) {
    addSuitabilityIssue(context, "Ingestion receipts require a credit obligation for their candidate", ["credit"]);
  }
  if (receipt.predecessorRelease.version === receipt.additiveRelease.version
    && receipt.predecessorRelease.catalogDigest === receipt.additiveRelease.catalogDigest
    && receipt.predecessorRelease.sourceReceiptDigest === receipt.additiveRelease.sourceReceiptDigest) {
    addSuitabilityIssue(context, "Ingestion receipts require a distinct additive release identity", ["additiveRelease"]);
  }
});

/** Evidence-only receipt contract for an approved ingestion; this module does not generate or publish assets. */
export type StandardPackCanonicalIngestionReceipt = z.infer<typeof standardPackCanonicalIngestionReceiptSchema>;

/** Serializes the digest-independent payload for a canonical ingestion receipt. */
export function serializeStandardPackCanonicalIngestionReceiptPayload(
  receipt: StandardPackCanonicalIngestionReceipt,
): string {
  const { receiptDigest: _receiptDigest, ...payload } = receipt;
  return stableJson(payload);
}

/**
 * Validates structural and real SHA-256 integrity for an evidence-only ingestion receipt.
 * @param candidate The untrusted receipt candidate to validate.
 * @param expectedPredecessorRelease The exact release that must precede the receipt.
 * @returns The validated evidence-only receipt.
 * @throws When the receipt is malformed or its digest does not match its deterministic payload.
 */
export async function validateStandardPackCanonicalIngestionReceipt(
  candidate: unknown,
  expectedPredecessorRelease: {
    readonly version: string;
    readonly catalogDigest: string;
    readonly sourceReceiptDigest: string;
  } = ACCEPTED_STANDARD_ASSET_RELEASE,
): Promise<StandardPackCanonicalIngestionReceipt> {
  const receipt = standardPackCanonicalIngestionReceiptSchema.parse(candidate);
  if (receipt.predecessorRelease.version !== expectedPredecessorRelease.version
    || receipt.predecessorRelease.catalogDigest !== expectedPredecessorRelease.catalogDigest
    || receipt.predecessorRelease.sourceReceiptDigest !== expectedPredecessorRelease.sourceReceiptDigest) {
    throw new Error("Canonical ingestion receipt does not bind the exact expected predecessor release");
  }
  const receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt));
  if (receiptDigest !== receipt.receiptDigest) {
    throw new Error("Canonical ingestion receipt digest does not match its deterministic payload");
  }
  return Object.freeze(receipt);
}
