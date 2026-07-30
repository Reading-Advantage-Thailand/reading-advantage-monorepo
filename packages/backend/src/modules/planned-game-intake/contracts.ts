import { z } from "zod";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const identifierSchema = z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u);
const nonBlankStringSchema = z.string().trim().min(1).max(500);
const identityKeySchema = z.string().trim().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const futureTrackIdSchema = z.string().regex(/^apk_future_[a-z0-9_]+_implementation$/u);

const placeholderOrGenericIdentityKeys = new Set([
  "example",
  "example-game",
  "game",
  "generic-game",
  "new-game",
  "placeholder",
  "placeholder-game",
  "sample",
  "sample-game",
  "test-game",
  "untitled",
]);

/**
 * Exact normalized identities reserved by the accepted 27-source/29-assignment
 * foundation crosswalk and therefore unavailable to future-game intake.
 */
export const legacyDenominatorIdentityKeys = [
  "dragon-flight",
  "rpg-battle",
  "abyssal-well",
  "castle-defense",
  "magic-defense",
  "wizard-vs-zombie",
  "village-guardian",
  "archers-revenge",
  "storm-the-castle-tower",
  "paladins-twin-soul",
  "gryphon-patrol",
  "dragon-rider",
  "dungeon-liberator",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-of-the-goblin-king",
  "griffin-riders-escape",
  "sorcerers-ziggurat",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "rune-forge-chamber",
  "astral-mage",
  "griffin-sky-joust",
  "realm-carver",
  "devourer-slime",
  "the-haunted-library",
  "babel-architect",
] as const;

const legacyDenominatorIdentityKeySet = new Set<string>(legacyDenominatorIdentityKeys);
const legacyDenominatorSourceIdentityAliasKeySet = new Set([
  "vocabulary-dragon-flight",
  "vocabulary-rpg-battle",
  "sentence-castle-defense",
  "vocabulary-magic-defense",
  "vocabulary-wizard-vs-zombie",
  "sentence-village-guardian",
  "catalog-archers-revenge",
  "catalog-storm-castle-tower",
  "catalog-paladins-twin-soul",
  "catalog-gryphon-patrol",
  "vocabulary-dragon-rider",
  "sentence-dungeon-liberator",
  "catalog-spellweavers-run",
  "sentence-shadow-gate-dungeon",
  "sentence-labyrinth-goblin-king",
  "catalog-griffin-riders-escape",
  "catalog-sorcerer-ziggurat",
  "vocabulary-enchanted-library",
  "vocabulary-rune-match",
  "vocabulary-alchemists-synthesis",
  "sentence-potion-rush",
  "sentence-rune-forge-chamber",
  "catalog-astral-mage",
  "catalog-griffin-sky-joust",
  "catalog-realm-carver",
  "sentence-devourer-slime",
  "sentence-haunted-library",
]);


/** Normalizes a title into the exact lowercase key used by the intake boundary. */
function normalizeIdentityKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0027\u2019]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/** Rejects duplicate strings in a required evidence collection. */
function requireUniqueValues(
  values: readonly string[],
  path: readonly (string | number)[],
  context: z.RefinementCtx,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path],
      message: "Evidence collection entries must be unique",
    });
  }
}

/**
 * Declares the complete set of operational authority bits that an intake and
 * its child-track proposal must keep literally false.
 */
export const plannedGameIntakeAuthoritySchema = z.strictObject({
  implementationAuthorized: z.literal(false),
  routeAuthorized: z.literal(false),
  cartridgeAuthorized: z.literal(false),
  catalogAuthorized: z.literal(false),
  semanticMappingAuthorized: z.literal(false),
  assetAdoptionAuthorized: z.literal(false),
  ingestionAuthorized: z.literal(false),
  titleAdoptionAuthorized: z.literal(false),
  migrationAuthorized: z.literal(false),
  cutoverAuthorized: z.literal(false),
  retirementAuthorized: z.literal(false),
  deploymentAuthorized: z.literal(false),
  gitPublicationAuthorized: z.literal(false),
});

/** Operational authority boundary carried by an intake proposal. */
export type PlannedGameIntakeAuthority = z.infer<typeof plannedGameIntakeAuthoritySchema>;

/**
 * Models independently recorded product-owner evidence without creating,
 * persisting, or treating any approval as operational authority.
 */
export const plannedGameOwnerEvidenceSchema = z.strictObject({
  ownerId: identifierSchema,
  candidateDigest: digestSchema,
  identityDigest: digestSchema,
  approvalDigest: digestSchema,
  decision: z.literal("approved"),
  reviewedAt: z.string().datetime({ offset: true }),
});

/** Product-owner evidence shape required for a future intake candidate. */
export type PlannedGameOwnerEvidence = z.infer<typeof plannedGameOwnerEvidenceSchema>;

