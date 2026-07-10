import type { CodeKnowledgeGraph } from "./contracts.js";
import type { CurriculumSourceInventory } from "./curriculum-inventory-contract.js";
import { sha256 } from "./source-sync.js";
import { z } from "zod";

/** Strict source coordinates for one curriculum activity. */
export const CurriculumActivitySourceSchema = z
  .object({
    moduleSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lessonOrder: z.number().int().positive().optional(),
    itemOrder: z.number().int().positive().optional(),
  })
  .strict();

/** Strict graph and evidence binding for one curriculum activity. */
export const CurriculumActivityBindingSchema = z
  .object({
    activityId: z.string().regex(/^codecamp\.[a-z0-9.-]+$/),
    activityKind: z.enum(["lesson", "question", "exercise", "repository", "portfolio", "rubric"]),
    source: CurriculumActivitySourceSchema,
    objectiveIds: z
      .array(z.string().regex(/^codecamp\.[a-z0-9.-]+$/))
      .min(1)
      .superRefine((ids, context) => {
        if (new Set(ids).size !== ids.length) {
          context.addIssue({ code: "custom", message: "objectiveIds must be unique" });
        }
      }),
    practiceMode: z.enum(["exposure", "worked", "guided", "independent", "assessment", "review"]),
    evidenceMode: z.enum(["exposure", "assessed"]),
    evidenceWeight: z.number().min(0).max(1),
    evidenceSource: z.enum(["lesson-view", "quiz-response", "exercise-check", "pull-request", "portfolio-review", "rubric-score"]),
    variantId: z.string().trim().min(1).nullable(),
    variantFamily: z.string().trim().min(1).nullable(),
    misconceptionTags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    rubricRefs: z.array(z.string().trim().min(1)),
    resourceRefs: z.array(
      z.string().regex(/^(?:lesson|video|diagram|repo|rubric|portfolio):[a-z0-9./:-]+$/),
    ),
  })
  .strict();

/** Strict inventory summary for one published Codecamp module. */
export const CurriculumModuleSummarySchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().positive(),
    status: z.enum(["published", "draft"]),
    lessonCount: z.number().int().nonnegative(),
    questionCount: z.number().int().nonnegative(),
    exerciseCount: z.number().int().nonnegative(),
    repositoryCount: z.number().int().min(0).max(1),
  })
  .strict();

