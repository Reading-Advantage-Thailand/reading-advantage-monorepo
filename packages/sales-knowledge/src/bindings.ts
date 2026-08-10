import { createHash } from "node:crypto";

import {
  APPROVAL_CANONICAL_SHA256,
  APPROVED_CURRICULUM_DIGEST,
  APPROVED_SEED_ARTIFACT,
  APPROVED_SOURCE_COMMIT,
  APPROVAL_EVIDENCE_DIGEST,
  RELEASE_CANDIDATE_CANONICAL_SHA256,
  SalesCurriculumBindingsReleaseSchema,
  SalesKnowledgeReleaseSchema,
  type SalesCurriculumBindingsRelease,
  type SalesKnowledgeIssue,
  type SalesKnowledgeRelease,
  type SalesKnowledgeValidationResult,
} from "./contracts.js";
import {
  salesLessonId,
  salesObjectiveId,
  salesQuizId,
  salesRoleplayId,
} from "./graph.js";
import {
  salesProtectedCoordinates,
  type SalesProtectedCoordinate,
} from "./inventory.js";
import { validateSalesKnowledgeRelease } from "./validation.js";

const APPROVED_RUBRIC_SOURCE_REFS = new Set([
  "09-sales-enablement/distributor-rep-onboarding/faq.md#q11-what-if-a-school-asks-for-a-discount-or-a-special-price",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
  "09-sales-enablement/roi-calculator.md#methodology",
  "general-sales://challenger-sale-dixon-adamson-2011#commercial-teaching",
  "general-sales://challenger-sale-dixon-adamson-2011#reframe",
  "general-sales://challenger-sale-dixon-adamson-2011#tailor",
  "general-sales://feel-felt-found#acknowledge-before-response",
  "general-sales://never-split-the-difference-voss-2016#tactical-empathy",
  "general-sales://prospect-theory-kahneman-tversky-1979#loss-aversion",
  "general-sales://prospect-theory-kahneman-tversky-1979#status-quo-bias",
  "general-sales://sandler-selling-system#post-sell",
  "general-sales://sandler-selling-system#reverse-and-isolate",
  "general-sales://sandler-selling-system#up-front-contract",
  "general-sales://spin-selling-rackham-1988#discovery-before-solution",
  "general-sales://spin-selling-rackham-1988#need-payoff",
  "general-sales://spin-selling-rackham-1988#question-sequence",
]);

function canonicalJsonSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function coordinateKey(coordinate: SalesProtectedCoordinate): string {
  return `${coordinate.kind}:${coordinate.moduleSlug}:${coordinate.lessonOrder}:${coordinate.itemOrder ?? ""}`;
}

function activityIdFor(coordinate: SalesProtectedCoordinate): string {
  if (coordinate.kind === "lesson")
    return salesLessonId(coordinate.moduleSlug, coordinate.lessonOrder);
  if (coordinate.itemOrder == null) {
    throw new Error("SALES_COORDINATE_EVIDENCE_MISMATCH missing item order");
  }
  if (coordinate.kind === "quiz-question") {
    return salesQuizId(
      coordinate.moduleSlug,
      coordinate.lessonOrder,
      coordinate.itemOrder,
    );
  }
  return salesRoleplayId(
    coordinate.moduleSlug,
    coordinate.lessonOrder,
    coordinate.itemOrder,
  );
}

function issue(
  code: string,
  message: string,
  entityId?: string,
): SalesKnowledgeIssue {
  return { code, message, ...(entityId == null ? {} : { entityId }) };
}

function sourceIsApproved(source: unknown): boolean {
  return typeof source === "string" && APPROVED_RUBRIC_SOURCE_REFS.has(source);
}

function validateReleaseProvenance(
  release: SalesCurriculumBindingsRelease,
  evidence: { releaseCandidate: unknown; approval: unknown },
): SalesKnowledgeIssue[] {
  const issues: SalesKnowledgeIssue[] = [];
  const provenance = release.provenance;
  if (provenance.curriculumGraphSha256 !== APPROVED_CURRICULUM_DIGEST)
    issues.push(
      issue(
        "GRAPH_DRIFT",
        "Binding provenance does not match the approved curriculum digest.",
      ),
    );
  if (provenance.approvalSha256 !== APPROVAL_EVIDENCE_DIGEST)
    issues.push(
      issue(
        "APPROVAL_DRIFT",
        "Binding provenance does not match the owner approval digest.",
      ),
    );
  if (
    provenance.sourceRepository !== "advantage-pr" ||
    provenance.sourceCommit !== APPROVED_SOURCE_COMMIT
  )
    issues.push(
      issue(
        "SOURCE_PROVENANCE_DRIFT",
        "Binding provenance does not match the approved source revision.",
      ),
    );
  if (provenance.seedArtifact !== APPROVED_SEED_ARTIFACT)
    issues.push(
      issue(
        "SOURCE_PROVENANCE_DRIFT",
        "Binding provenance does not identify the approved static seed artifact.",
      ),
    );

  if (
    canonicalJsonSha256(evidence.releaseCandidate) !==
      RELEASE_CANDIDATE_CANONICAL_SHA256 ||
    canonicalJsonSha256(evidence.approval) !== APPROVAL_CANONICAL_SHA256
  ) {
    issues.push(
      issue(
        "APPROVAL_DRIFT",
        "The owner-controlled release candidate or approval evidence drifted from the approved corpus.",
      ),
    );
  }
  return issues;
}