/** Models an independent review of the same exact intake candidate digest. */
export const plannedGameIndependentReviewSchema = z.strictObject({
  reviewerId: identifierSchema,
  candidateDigest: digestSchema,
  reviewDigest: digestSchema,
  decision: z.literal("accepted"),
  reviewedAt: z.string().datetime({ offset: true }),
});

/** Independent review evidence shape required for a future intake candidate. */
export type PlannedGameIndependentReview = z.infer<typeof plannedGameIndependentReviewSchema>;

/**
 * Validates a complete, evidence-first new-game intake candidate without
 * accepting an asset, title, implementation, route, catalog, or release.
 */
export const plannedGameIntakeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  intakeDigest: digestSchema,
  submittedBy: identifierSchema,
  identity: z.strictObject({
    title: nonBlankStringSchema,
    key: identityKeySchema,
    identityDigest: digestSchema,
  }),
  ownerEvidence: plannedGameOwnerEvidenceSchema,
  independentReview: plannedGameIndependentReviewSchema,
  learningObjective: z.strictObject({
    statement: nonBlankStringSchema,
    objectiveIds: z.array(identifierSchema).min(1),
    evidenceDigest: digestSchema,
  }).superRefine((value, context) => {
    requireUniqueValues(value.objectiveIds, ["objectiveIds"], context);
  }),
  contentContract: z.strictObject({
    contentDigest: digestSchema,
    itemCount: z.number().int().positive(),
    assessmentSignals: z.array(identifierSchema).min(1),
  }).superRefine((value, context) => {
    requireUniqueValues(value.assessmentSignals, ["assessmentSignals"], context);
  }),
  mechanicEvidence: z.array(z.strictObject({
    mechanicId: identifierSchema,
    behavior: nonBlankStringSchema,
    evidenceDigest: digestSchema,
  })).min(1).superRefine((value, context) => {
    requireUniqueValues(value.map(({ mechanicId }) => mechanicId), [], context);
  }),
  capabilityAssessment: z.array(z.strictObject({
    capabilityId: identifierSchema,
    plannedDisposition: z.enum(["reuse", "extend", "bespoke"]),
    rationale: nonBlankStringSchema,
    expectedOutcome: nonBlankStringSchema,
    evidenceDigest: digestSchema,
  })).min(1).superRefine((value, context) => {
    requireUniqueValues(value.map(({ capabilityId }) => capabilityId), [], context);
  }),
  semanticRoleRequirements: z.array(z.strictObject({
    roleId: identifierSchema,
    state: identifierSchema,
    behaviorRequirement: nonBlankStringSchema,
    evidenceDigest: digestSchema,
  })).min(1).superRefine((value, context) => {
    requireUniqueValues(value.map(({ roleId, state }) => roleId + ":" + state), [], context);
  }),
  physicalBehaviorRequirements: z.array(z.strictObject({
    requirementId: identifierSchema,
    mediaKind: z.enum(["animated-visual", "audio-cue", "interaction", "layout", "visual-feedback"]),
    directions: z.array(nonBlankStringSchema).min(1),
    clipRequirements: z.array(identifierSchema).min(1),
    minimumFrameCount: z.number().int().positive(),
    geometryConstraints: z.array(nonBlankStringSchema).min(1),
    accessibilityConstraints: z.array(nonBlankStringSchema).min(1),
    evidenceDigest: digestSchema,
  })).min(1).superRefine((value, context) => {
    requireUniqueValues(value.map(({ requirementId }) => requirementId), [], context);
  }),
  suitabilityAndIngestion: z.strictObject({
    status: z.literal("blocked-pending-separate-suitability"),
    dependencyTrackId: z.literal("apk_standard_pack_suitability_ingestion_20260728"),
    evidenceDigest: digestSchema,
    assetAdoptionAuthorized: z.literal(false),
    ingestionAuthorized: z.literal(false),
  }),
  hostAndRetirementBoundary: z.strictObject({
    evidenceDigest: digestSchema,
    hostAdoptionAuthorized: z.literal(false),
    retirementAuthorized: z.literal(false),
  }),
  childTrack: z.strictObject({
    trackId: futureTrackIdSchema,
    scope: nonBlankStringSchema,
    proposalDigest: digestSchema,
  }),
  authority: plannedGameIntakeAuthoritySchema,
}).superRefine((value, context) => {
  const normalizedTitleKey = normalizeIdentityKey(value.identity.title);

  if (value.identity.key !== normalizedTitleKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identity", "key"],
      message: "Identity key must be the normalized title key",
    });
  }
  if (placeholderOrGenericIdentityKeys.has(normalizedTitleKey)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identity", "title"],
      message: "Placeholder and generic identities are not eligible for intake",
    });
  }
  if (
    legacyDenominatorIdentityKeySet.has(normalizedTitleKey)
    || legacyDenominatorSourceIdentityAliasKeySet.has(normalizedTitleKey)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identity", "title"],
      message: "Legacy denominator identities are ineligible for future-game intake",
    });
  }
  if (value.ownerEvidence.candidateDigest !== value.intakeDigest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownerEvidence", "candidateDigest"],
      message: "Owner evidence must bind the exact intake digest",
    });
  }
  if (value.ownerEvidence.identityDigest !== value.identity.identityDigest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownerEvidence", "identityDigest"],
      message: "Owner evidence must bind the exact identity digest",
    });
  }
  if (value.independentReview.candidateDigest !== value.intakeDigest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["independentReview", "candidateDigest"],
      message: "Independent review must bind the exact intake digest",
    });
  }
  if (
    value.independentReview.reviewerId === value.submittedBy
    || value.independentReview.reviewerId === value.ownerEvidence.ownerId
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["independentReview", "reviewerId"],
      message: "Independent reviewer must differ from the submitter and product owner",
    });
  }
  const expectedChildTrackId = "apk_future_" + value.identity.key.replace(/-/gu, "_") + "_implementation";
  if (value.childTrack.trackId !== expectedChildTrackId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["childTrack", "trackId"],
      message: "Child-track proposal must bind the normalized intake identity",
    });
  }
  if (value.childTrack.proposalDigest !== value.intakeDigest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["childTrack", "proposalDigest"],
      message: "Child-track proposal must bind the exact intake digest",
    });
  }
});

