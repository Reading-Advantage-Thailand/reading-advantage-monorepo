import { createHash } from "node:crypto";

import {
  APPROVAL_CANONICAL_SHA256,
  APPROVED_CURRICULUM_DIGEST,
  APPROVED_SEED_ARTIFACT,
  APPROVED_SOURCE_COMMIT,
  APPROVAL_EVIDENCE_DIGEST,
  RELEASE_CANDIDATE_CANONICAL_SHA256,
  SALES_BINDINGS_CANONICAL_SHA256,
  SALES_KNOWLEDGE_RELEASE_ENVELOPE,
  SALES_KNOWLEDGE_RELEASE_ID,
  SalesCurriculumBindingsReleaseSchema,
  type SalesCurriculumBindingsRelease,
  type SalesCurriculumLessonInput,
  type SalesCurriculumModuleInput,
  type SalesRubricCriterionInput,
  type SalesScenarioInput,
} from "./contracts.js";
import {
  salesLessonId,
  salesObjectiveId,
  salesQuizId,
  salesRoleplayId,
  salesRubricId,
} from "./graph.js";
import { salesCurriculumModulesInReleaseOrder } from "./inventory.js";

type SalesCurriculumBinding =
  SalesCurriculumBindingsRelease["bindings"][number];
type SalesRubric = SalesCurriculumBindingsRelease["rubrics"][number];

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function orderedCriteria(
  criteria: ReadonlyArray<SalesRubricCriterionInput> | undefined,
): SalesRubricCriterionInput[] {
  return (criteria ?? []).map((criterion) => ({ ...criterion }));
}

function scenarioRubric(
  scenario: SalesScenarioInput | undefined,
): SalesRubricCriterionInput[] {
  return orderedCriteria(scenario?.rubric);
}

function baseBinding(
  activityId: string,
  activityKind: "lesson" | "quiz-question" | "roleplay",
  source: { moduleSlug: string; lessonOrder: number; itemOrder?: number },
  objectiveId: string,
): Pick<
  SalesCurriculumBinding,
  | "activityId"
  | "activityKind"
  | "source"
  | "objectiveIds"
  | "misconceptionTags"
  | "rubricRefs"
  | "objectiveDerivation"
> {
  return {
    activityId,
    activityKind,
    source,
    objectiveIds: [objectiveId],
    misconceptionTags: [],
    rubricRefs: [],
    objectiveDerivation: {
      kind: "approved-coordinate",
      source: APPROVED_SEED_ARTIFACT,
    },
  };
}

function lessonBinding(
  moduleSlug: string,
  lesson: SalesCurriculumLessonInput,
): SalesCurriculumBinding {
  const objectiveId = salesObjectiveId(moduleSlug, lesson.order);
  return {
    ...baseBinding(
      salesLessonId(moduleSlug, lesson.order),
      "lesson",
      { moduleSlug, lessonOrder: lesson.order },
      objectiveId,
    ),
    practiceMode: "exposure",
    evidenceMode: "exposure",
    evidenceWeight: 0,
    evidenceSource: "lesson-view",
    evidenceOutcomes: ["exposed"],
    variantId: null,
    variantFamily: null,
  };
}

function quizBinding(
  moduleSlug: string,
  lesson: SalesCurriculumLessonInput,
  itemOrder: number,
): SalesCurriculumBinding {
  const activityId = salesQuizId(moduleSlug, lesson.order, itemOrder);
  const variantId = `${activityId}.v1`;
  return {
    ...baseBinding(
      activityId,
      "quiz-question",
      { moduleSlug, lessonOrder: lesson.order, itemOrder },
      salesObjectiveId(moduleSlug, lesson.order),
    ),
    practiceContract: "practice.v1",
    practiceMode: "assessment",
    evidenceMode: "assessed",
    evidenceWeight: 0.7,
    evidenceSource: "quiz-response",
    evidenceOutcomes: ["correct", "incorrect"],
    variantId,
    variantFamily: `${activityId}.v1`,
  };
}