function validateRubrics(
  release: SalesCurriculumBindingsRelease,
  issues: SalesKnowledgeIssue[],
): void {
  const seen = new Set<string>();
  for (const rubric of release.rubrics) {
    if (seen.has(rubric.rubricId))
      issues.push(
        issue(
          "DUPLICATE_RUBRIC_ID",
          "Rubric IDs must be unique.",
          rubric.rubricId,
        ),
      );
    seen.add(rubric.rubricId);
    if (!sourceIsApproved(rubric.sourceRef))
      issues.push(
        issue(
          "UNAPPROVED_SOURCE_REF",
          "Rubric source reference is outside the approved Sales corpus.",
          rubric.rubricId,
        ),
      );
    for (const criterion of rubric.criteria) {
      if (!sourceIsApproved(criterion.sourceRef)) {
        issues.push(
          issue(
            "UNAPPROVED_SOURCE_REF",
            "Rubric criterion source reference is outside the approved Sales corpus.",
            rubric.rubricId,
          ),
        );
      }
    }
  }
}

function validateBindingShape(
  release: SalesCurriculumBindingsRelease,
  graph: SalesKnowledgeRelease,
  issues: SalesKnowledgeIssue[],
): void {
  const graphObjectives = new Set(
    graph.knowledgeSpace.nodes
      .filter((node) => node.kind === "skill")
      .map((node) => node.id),
  );
  const expected = salesProtectedCoordinates();
  const expectedByActivity = new Map(
    expected.map((item) => [activityIdFor(item), item]),
  );
  const seenActivities = new Set<string>();
  const seenVariants = new Set<string>();
  const seenCoordinates = new Set<string>();

  for (const binding of release.bindings) {
    if (seenActivities.has(binding.activityId))
      issues.push(
        issue(
          "DUPLICATE_ACTIVITY_ID",
          "Activity IDs must be unique.",
          binding.activityId,
        ),
      );
    seenActivities.add(binding.activityId);
    const expectedCoordinate = expectedByActivity.get(binding.activityId);
    if (expectedCoordinate == null) {
      issues.push(
        issue(
          "EXTRA_SOURCE_COORDINATE",
          "Binding activity is not an approved source coordinate.",
          binding.activityId,
        ),
      );
    } else {
      if (binding.activityKind !== expectedCoordinate.kind)
        issues.push(
          issue(
            "SOURCE_ROW_DRIFT",
            "Binding kind no longer matches its protected source coordinate.",
            binding.activityId,
          ),
        );
      if (
        binding.source.moduleSlug !== expectedCoordinate.moduleSlug ||
        binding.source.lessonOrder !== expectedCoordinate.lessonOrder ||
        binding.source.itemOrder !== expectedCoordinate.itemOrder
      ) {
        issues.push(
          issue(
            "SOURCE_ROW_DRIFT",
            "Binding source coordinate does not match its stable activity identity.",
            binding.activityId,
          ),
        );
      }
      const key = coordinateKey({
        ...expectedCoordinate,
        itemOrder: binding.source.itemOrder,
      });
      if (seenCoordinates.has(key))
        issues.push(
          issue(
            "DUPLICATE_SOURCE_COORDINATE",
            "A protected source coordinate is bound more than once.",
            binding.activityId,
          ),
        );
      seenCoordinates.add(key);
    }

    if (
      binding.objectiveIds.some(
        (objectiveId) => !graphObjectives.has(objectiveId),
      )
    ) {
      issues.push(
        issue(
          "UNKNOWN_OBJECTIVE",
          "Binding references an objective absent from the reviewed Sales graph.",
          binding.activityId,
        ),
      );
    }
    if (
      binding.objectiveIds.length !== 1 ||
      binding.objectiveIds[0] !==
        salesObjectiveId(binding.source.moduleSlug, binding.source.lessonOrder)
    ) {
      issues.push(
        issue(
          "OBJECTIVE_COORDINATE_DRIFT",
          "Binding objective must be the stable objective for its lesson coordinate.",
          binding.activityId,
        ),
      );
    }
    if (
      binding.objectiveDerivation.kind !== "approved-coordinate" ||
      binding.objectiveDerivation.source !== APPROVED_SEED_ARTIFACT
    ) {
      issues.push(
        issue(
          "PROSE_DERIVED_OBJECTIVE",
          "Sales objectives must be derived from protected coordinates, never lesson prose.",
          binding.activityId,
        ),
      );
    }
    if (binding.variantId != null) {
      if (seenVariants.has(binding.variantId))
        issues.push(
          issue(
            "DUPLICATE_VARIANT_ID",
            "Variant IDs must be unique across assessed Sales activities.",
            binding.activityId,
          ),
        );
      seenVariants.add(binding.variantId);
    }
    if (binding.activityKind === "lesson") {
      if (
        binding.evidenceMode !== "exposure" ||
        binding.evidenceWeight !== 0 ||
        binding.practiceMode !== "exposure" ||
        binding.variantId !== null ||
        binding.variantFamily !== null ||
        binding.evidenceSource !== "lesson-view"
      ) {
        issues.push(
          issue(
            "EXPOSURE_METADATA_FORBIDDEN",
            "Lesson exposure cannot mutate mastery or carry assessed metadata.",
            binding.activityId,
          ),
        );
      }
    }
    if (binding.activityKind === "quiz-question") {
      if (
        binding.practiceContract !== "practice.v1" ||
        binding.evidenceMode !== "assessed" ||
        binding.evidenceSource !== "quiz-response" ||
        binding.evidenceWeight <= 0 ||
        binding.variantId == null ||
        binding.variantFamily == null ||
        JSON.stringify(binding.evidenceOutcomes) !==
          JSON.stringify(["correct", "incorrect"])
      ) {
        issues.push(
          issue(
            "QUIZ_EVIDENCE_INCOMPLETE",
            "Quiz bindings must emit practice.v1 assessed evidence for correct and incorrect outcomes.",
            binding.activityId,
          ),
        );
      }
    }
    if (binding.activityKind === "roleplay") {
      const referencedRubric = release.rubrics.find(
        (rubric) => rubric.rubricId === binding.rubricRefs[0],
      );
      if (
        binding.practiceContract !== "practice.v1" ||
        binding.evidenceSource !== "roleplay-evaluation" ||
        binding.rubricRefs.length !== 1 ||
        (binding.evidenceMode === "assessed" &&
          binding.evaluatorEligibility == null)
      ) {
        issues.push(
          issue(
            "ROLEPLAY_BINDING_INCOMPLETE",
            "Roleplay bindings require practice.v1, one rubric, and explicit evaluator eligibility.",
            binding.activityId,
          ),
        );
      }
      if (binding.evidenceMode === "assessed") {
        issues.push(
          issue(
            "ROLEPLAY_EVALUATOR_RELEASE_UNAPPROVED",
            "This Sales release has no owner-reviewed evaluator-release or immutable attempt verifier, so assessed roleplay evidence is ineligible.",
            binding.activityId,
          ),
        );
        const evaluator = binding.evaluatorEligibility;
        if (
          evaluator == null ||
          evaluator.contractVersion !==
            "sales-roleplay-evaluator-eligibility.v1" ||
          evaluator.immutableAttempt !== true ||
          evaluator.evaluator.provider == null ||
          evaluator.evaluator.model == null ||
          evaluator.evaluator.evaluatorVersion == null ||
          evaluator.rubric.rubricId !== binding.rubricRefs[0] ||
          evaluator.rubric.rubricDigest == null ||
          !/^[0-9a-f]{64}$/.test(evaluator.rubric.rubricDigest) ||
          evaluator.attempt?.attemptId == null ||
          evaluator.attempt.attemptDigest == null
        ) {
          issues.push(
            issue(
              "ROLEPLAY_EVALUATOR_PROVENANCE_INCOMPLETE",
              "Roleplay evidence is ineligible without immutable evaluator, provider, model, and rubric provenance.",
              binding.activityId,
            ),
          );
        }
        if (
          referencedRubric != null &&
          evaluator?.rubric.rubricDigest !==
            canonicalJsonSha256(referencedRubric)
        ) {
          issues.push(
            issue(
              "ROLEPLAY_RUBRIC_DIGEST_MISMATCH",
              "Assessed roleplay evidence must bind the canonical digest of its exact referenced rubric.",
              binding.activityId,
            ),
          );
        }
      } else if (
        binding.evidenceMode !== "pending_evaluator_eligibility" ||
        binding.evaluatorEligibility !== null ||
        binding.evidenceWeight !== 0
      ) {
        issues.push(
          issue(
            "ROLEPLAY_ELIGIBILITY_STATE_INVALID",
            "Roleplay bindings must remain pending until evaluator provenance is release-bound.",
            binding.activityId,
          ),
        );
      }
    }
    for (const rubric of binding.rubricRefs) {
      if (!release.rubrics.some((candidate) => candidate.rubricId === rubric))
        issues.push(
          issue(
            "RUBRIC_DRIFT",
            "Binding references an unknown roleplay rubric.",
            binding.activityId,
          ),
        );
    }
  }

  for (const coordinate of expected) {
    const activityId = activityIdFor(coordinate);
    if (!seenActivities.has(activityId))
      issues.push(
        issue(
          "MISSING_SOURCE_COORDINATE",
          "A protected Sales curriculum coordinate has no binding.",
          activityId,
        ),
      );
  }
  if (
    new Set(release.bindings.map((binding) => binding.activityKind)).size === 0
  )
    issues.push(
      issue("BINDING_COVERAGE_EMPTY", "Sales binding release cannot be empty."),
    );
}