/** Strict graph-linked scoring rubric definition referenced by assessed activities. */
export const CurriculumRubricBindingSchema = z
  .object({
    rubricId: z.string().regex(/^codecamp\.[a-z0-9.-]+$/),
    objectiveIds: z.array(z.string().regex(/^codecamp\.[a-z0-9.-]+$/)).min(1),
    appliesToKinds: z.array(z.enum(["question", "exercise", "repository", "portfolio"])).min(1),
    scoringDimensions: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

/** Versioned, strict release of Codecamp curriculum-to-objective bindings. */
export const CurriculumBindingReleaseSchema = z
  .object({
    schemaVersion: z.literal("codecamp-curriculum-bindings.v1"),
    releaseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    graphVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    curriculumVersion: z.string().regex(/^[a-z0-9.-]+$/),
    provenance: z
      .object({
        sourcePath: z.literal("packages/db/src/seed/codecamp-curriculum-data.ts"),
        sourceRevision: z.string().regex(/^[0-9a-f]{40}$/),
        sourceDigest: z.string().regex(/^[0-9a-f]{64}$/),
        inventoryDigest: z.string().regex(/^[0-9a-f]{64}$/),
        generatedAt: z.string().datetime({ offset: true }),
        reviewedBy: z.string().trim().min(1),
      })
      .strict(),
    inventory: z
      .object({
        publishedModules: z.number().int().positive(),
        lessons: z.number().int().nonnegative(),
        questions: z.number().int().nonnegative(),
        exercises: z.number().int().nonnegative(),
        repositories: z.number().int().nonnegative(),
        portfolios: z.number().int().nonnegative(),
      })
      .strict(),
    modules: z.array(CurriculumModuleSummarySchema).min(1),
    rubrics: z.array(CurriculumRubricBindingSchema).min(1),
    bindings: z.array(CurriculumActivityBindingSchema).min(1),
  })
  .strict();

/** A validated Codecamp curriculum binding release. */
export type CurriculumBindingRelease = z.infer<typeof CurriculumBindingReleaseSchema>;

/** One stable, actionable curriculum-binding problem. */
export interface CurriculumBindingIssue {
  /** Stable machine-readable issue code. */
  code: string;
  /** Human-readable remediation guidance. */
  message: string;
  /** Activity or module identifier when available. */
  entityId?: string;
}

/** Fail-closed validation result for a curriculum binding release. */
export interface CurriculumBindingValidationResult {
  /** Whether every contract, reference, and coverage gate passes. */
  valid: boolean;
  /** Deterministically ordered validation issues. */
  issues: CurriculumBindingIssue[];
}

/** One mastery-safe assessed evidence projection. */
export interface BoundMasteryEvidence {
  activityId: string;
  objectiveId: string;
  practiceMode: "worked" | "guided" | "independent" | "assessment" | "review";
  evidenceWeight: number;
  evidenceSource: "quiz-response" | "exercise-check" | "pull-request" | "portfolio-review" | "rubric-score";
  variantId: string;
  variantFamily: string;
  misconceptionTags: string[];
  rubricRefs: string[];
}

/** Deterministic curriculum binding coverage report. */
export interface BindingCoverageReport {
  totalBindings: number;
  assessedBindings: number;
  exposureBindings: number;
  uniqueVariantFamilies: number;
  byModule: Record<string, number>;
  byObjective: Record<string, number>;
  byPracticeMode: Record<string, number>;
  byActivityKind: Record<string, number>;
  byEvidenceSource: Record<string, number>;
}

/** Parses an unknown value at the strict curriculum binding boundary.
 * @param input Candidate JSON-compatible binding release.
 * @returns Validated binding release.
 * @throws When a structural or strictness contract is violated.
 */
export function parseCurriculumBindingRelease(input: unknown): CurriculumBindingRelease {
  return CurriculumBindingReleaseSchema.parse(input);
}

function countedBindings(
  release: CurriculumBindingRelease,
  kind: "lesson" | "question" | "exercise" | "repository" | "portfolio",
  moduleSlug?: string,
): number {
  return release.bindings.filter(
    (binding) =>
      binding.activityKind === kind &&
      (moduleSlug == null || binding.source.moduleSlug === moduleSlug),
  ).length;
}

function sourceCoordinate(binding: CurriculumBindingRelease["bindings"][number]): string {
  const lesson = binding.source.lessonOrder == null ? "" : `/lesson-${binding.source.lessonOrder}`;
  const item = binding.source.itemOrder == null ? "" : `/item-${binding.source.itemOrder}`;
  return `${binding.source.moduleSlug}${lesson}${item}`;
}

function hasValidSourceCoordinate(
  binding: CurriculumBindingRelease["bindings"][number],
): boolean {
  const { lessonOrder, itemOrder } = binding.source;
  if (binding.activityKind === "lesson") return lessonOrder != null && itemOrder == null;
  if (binding.activityKind === "question" || binding.activityKind === "exercise") {
    return lessonOrder != null && itemOrder != null;
  }
  return lessonOrder == null && itemOrder == null;
}

const EXPECTED_EVIDENCE_SOURCE: Partial<
  Record<CurriculumBindingRelease["bindings"][number]["activityKind"], string>
> = {
  lesson: "lesson-view",
  question: "quiz-response",
  exercise: "exercise-check",
  repository: "pull-request",
  portfolio: "portfolio-review",
  rubric: "rubric-score",
};

/** Validates graph references, evidence semantics, uniqueness, and inventory coverage.
 * @param input Candidate curriculum binding release.
 * @param graph Current reviewed Codecamp graph release.
 * @param sourceInventory Protected source-backed activity inventory.
 * @returns Fail-closed validation issues ordered by code and entity.
 */
export function validateCurriculumBindings(
  input: unknown,
  graph: CodeKnowledgeGraph,
  sourceInventory: CurriculumSourceInventory,
): CurriculumBindingValidationResult {
  const parsed = CurriculumBindingReleaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "BINDING_SCHEMA_INVALID",
        message: `${issue.path.join(".")}: ${issue.message}`,
      })),
    };
  }
  const release = parsed.data;
  const issues: CurriculumBindingIssue[] = [];
  const expectedInventoryDigest = sha256(
    new TextEncoder().encode(JSON.stringify(sourceInventory)),
  );
  if (release.provenance.inventoryDigest !== expectedInventoryDigest) {
    issues.push({
      code: "INVENTORY_DIGEST_MISMATCH",
      message: "Binding provenance does not match the protected source inventory snapshot.",
    });
  }
  if (release.graphVersion !== graph.version) {
    issues.push({
      code: "GRAPH_VERSION_MISMATCH",
      message: `Bindings target graph ${release.graphVersion}, but runtime graph is ${graph.version}.`,
    });
  }
  const graphNodes = new Map(graph.knowledgeSpace.nodes.map((node) => [node.id, node]));
  const seenActivities = new Set<string>();
  const seenEvidence = new Set<string>();
  const knownRubrics = new Set<string>();
  for (const rubric of release.rubrics) {
    if (knownRubrics.has(rubric.rubricId)) {
      issues.push({ code: "DUPLICATE_RUBRIC_ID", entityId: rubric.rubricId, message: "Rubric IDs must be unique." });
    }
    knownRubrics.add(rubric.rubricId);
    for (const objectiveId of rubric.objectiveIds) {
      if (!graphNodes.has(objectiveId)) {
        issues.push({ code: "UNKNOWN_OBJECTIVE", entityId: rubric.rubricId, message: `Rubric references unknown objective ${objectiveId}.` });
      }
    }
  }
  for (const binding of release.bindings) {
    if (seenActivities.has(binding.activityId)) {
      issues.push({ code: "DUPLICATE_ACTIVITY_ID", entityId: binding.activityId, message: "Activity IDs must be unique." });
    }
    seenActivities.add(binding.activityId);
    for (const objectiveId of binding.objectiveIds) {
      const objective = graphNodes.get(objectiveId);
      if (objective == null) {
        issues.push({ code: "UNKNOWN_OBJECTIVE", entityId: binding.activityId, message: `Unknown objective ${objectiveId} at ${sourceCoordinate(binding)}.` });
      } else if (objective.metadata.lifecycle === "draft") {
        issues.push({ code: "DRAFT_OBJECTIVE", entityId: binding.activityId, message: `Objective ${objectiveId} is draft at ${sourceCoordinate(binding)}.` });
      } else if (objective.metadata.lifecycle === "retired") {
        issues.push({ code: "RETIRED_OBJECTIVE", entityId: binding.activityId, message: `Objective ${objectiveId} is retired at ${sourceCoordinate(binding)}.` });
      }
    }
    if (!hasValidSourceCoordinate(binding)) {
      issues.push({ code: "SOURCE_COORDINATE_INVALID", entityId: binding.activityId, message: `Invalid source coordinates at ${sourceCoordinate(binding)}.` });
    }
    if (EXPECTED_EVIDENCE_SOURCE[binding.activityKind] !== binding.evidenceSource) {
      issues.push({ code: "EVIDENCE_SOURCE_KIND_MISMATCH", entityId: binding.activityId, message: `${binding.activityKind} cannot emit ${binding.evidenceSource}.` });
    }
    if (binding.activityKind === "lesson") {
      const expected = `lesson:${binding.source.moduleSlug}:${binding.source.lessonOrder}`;
      if (binding.resourceRefs.length > 0 && !binding.resourceRefs.includes(expected)) {
        issues.push({ code: "DANGLING_RESOURCE", entityId: binding.activityId, message: `Expected resource ${expected}.` });
      }
      if (binding.resourceRefs.some((resource) => !resource.startsWith("lesson:") && !resource.startsWith("video:") && !resource.startsWith("diagram:"))) {
        issues.push({ code: "RESOURCE_KIND_MISMATCH", entityId: binding.activityId, message: "Lesson resources must be lesson, video, or diagram references." });
      }
    }
    if (binding.activityKind === "repository" && binding.resourceRefs.some((resource) => !resource.startsWith("repo:"))) {
      issues.push({ code: "RESOURCE_KIND_MISMATCH", entityId: binding.activityId, message: "Repository bindings require repo resources." });
    }
    if (binding.activityKind === "portfolio" && binding.resourceRefs.some((resource) => !resource.startsWith("portfolio:"))) {
      issues.push({ code: "RESOURCE_KIND_MISMATCH", entityId: binding.activityId, message: "Portfolio bindings require portfolio resources." });
    }
    if (binding.evidenceMode === "exposure" && binding.evidenceWeight !== 0) {
      issues.push({ code: "EXPOSURE_MUTATES_MASTERY", entityId: binding.activityId, message: "Exposure must have zero evidence weight." });
    }
    if (
      binding.evidenceMode === "exposure" &&
      (binding.practiceMode !== "exposure" ||
        binding.variantId != null ||
        binding.variantFamily != null ||
        binding.misconceptionTags.length > 0 ||
        binding.rubricRefs.length > 0)
    ) {
      issues.push({ code: "EXPOSURE_METADATA_FORBIDDEN", entityId: binding.activityId, message: "Exposure cannot carry assessed-only variant, misconception, or rubric metadata." });
    }
    if (
      binding.evidenceMode === "assessed" &&
      (binding.evidenceWeight <= 0 ||
        binding.practiceMode === "exposure" ||
        binding.variantId == null ||
        binding.variantFamily == null ||
        binding.misconceptionTags.length === 0 ||
        binding.rubricRefs.length === 0)
    ) {
      issues.push({ code: "ASSESSED_EVIDENCE_INCOMPLETE", entityId: binding.activityId, message: "Assessed evidence requires positive weight, a non-exposure mode, variant identity, misconceptions, and a rubric." });
    }
    if (binding.evidenceMode === "assessed" && binding.variantId != null) {
      const key = `${[...binding.objectiveIds].sort().join(",")}:${binding.variantId}:${binding.evidenceSource}`;
      if (seenEvidence.has(key)) {
        issues.push({ code: "DUPLICATE_VARIANT_EVIDENCE", entityId: binding.activityId, message: "The same objective variant and evidence source cannot count twice." });
      }
      seenEvidence.add(key);
    }
    for (const rubricRef of binding.rubricRefs) {
      if (!knownRubrics.has(rubricRef)) {
        issues.push({ code: "DANGLING_RUBRIC", entityId: binding.activityId, message: `Unknown rubric ${rubricRef}.` });
      }
    }
  }

  const publishedModules = release.modules.filter((module) => module.status === "published");
  const inventoryMatches =
    release.inventory.publishedModules === publishedModules.length &&
    release.inventory.lessons === countedBindings(release, "lesson") &&
    release.inventory.questions === countedBindings(release, "question") &&
    release.inventory.exercises === countedBindings(release, "exercise") &&
    release.inventory.repositories === countedBindings(release, "repository") &&
    release.inventory.portfolios === countedBindings(release, "portfolio");
  if (!inventoryMatches) {
    issues.push({ code: "INVENTORY_COVERAGE_MISMATCH", message: "Release totals do not match bound activity coverage." });
  }
  for (const module of publishedModules) {
    const moduleMatches =
      module.lessonCount === countedBindings(release, "lesson", module.slug) &&
      module.questionCount === countedBindings(release, "question", module.slug) &&
      module.exerciseCount === countedBindings(release, "exercise", module.slug) &&
      module.repositoryCount === countedBindings(release, "repository", module.slug);
    if (!moduleMatches) {
      issues.push({ code: "MODULE_COVERAGE_MISMATCH", entityId: module.slug, message: "Module inventory does not match its activity bindings." });
    }
  }
  const bindingSourceIds = new Set(
    release.bindings
      .filter((binding) => binding.activityKind !== "rubric")
      .map((binding) => {
        if (binding.activityKind === "lesson") {
          return `lesson:${binding.source.moduleSlug}:${binding.source.lessonOrder}`;
        }
        if (binding.activityKind === "question" || binding.activityKind === "exercise") {
          return `${binding.activityKind}:${binding.source.moduleSlug}:${binding.source.lessonOrder}:${binding.source.itemOrder}`;
        }
        return binding.resourceRefs[0] ?? `${binding.activityKind}:${binding.source.moduleSlug}`;
      }),
  );
  const sourceIds = new Set(sourceInventory.activityIds);
  for (const sourceId of sourceIds) {
    if (!bindingSourceIds.has(sourceId)) {
      issues.push({
        code: "SOURCE_ACTIVITY_UNBOUND",
        entityId: sourceId,
        message: `Protected source activity ${sourceId} has no binding.`,
      });
    }
  }
  for (const bindingId of bindingSourceIds) {
    if (!sourceIds.has(bindingId)) {
      issues.push({
        code: "UNKNOWN_SOURCE_ACTIVITY",
        entityId: bindingId,
        message: `Binding references source activity ${bindingId}, which is absent from the protected inventory.`,
      });
    }
  }
  issues.sort((left, right) => `${left.code}:${left.entityId ?? ""}`.localeCompare(`${right.code}:${right.entityId ?? ""}`));
  return { valid: issues.length === 0, issues };
}