/** Complete planning-only future-game intake candidate. */
export type PlannedGameIntake = z.infer<typeof plannedGameIntakeSchema>;

/**
 * Validates one intake candidate against a caller-supplied, pure duplicate
 * context and rejects legacy-denominator or previously proposed identities.
 */
export const plannedGameIntakeValidationRequestSchema = z.strictObject({
  intake: plannedGameIntakeSchema,
  existingProposalIdentityKeys: z.array(identityKeySchema),
}).superRefine((value, context) => {
  requireUniqueValues(value.existingProposalIdentityKeys, ["existingProposalIdentityKeys"], context);
  if (value.existingProposalIdentityKeys.includes(value.intake.identity.key)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["intake", "identity", "key"],
      message: "A future-game intake proposal already uses this identity key",
    });
  }
});

/** Complete pure validation request for a future-game intake candidate. */
export type PlannedGameIntakeValidationRequest = z.infer<typeof plannedGameIntakeValidationRequestSchema>;

/**
 * Defines the only possible result of a structurally valid intake: a
 * non-authorizing child-track proposal with all operational flags false.
 */
export const plannedGameChildTrackProposalSchema = z.strictObject({
  proposalType: z.literal("bounded-child-track-proposal"),
  parentTrackId: z.literal("apk_new_game_intake_20260727"),
  trackId: futureTrackIdSchema,
  intakeDigest: digestSchema,
  identity: z.strictObject({
    title: nonBlankStringSchema,
    key: identityKeySchema,
  }),
  requiredEvidence: z.strictObject({
    ownerApprovalDigest: digestSchema,
    independentReviewDigest: digestSchema,
    suitabilityDependencyDigest: digestSchema,
  }),
  legacyDenominatorMembership: z.literal(false),
  authority: plannedGameIntakeAuthoritySchema,
});

/** Bounded, non-authorizing child-track proposal derived from a valid intake. */
export type PlannedGameChildTrackProposal = z.infer<typeof plannedGameChildTrackProposalSchema>;

/**
 * Parses one candidate and returns a bounded child-track proposal only.
 * @param request Candidate evidence and existing identity keys.
 * @returns A digest-bound proposal with every operational authority bit false.
 * @throws When evidence is incomplete, identities are ineligible, or any authority is requested.
 */
export function proposePlannedGameChildTrack(
  request: PlannedGameIntakeValidationRequest,
): PlannedGameChildTrackProposal {
  const { intake } = plannedGameIntakeValidationRequestSchema.parse(request);

  return plannedGameChildTrackProposalSchema.parse({
    proposalType: "bounded-child-track-proposal",
    parentTrackId: "apk_new_game_intake_20260727",
    trackId: intake.childTrack.trackId,
    intakeDigest: intake.intakeDigest,
    identity: {
      title: intake.identity.title,
      key: intake.identity.key,
    },
    requiredEvidence: {
      ownerApprovalDigest: intake.ownerEvidence.approvalDigest,
      independentReviewDigest: intake.independentReview.reviewDigest,
      suitabilityDependencyDigest: intake.suitabilityAndIngestion.evidenceDigest,
    },
    legacyDenominatorMembership: false,
    authority: intake.authority,
  });
}