/** Validates immutable Sales curriculum bindings against graph and approval evidence.
 * @param input Candidate binding release.
 * @param graph Reviewed Sales graph release.
 * @param evidence Owner-controlled release candidate and approval evidence.
 * @returns Deterministically ordered, fail-closed binding issues.
 */
function validateSalesCurriculumBindingsInternal(
  input: unknown,
  graph: unknown,
  evidence?: { releaseCandidate: unknown; approval: unknown },
): SalesKnowledgeValidationResult {
  const parsed = SalesCurriculumBindingsReleaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((item) => ({
        code: "BINDING_SCHEMA_INVALID",
        message: item.message,
        path: item.path.join("."),
      })),
    };
  }
  const issues: SalesKnowledgeIssue[] = [];
  const graphShape = SalesKnowledgeReleaseSchema.safeParse(graph);
  if (!graphShape.success) {
    issues.push({
      code: "GRAPH_SCHEMA_INVALID",
      message:
        "Bindings cannot be validated against a malformed Sales graph release.",
      path: "graph",
    });
  } else {
    const graphValidation = validateSalesKnowledgeRelease(graphShape.data);
    issues.push(
      ...graphValidation.issues.map((item) => ({
        ...item,
        code: item.code === "PROVENANCE_DRIFT" ? "GRAPH_DRIFT" : item.code,
      })),
    );
  }
  if (evidence != null) {
    validateReleaseProvenance(parsed.data, evidence).forEach((item) =>
      issues.push(item),
    );
  }
  validateRubrics(parsed.data, issues);
  if (graphShape.success)
    validateBindingShape(parsed.data, graphShape.data, issues);
  issues.sort((left, right) =>
    `${left.code}:${left.entityId ?? left.path ?? ""}`.localeCompare(
      `${right.code}:${right.entityId ?? right.path ?? ""}`,
    ),
  );
  return { valid: issues.length === 0, issues };
}