/** Projects assessed bindings while making exposure-only resources impossible to ingest.
 * @param release Validated curriculum binding release.
 * @returns One mastery-safe evidence descriptor per assessed objective binding.
 */
export function projectMasteryEvidence(release: CurriculumBindingRelease): BoundMasteryEvidence[] {
  return release.bindings
    .filter((binding) => binding.evidenceMode === "assessed")
    .flatMap((binding) =>
      binding.objectiveIds.map((objectiveId) => ({
        activityId: binding.activityId,
        objectiveId,
        practiceMode: binding.practiceMode as BoundMasteryEvidence["practiceMode"],
        evidenceWeight: binding.evidenceWeight,
        evidenceSource: binding.evidenceSource as BoundMasteryEvidence["evidenceSource"],
        variantId: binding.variantId!,
        variantFamily: binding.variantFamily!,
        misconceptionTags: [...binding.misconceptionTags],
        rubricRefs: [...binding.rubricRefs],
      })),
    );
}

function count(values: string[]): Record<string, number> {
  return [...new Set(values)].sort().reduce<Record<string, number>>((result, value) => {
    result[value] = values.filter((candidate) => candidate === value).length;
    return result;
  }, {});
}

/** Builds deterministic coverage counts without inflating repeated variant families.
 * @param release Validated curriculum binding release.
 * @returns Coverage by module, objective, mode, kind, source, and unique variant family.
 */