function roleplayBinding(
  moduleSlug: string,
  lesson: SalesCurriculumLessonInput,
  itemOrder: number,
): SalesCurriculumBinding {
  const activityId = salesRoleplayId(moduleSlug, lesson.order, itemOrder);
  const rubricId = salesRubricId(moduleSlug, lesson.order, itemOrder);
  return {
    ...baseBinding(
      activityId,
      "roleplay",
      { moduleSlug, lessonOrder: lesson.order, itemOrder },
      salesObjectiveId(moduleSlug, lesson.order),
    ),
    practiceContract: "practice.v1",
    practiceMode: "assessment",
    evidenceMode: "pending_evaluator_eligibility",
    evidenceWeight: 0,
    evidenceSource: "roleplay-evaluation",
    evidenceOutcomes: ["pending"],
    variantId: `${activityId}.v1`,
    variantFamily: `${activityId}.v1`,
    rubricRefs: [rubricId],
    evaluatorEligibility: null,
  };
}

/** Generates deterministic metadata bindings from approved coordinate rows.
 * @param input Approved modules, release candidate, and owner approval evidence.
 * @returns A release containing only coordinate metadata and rubric provenance.
 */
export function generateSalesCurriculumBindings(input: {
  /** Structural Sales curriculum modules. */
  staticSalesCurriculumModules: ReadonlyArray<SalesCurriculumModuleInput>;
  /** Approved release-candidate evidence; content is not copied. */
  releaseCandidate: unknown;
  /** Approved owner evidence; content is not copied. */
  approval: unknown;
}): SalesCurriculumBindingsRelease {
  if (digest(input.releaseCandidate) !== RELEASE_CANDIDATE_CANONICAL_SHA256) {
    throw new Error(
      "SALES_RELEASE_EVIDENCE_MISMATCH release candidate differs from approved canonical evidence",
    );
  }
  if (digest(input.approval) !== APPROVAL_CANONICAL_SHA256) {
    throw new Error(
      "SALES_APPROVAL_EVIDENCE_MISMATCH approval differs from owner-approved canonical evidence",
    );
  }
  const modules = salesCurriculumModulesInReleaseOrder(
    input.staticSalesCurriculumModules,
  );
  const bindings: SalesCurriculumBinding[] = [];
  const rubrics: SalesRubric[] = [];

  for (const module of modules) {
    for (const lesson of module.lessons) {
      bindings.push(lessonBinding(module.slug, lesson));
      for (
        let index = 0;
        index < (lesson.quizQuestions?.length ?? 0);
        index += 1
      ) {
        bindings.push(quizBinding(module.slug, lesson, index + 1));
      }
      for (let index = 0; index < (lesson.scenarios?.length ?? 0); index += 1) {
        const scenario = lesson.scenarios?.[index];
        const rubricId = salesRubricId(module.slug, lesson.order, index + 1);
        const criteria = scenarioRubric(scenario);
        const sourceRef = criteria[0]?.sourceRef ?? APPROVED_SEED_ARTIFACT;
        rubrics.push({
          rubricId,
          sourceRef,
          criteria,
        });
        bindings.push(roleplayBinding(module.slug, lesson, index + 1));
      }
    }
  }

  const release: SalesCurriculumBindingsRelease = {
    schemaVersion: SALES_KNOWLEDGE_RELEASE_ENVELOPE,
    releaseId: SALES_KNOWLEDGE_RELEASE_ID,
    graphVersion: "1.0.0",
    provenance: {
      curriculumGraphSha256: APPROVED_CURRICULUM_DIGEST,
      approvalSha256: APPROVAL_EVIDENCE_DIGEST,
      sourceRepository: "advantage-pr",
      sourceCommit: APPROVED_SOURCE_COMMIT,
      seedArtifact: APPROVED_SEED_ARTIFACT,
    },
    rubrics,
    bindings,
  };
  const validation = SalesCurriculumBindingsReleaseSchema.safeParse(release);
  if (!validation.success) {
    throw new Error(
      `SALES_GENERATED_ARTIFACT_INVALID ${validation.error.issues
        .map((item) => item.message)
        .join(", ")}`,
    );
  }
  if (digest(release) !== SALES_BINDINGS_CANONICAL_SHA256) {
    throw new Error(
      "SALES_GENERATED_ARTIFACT_MISMATCH generated binding metadata differs from the reviewed artifact",
    );
  }
  return release;
}

/** Returns a deterministic digest for a generated binding release.
 * @param release Binding release metadata.
 * @returns SHA-256 digest of its canonical JSON representation.
 */
export function digestSalesCurriculumBindings(
  release: SalesCurriculumBindingsRelease,
): string {
  return digest(release);
}
