import { describe, expect, expectTypeOf, it } from "vitest";

import {
  legacyDenominatorIdentityKeys,
  plannedGameIntakeValidationRequestSchema,
  proposePlannedGameChildTrack,
  type PlannedGameChildTrackProposal,
} from "../index.js";

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
const digest = (letter: string): string => letter.repeat(64);

const authority = {
  implementationAuthorized: false as const,
  routeAuthorized: false as const,
  cartridgeAuthorized: false as const,
  catalogAuthorized: false as const,
  semanticMappingAuthorized: false as const,
  assetAdoptionAuthorized: false as const,
  ingestionAuthorized: false as const,
  titleAdoptionAuthorized: false as const,
  migrationAuthorized: false as const,
  cutoverAuthorized: false as const,
  retirementAuthorized: false as const,
  deploymentAuthorized: false as const,
  gitPublicationAuthorized: false as const,
};

const validRequest = {
  intake: {
    schemaVersion: 1 as const,
    intakeDigest: digest("a"),
    submittedBy: "intake-author",
    identity: {
      title: "Cipher Harbor",
      key: "cipher-harbor",
      identityDigest: digest("b"),
    },
    ownerEvidence: {
      ownerId: "product-owner-42",
      candidateDigest: digest("a"),
      identityDigest: digest("b"),
      approvalDigest: digest("c"),
      decision: "approved" as const,
      reviewedAt: "2026-07-31T12:00:00.000Z",
    },
    independentReview: {
      reviewerId: "independent-reviewer-31",
      candidateDigest: digest("a"),
      reviewDigest: digest("d"),
      decision: "accepted" as const,
      reviewedAt: "2026-07-31T12:05:00.000Z",
    },
    learningObjective: {
      statement: "Learners sequence evidence-backed cipher steps to solve a harbor signal.",
      objectiveIds: ["reading.evidence-sequencing"],
      evidenceDigest: digest("e"),
    },
    contentContract: {
      contentDigest: digest("f"),
      itemCount: 12,
      assessmentSignals: ["ordered-cipher-steps"],
    },
    mechanicEvidence: [
      {
        mechanicId: "cipher-sequencing",
        behavior: "Players sequence evidence-backed cipher steps before submitting.",
        evidenceDigest: digest("1"),
      },
    ],
    capabilityAssessment: [
      {
        capabilityId: "evidence-sequencing",
        expectedOutcome: "The learner can order cited cipher evidence.",
        evidenceDigest: digest("2"),
      },
    ],
    semanticRoleRequirements: [
      {
        roleId: "player-avatar",
        state: "solving",
        behaviorRequirement: "The avatar remains legible while solving.",
        evidenceDigest: digest("3"),
      },
    ],
    physicalBehaviorDescriptors: [
      {
        descriptorId: "harbor-signal-feedback",
        behavior: "Feedback distinguishes a correct sequence from an incorrect sequence.",
        evidenceDigest: digest("4"),
      },
    ],
    suitabilityAndIngestion: {
      status: "blocked-pending-separate-suitability" as const,
      dependencyTrackId: "apk_standard_pack_suitability_ingestion_20260728",
      evidenceDigest: digest("5"),
      assetAdoptionAuthorized: false as const,
      ingestionAuthorized: false as const,
    },
    hostAndRetirementBoundary: {
      evidenceDigest: digest("6"),
      hostAdoptionAuthorized: false as const,
      retirementAuthorized: false as const,
    },
    childTrack: {
      trackId: "apk_future_cipher_harbor_implementation",
      scope: "Implement only the reviewed Cipher Harbor learning loop after separate child-track acceptance.",
      proposalDigest: digest("a"),
    },
    authority,
  },
  existingProposalIdentityKeys: [],
};

describe("planned-game intake contract", () => {
  it("returns only a bounded child-track proposal with every authority bit literally false", () => {
    expect(plannedGameIntakeValidationRequestSchema.safeParse(validRequest).success).toBe(true);

    const proposal = proposePlannedGameChildTrack(validRequest);

    expectTypeOf(proposal).toEqualTypeOf<PlannedGameChildTrackProposal>();
    expect(proposal).toEqual({
      proposalType: "bounded-child-track-proposal",
      parentTrackId: "apk_new_game_intake_20260727",
      trackId: "apk_future_cipher_harbor_implementation",
      intakeDigest: digest("a"),
      identity: {
        title: "Cipher Harbor",
        key: "cipher-harbor",
      },
      requiredEvidence: {
        ownerApprovalDigest: digest("c"),
        independentReviewDigest: digest("d"),
        suitabilityDependencyDigest: digest("5"),
      },
      legacyDenominatorMembership: false,
      authority,
    });
  });

  it("rejects blank, placeholder, generic, duplicate, and legacy-denominator identities", () => {
    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        identity: { ...validRequest.intake.identity, title: "   " },
      },
    }).success).toBe(false);

    for (const [title, key] of [
      ["New Game", "new-game"],
      ["Sample Game", "sample-game"],
      ["Example Game", "example-game"],
      ["Untitled", "untitled"],
    ]) {
      expect(plannedGameIntakeValidationRequestSchema.safeParse({
        ...validRequest,
        intake: {
          ...validRequest.intake,
          identity: { ...validRequest.intake.identity, title, key },
        },
      }).success).toBe(false);
    }

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      existingProposalIdentityKeys: ["cipher-harbor"],
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        identity: {
          ...validRequest.intake.identity,
          title: "Dragon Flight",
          key: "dragon-flight",
        },
      },
    }).success).toBe(false);

    expect(legacyDenominatorIdentityKeys).toContain("dragon-flight");
    expect(legacyDenominatorIdentityKeys).toContain("babel-architect");
  });

  it("requires complete, independently bound evidence and rejects all unselected physical data", () => {
    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        independentReview: {
          ...validRequest.intake.independentReview,
          candidateDigest: digest("9"),
        },
      },
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        independentReview: {
          ...validRequest.intake.independentReview,
          reviewerId: validRequest.intake.ownerEvidence.ownerId,
        },
      },
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        ownerEvidence: {
          ...validRequest.intake.ownerEvidence,
          identityDigest: digest("9"),
        },
      },
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        capabilityAssessment: [],
      },
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        physicalBehaviorDescriptors: [{
          ...validRequest.intake.physicalBehaviorDescriptors[0],
          selectedSpritePath: "/art/selected.png",
        }],
      },
    }).success).toBe(false);

    expect(plannedGameIntakeValidationRequestSchema.safeParse({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        semanticRoleRequirements: [{
          ...validRequest.intake.semanticRoleRequirements[0],
          physicalAssetSelection: "canonical-hero",
        }],
      },
    }).success).toBe(false);
  });

  it("rejects every operational authority bit and never offers an authorization escape hatch", () => {
    for (const authorityKey of Object.keys(authority) as (keyof typeof authority)[]) {
      expect(plannedGameIntakeValidationRequestSchema.safeParse({
        ...validRequest,
        intake: {
          ...validRequest.intake,
          authority: {
            ...authority,
            [authorityKey]: true,
          },
        },
      }).success).toBe(false);
    }

    expect(() => proposePlannedGameChildTrack({
      ...validRequest,
      intake: {
        ...validRequest.intake,
        authority: {
          ...authority,
          deploymentAuthorized: true,
        },
      },
    })).toThrow();
  });
});