export function buildBindingCoverageReport(release: CurriculumBindingRelease): BindingCoverageReport {
  return {
    totalBindings: release.bindings.length,
    assessedBindings: release.bindings.filter((binding) => binding.evidenceMode === "assessed").length,
    exposureBindings: release.bindings.filter((binding) => binding.evidenceMode === "exposure").length,
    uniqueVariantFamilies: new Set(release.bindings.flatMap((binding) => binding.variantFamily == null ? [] : [binding.variantFamily])).size,
    byModule: count(release.bindings.map((binding) => binding.source.moduleSlug)),
    byObjective: count(release.bindings.flatMap((binding) => binding.objectiveIds)),
    byPracticeMode: count(release.bindings.map((binding) => binding.practiceMode)),
    byActivityKind: count(release.bindings.map((binding) => binding.activityKind)),
    byEvidenceSource: count(release.bindings.map((binding) => binding.evidenceSource)),
  };
}

/** Counts independent variant families per objective without inflating repeated attempts.
 * @param release Validated curriculum binding release.
 * @returns Unique assessed variant-family counts keyed by objective ID.
 */
export function countIndependentEvidenceByObjective(
  release: CurriculumBindingRelease,
): Record<string, number> {
  const families = new Map<string, Set<string>>();
  for (const binding of release.bindings) {
    if (binding.evidenceMode !== "assessed" || binding.variantFamily == null) continue;
    for (const objectiveId of binding.objectiveIds) {
      const objectiveFamilies = families.get(objectiveId) ?? new Set<string>();
      objectiveFamilies.add(binding.variantFamily);
      families.set(objectiveId, objectiveFamilies);
    }
  }
  return [...families.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<Record<string, number>>((result, [objectiveId, variants]) => {
      result[objectiveId] = variants.size;
      return result;
    }, {});
}
