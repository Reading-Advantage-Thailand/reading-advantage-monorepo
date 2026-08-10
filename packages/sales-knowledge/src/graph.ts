import type {
  KnowledgeSpaceEdge,
  KnowledgeSpaceNode,
} from "@reading-advantage/knowledge-space-core";

import {
  APPROVED_CURRICULUM_DIGEST,
  APPROVED_SEED_ARTIFACT,
  APPROVED_SOURCE_COMMIT,
  APPROVAL_EVIDENCE_DIGEST,
  SALES_KNOWLEDGE_RELEASE_ENVELOPE,
  SALES_KNOWLEDGE_RELEASE_ID,
  SalesKnowledgeReleaseSchema,
  type SalesCurriculumModuleInput,
  type SalesKnowledgeRelease,
} from "./contracts.js";
import {
  SALES_MODULE_SLUGS,
  salesCurriculumModulesInReleaseOrder,
} from "./inventory.js";

export { SALES_MODULE_SLUGS } from "./inventory.js";

/** Builds the stable identifier for one Sales lesson objective.
 * @param moduleSlug Approved Sales module slug.
 * @param lessonOrder One-based lesson position within the module.
 * @returns Stable objective identifier.
 */
export function salesObjectiveId(
  moduleSlug: string,
  lessonOrder: number,
): string {
  return `sales.skill.${moduleSlug}.lesson-${lessonOrder}`;
}

/** Builds the stable identifier for one Sales lesson activity.
 * @param moduleSlug Approved Sales module slug.
 * @param lessonOrder One-based lesson position within the module.
 * @returns Stable lesson activity identifier.
 */
export function salesLessonId(moduleSlug: string, lessonOrder: number): string {
  return `sales.lesson.${moduleSlug}.l${lessonOrder}`;
}

/** Builds the stable identifier for one Sales quiz activity.
 * @param moduleSlug Approved Sales module slug.
 * @param lessonOrder One-based lesson position within the module.
 * @param itemOrder One-based quiz-question position within the lesson.
 * @returns Stable quiz activity identifier.
 */
export function salesQuizId(
  moduleSlug: string,
  lessonOrder: number,
  itemOrder: number,
): string {
  return `sales.quiz.${moduleSlug}.l${lessonOrder}.q${itemOrder}`;
}

/** Builds the stable identifier for one Sales roleplay activity.
 * @param moduleSlug Approved Sales module slug.
 * @param lessonOrder One-based lesson position within the module.
 * @param itemOrder One-based roleplay position within the lesson.
 * @returns Stable roleplay activity identifier.
 */
export function salesRoleplayId(
  moduleSlug: string,
  lessonOrder: number,
  itemOrder: number,
): string {
  return `sales.roleplay.${moduleSlug}.l${lessonOrder}.s${itemOrder}`;
}

/** Builds the stable identifier for one versioned roleplay rubric.
 * @param moduleSlug Approved Sales module slug.
 * @param lessonOrder One-based lesson position within the module.
 * @param itemOrder One-based roleplay position within the lesson.
 * @returns Stable rubric identifier.
 */
export function salesRubricId(
  moduleSlug: string,
  lessonOrder: number,
  itemOrder: number,
): string {
  return `sales.rubric.${moduleSlug}.l${lessonOrder}.s${itemOrder}.v1`;
}

function nodeBase(
  id: string,
  kind: KnowledgeSpaceNode["kind"],
  title: string,
  metadata: Record<string, unknown>,
  alignmentException = false,
): KnowledgeSpaceNode {
  return {
    id,
    kind,
    title,
    domain: "sales",
    sourceRefs: [APPROVED_SEED_ARTIFACT],
    reviewStatus: "approved",
    metadata,
    ...(alignmentException
      ? {
          exceptions: [
            {
              type: "alignment" as const,
              reason:
                "No owner-approved external standard alignment exists for this Sales release.",
              reviewer: "Project owner",
              date: "2026-07-18",
            },
          ],
        }
      : {}),
  };
}

function containmentEdge(
  id: string,
  sourceId: string,
  targetId: string,
  rationale: string,
): KnowledgeSpaceEdge {
  return {
    id,
    type: "contains",
    sourceId,
    targetId,
    weight: 1,
    confidence: "high",
    sourceRefs: [APPROVED_SEED_ARTIFACT],
    reviewStatus: "approved",
    rationale,
  };
}

/** Builds the deterministic Sales graph from the exact approved coordinates.
 * @param modules Approved structural module and lesson coordinates.
 * @returns A reviewed Sales graph containing only approved containment semantics.
 * @throws When module order or activity coordinates differ from the approved inventory.
 */
export function generateSalesKnowledgeRelease(
  modules: ReadonlyArray<SalesCurriculumModuleInput>,
): SalesKnowledgeRelease {
  const orderedModules = salesCurriculumModulesInReleaseOrder(modules);
  const nodes: KnowledgeSpaceNode[] = [
    nodeBase("sales.domain", "domain", "Sales Advantage", {
      lifecycle: "active",
      releaseId: SALES_KNOWLEDGE_RELEASE_ID,
      objectiveType: "domain",
    }),
  ];
  const edges: KnowledgeSpaceEdge[] = [];

  for (const module of orderedModules) {
    const moduleId = `sales.module.${module.slug}`;
    nodes.push(
      nodeBase(moduleId, "content_group", `Sales module ${module.slug}`, {
        lifecycle: "active",
        objectiveType: "module",
        moduleOrder: module.order,
      }),
    );
    edges.push(
      containmentEdge(
        `sales.edge.contains-domain-module-${module.slug}`,
        "sales.domain",
        moduleId,
        "Approved Sales module containment.",
      ),
    );

    for (const lesson of module.lessons) {
      const objectiveId = salesObjectiveId(module.slug, lesson.order);
      nodes.push(
        nodeBase(
          objectiveId,
          "skill",
          `Sales objective ${module.slug} lesson ${lesson.order}`,
          {
            lifecycle: "active",
            objectiveType: "skill",
            moduleSlug: module.slug,
            lessonOrder: lesson.order,
            derivation: "approved-coordinate",
          },
          true,
        ),
      );
      edges.push(
        containmentEdge(
          `sales.edge.contains-module-${module.slug}-lesson-${lesson.order}`,
          moduleId,
          objectiveId,
          "Approved lesson coordinate containment.",
        ),
      );
    }
  }

  if (
    orderedModules.map((module) => module.slug).join(",") !==
    SALES_MODULE_SLUGS.join(",")
  ) {
    throw new Error("SALES_COORDINATE_EVIDENCE_MISMATCH module order drift");
  }

  return SalesKnowledgeReleaseSchema.parse({
    schemaVersion: SALES_KNOWLEDGE_RELEASE_ENVELOPE,
    releaseId: SALES_KNOWLEDGE_RELEASE_ID,
    graphVersion: "1.0.0",
    releaseStatus: "reviewed",
    provenance: {
      curriculumGraphSha256: APPROVED_CURRICULUM_DIGEST,
      approvalSha256: APPROVAL_EVIDENCE_DIGEST,
      sourceRepository: "advantage-pr",
      sourceCommit: APPROVED_SOURCE_COMMIT,
    },
    knowledgeSpace: { nodes, edges },
  });
}
