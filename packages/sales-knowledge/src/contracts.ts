import {
  knowledgeSpaceSchema,
  type KnowledgeSpace,
} from "@reading-advantage/knowledge-space-core";
import { z } from "zod";

/** Stable release identifier for the reviewed Sales Mastery graph. */
export const SALES_KNOWLEDGE_RELEASE_ID =
  "knowledge-space-sales-mastery-v1.0.0" as const;

/** Versioned envelope name for Sales graph and binding artifacts. */
export const SALES_KNOWLEDGE_RELEASE_ENVELOPE =
  "sales-mastery-release.v1" as const;

/** Immutable digest of the approved Sales curriculum graph. */
export const APPROVED_CURRICULUM_DIGEST =
  "ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717" as const;

/** Immutable digest of the owner-controlled curriculum approval evidence. */
export const APPROVAL_EVIDENCE_DIGEST =
  "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404" as const;

/** Approved source revision for the Sales curriculum corpus. */
export const APPROVED_SOURCE_COMMIT =
  "8dd78171f1d57dd775fad2295d60e86fb267dad8" as const;

/** Checked-in source artifact whose coordinates are protected by the release. */
export const APPROVED_SEED_ARTIFACT =
  "apps/sales-advantage/scripts/static-seed.ts" as const;

/** Byte-exact digest of the approved curriculum release candidate. */
export const RELEASE_CANDIDATE_BYTE_SHA256 =
  "723198653a09417f92b597a3faefe919e3d83504f3320f9d962ac0ea1f8b2168" as const;

/** Canonical JSON digest of the approved curriculum release candidate. */
export const RELEASE_CANDIDATE_CANONICAL_SHA256 =
  "38d50d73da86eb1088df7ab927c033b145afaa32148543b451c86fd30bbb6160" as const;

/** Canonical JSON digest of the owner approval evidence. */
export const APPROVAL_CANONICAL_SHA256 =
  "56096b7d154a90e00d49ec2dca44ccb15c8c5e63d2eb605d37e6929ae679f12b" as const;

/** Byte-exact digest of the approved deterministic Sales seed source. */
export const STATIC_SEED_BYTE_SHA256 =
  "0519b43a6c1a177bcbd7f06fe4d9cf86225afedd5af1f0b76e2aa04c4f3d13ec" as const;

/** Canonical digest of the checked-in Sales bindings release. */
export const SALES_BINDINGS_CANONICAL_SHA256 =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197" as const;

/** Canonical digest of the checked-in Sales graph release. */
export const SALES_GRAPH_CANONICAL_SHA256 =
  "5f2b35f7178f0fed9ca103959d59d5e75c0f4818eac355c14a1be270776a9808" as const;

/** Strict provenance attached to every Sales release artifact. */
export const SalesReleaseProvenanceSchema = z
  .object({
    curriculumGraphSha256: z.string().regex(/^[0-9a-f]{64}$/),
    approvalSha256: z.string().regex(/^[0-9a-f]{64}$/),
    sourceRepository: z.string().trim().min(1),
    sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
    seedArtifact: z.string().trim().min(1).optional(),
  })
  .strict();

const KnowledgeSpaceSchema = knowledgeSpaceSchema;

/** Strict reviewed envelope for the Sales knowledge-space graph release. */
export const SalesKnowledgeReleaseSchema = z
  .object({
    schemaVersion: z.literal(SALES_KNOWLEDGE_RELEASE_ENVELOPE),
    releaseId: z.literal(SALES_KNOWLEDGE_RELEASE_ID),
    graphVersion: z.literal("1.0.0"),
    releaseStatus: z.literal("reviewed"),
    provenance: SalesReleaseProvenanceSchema.omit({ seedArtifact: true }),
    knowledgeSpace: KnowledgeSpaceSchema,
  })
  .strict();

/** Validated, reviewed Sales graph release. */
export type SalesKnowledgeRelease = z.infer<typeof SalesKnowledgeReleaseSchema>;

/** Stable source coordinate for one lesson or lesson item. */
export const SalesActivitySourceSchema = z
  .object({
    moduleSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lessonOrder: z.number().int().positive(),
    itemOrder: z.number().int().positive().optional(),
  })
  .strict();