/** Validates immutable Sales curriculum bindings against graph and approval evidence.
 * @param input Candidate binding release.
 * @param graph Reviewed Sales graph release.
 * @param evidence Owner-controlled release candidate and approval evidence.
 * @returns Deterministically ordered, fail-closed binding issues.
 */
export function validateSalesCurriculumBindings(
  input: unknown,
  graph: unknown,
  evidence: { releaseCandidate: unknown; approval: unknown },
): SalesKnowledgeValidationResult {
  return validateSalesCurriculumBindingsInternal(input, graph, evidence);
}

/** Validates bindings after an exact packaged evidence manifest has been verified.
 * @param input Candidate binding release.
 * @param graph Reviewed Sales graph release.
 * @returns Deterministically ordered, fail-closed binding issues.
 */
export function validateSalesCurriculumBindingsAgainstApprovedManifest(
  input: unknown,
  graph: unknown,
): SalesKnowledgeValidationResult {
  return validateSalesCurriculumBindingsInternal(input, graph);
}

/** Parses a Sales binding release without relaxing its strict artifact shape.
 * @param input Candidate binding release.
 * @returns Structurally validated bindings.
 * @throws When the artifact shape is invalid.
 */
export function parseSalesCurriculumBindingRelease(
  input: unknown,
): SalesCurriculumBindingsRelease {
  return SalesCurriculumBindingsReleaseSchema.parse(input);
}