/** Immutable evaluator provenance required before roleplay evidence is eligible. */
export const SalesEvaluatorEligibilitySchema = z
  .object({
    contractVersion: z.string().trim().min(1).optional(),
    immutableAttempt: z.boolean().optional(),
    evaluator: z
      .object({
        provider: z.string().trim().min(1).optional(),
        model: z.string().trim().min(1).optional(),
        evaluatorVersion: z.string().trim().min(1).optional(),
      })
      .strict(),
    rubric: z
      .object({
        rubricId: z
          .string()
          .regex(/^sales\.rubric\.[a-z0-9.-]+\.v1$/)
          .optional(),
        rubricDigest: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
      })
      .strict(),
    attempt: z
      .object({
        attemptId: z.string().trim().min(1).optional(),
        attemptDigest: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** One immutable curriculum-to-objective binding. */
export const SalesCurriculumBindingSchema = z
  .object({
    activityId: z.string().regex(/^sales\.[a-z0-9.-]+$/),
    activityKind: z.enum(["lesson", "quiz-question", "roleplay"]),
    source: SalesActivitySourceSchema,
    objectiveIds: z.array(z.string().regex(/^sales\.[a-z0-9.-]+$/)).min(1),
    practiceContract: z.literal("practice.v1").optional(),
    practiceMode: z.enum(["exposure", "assessment"]),
    evidenceMode: z.enum([
      "exposure",
      "assessed",
      "pending_evaluator_eligibility",
    ]),
    evidenceWeight: z.number().min(0).max(1),
    evidenceSource: z.enum([
      "lesson-view",
      "quiz-response",
      "roleplay-evaluation",
    ]),
    evidenceOutcomes: z.array(z.string().trim().min(1)),
    variantId: z
      .string()
      .regex(/^sales\.[a-z0-9.-]+\.v1$/)
      .nullable(),
    variantFamily: z
      .string()
      .regex(/^sales\.[a-z0-9.-]+\.v1$/)
      .nullable(),
    misconceptionTags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    rubricRefs: z.array(z.string().regex(/^sales\.rubric\.[a-z0-9.-]+\.v1$/)),
    evaluatorEligibility: SalesEvaluatorEligibilitySchema.nullable().optional(),
    objectiveDerivation: z
      .object({
        kind: z.literal("approved-coordinate"),
        source: z.literal(APPROVED_SEED_ARTIFACT),
      })
      .strict(),
  })
  .strict();

/** One rubric preserved from the approved roleplay curriculum. */
export const SalesRubricSchema = z
  .object({
    rubricId: z.string().regex(/^sales\.rubric\.[a-z0-9.-]+\.v1$/),
    sourceRef: z.string().trim().min(1),
    criteria: z
      .array(
        z
          .object({
            criterion: z.string().trim().min(1),
            weight: z.number().positive(),
            passingScore: z.number().min(0).max(100),
            sourceRef: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/** Strict release of Sales curriculum bindings and roleplay rubrics. */
export const SalesCurriculumBindingsReleaseSchema = z
  .object({
    schemaVersion: z.literal(SALES_KNOWLEDGE_RELEASE_ENVELOPE),
    releaseId: z.literal(SALES_KNOWLEDGE_RELEASE_ID),
    graphVersion: z.literal("1.0.0"),
    provenance: SalesReleaseProvenanceSchema.required({ seedArtifact: true }),
    rubrics: z.array(SalesRubricSchema).min(1),
    bindings: z.array(SalesCurriculumBindingSchema).min(1),
  })
  .strict();

/** Validated Sales curriculum binding release. */
export type SalesCurriculumBindingsRelease = z.infer<
  typeof SalesCurriculumBindingsReleaseSchema
>;

/** Structural shape accepted by the deterministic binding generator. */
export interface SalesCurriculumModuleInput {
  /** Stable module slug. */
  slug: string;
  /** Stable module order. */
  order: number;
  /** Lessons whose order and item counts are protected. */
  lessons: ReadonlyArray<SalesCurriculumLessonInput>;
}

/** Structural lesson input consumed by the deterministic generator. */
export interface SalesCurriculumLessonInput {
  /** Stable lesson order. */
  order: number;
  /** Optional quiz rows; their content is deliberately ignored. */
  quizQuestions?: ReadonlyArray<unknown>;
  /** Optional roleplay rows; their content is used only for rubric structure. */
  scenarios?: ReadonlyArray<SalesScenarioInput>;
}

/** Structural roleplay input used to carry approved rubric criteria. */
export interface SalesScenarioInput {
  /** Approved rubric criteria from the source row. */
  rubric?: ReadonlyArray<SalesRubricCriterionInput>;
}

/** One approved roleplay rubric criterion. */
export interface SalesRubricCriterionInput {
  /** Human-readable criterion retained as reviewed scoring metadata. */
  criterion: string;
  /** Criterion weight. */
  weight: number;
  /** Passing threshold. */
  passingScore: number;
  /** Source citation for the criterion. */
  sourceRef: string;
}

/** One structured validation issue returned by the Sales package. */
export interface SalesKnowledgeIssue {
  /** Stable machine-readable issue code. */
  code: string;
  /** Actionable validation message. */
  message: string;
  /** Optional affected entity identifier. */
  entityId?: string;
  /** Optional structural path. */
  path?: string;
}

/** Fail-closed graph or binding validation result. */
export interface SalesKnowledgeValidationResult {
  /** Whether the candidate is safe for the reviewed release. */
  valid: boolean;
  /** Deterministically ordered validation issues. */
  issues: SalesKnowledgeIssue[];
}

/** Parses unknown input at the reviewed Sales graph contract boundary.
 * @param input Candidate graph release.
 * @returns A structurally validated Sales release.
 * @throws When the release envelope or knowledge space is malformed.
 */
export function parseSalesKnowledgeRelease(
  input: unknown,
): SalesKnowledgeRelease {
  return SalesKnowledgeReleaseSchema.parse(input);
}

/** Parses unknown input at the reviewed Sales binding contract boundary.
 * @param input Candidate curriculum binding release.
 * @returns A structurally validated binding release.
 * @throws When the binding envelope, rubric, or activity shape is malformed.
 */
export function parseSalesCurriculumBindings(
  input: unknown,
): SalesCurriculumBindingsRelease {
  return SalesCurriculumBindingsReleaseSchema.parse(input);
}

/** Narrows a validated graph value to the domain-neutral knowledge-space type. */
export type SalesKnowledgeSpace = KnowledgeSpace;
