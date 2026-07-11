import type { CodeKnowledgeGraph } from "./contracts.js";
import type { RuntimeCartridgeManifest } from "@reading-advantage/advantage-play-kit/runtime";
import { z } from "zod";

const PracticeBaseSchema = z
  .object({
    variantId: z.string().regex(/^apk\.[a-z0-9.-]+$/),
    variantFamily: z.string().regex(/^apk\.[a-z0-9.-]+$/),
    artifactId: z.string().regex(/^apk\.[a-z0-9.-]+$/),
    instructions: z.string().trim().min(20),
    checks: z.array(z.string().trim().min(3)).min(1),
    hints: z.array(z.string().trim().min(3)).min(2),
  })
  .strict();

/** Worked code-reading and debugging specification for one APK objective. */
export const APKWorkedExampleSchema = PracticeBaseSchema.extend({
  mode: z.literal("worked"),
  artifactKind: z.literal("code-reading-debugging"),
  revealPolicy: z.literal("after-prediction"),
}).strict();

/** Guided repository-extension specification for one APK objective. */
export const APKGuidedPracticeSchema = PracticeBaseSchema.extend({
  mode: z.literal("guided"),
  artifactKind: z.literal("guided-extension"),
  revealPolicy: z.literal("after-failed-checks"),
}).strict();

/** Independent cartridge-construction specification for one APK objective. */
export const APKIndependentPracticeSchema = PracticeBaseSchema.extend({
  mode: z.literal("independent"),
  artifactKind: z.literal("independent-construction"),
  revealPolicy: z.literal("no-solution-reveal"),
}).strict();

/** Strict per-objective APK gradual-release blueprint. */
export const APKObjectiveBlueprintSchema = z
  .object({
    objectiveId: z.string().regex(/^codecamp\.[a-z0-9.-]+$/),
    title: z.string().trim().min(8),
    outcomes: z.array(z.string().trim().min(12)).min(1),
    workedExample: APKWorkedExampleSchema,
    guidedPractice: APKGuidedPracticeSchema,
    independentPractice: APKIndependentPracticeSchema,
    grading: z
      .object({
        objectiveId: z.string().regex(/^codecamp\.game-development\.[a-z0-9.-]+$/),
        rubricId: z.string().regex(/^apk\.rubric\.[a-z0-9.-]+$/),
        dimensions: z.array(z.string().trim().min(3)).min(2),
        evidenceWeights: z
          .object({ worked: z.number().min(0).max(1), guided: z.number().min(0).max(1), independent: z.number().min(0).max(1) })
          .strict()
          .refine((weights) => Math.abs(weights.worked + weights.guided + weights.independent - 1) < 0.0001, "Evidence weights must sum to one"),
      })
      .strict(),
    misconceptions: z
      .array(
        z
          .object({
            tag: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            description: z.string().trim().min(12),
            remediationRefs: z.array(z.string().regex(/^(?:objective|video|diagram|doc):[a-z0-9./:-]+$/)).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/** Versioned APK branch blueprint and the ABI assumptions it teaches. */
export const APKLearningBlueprintSchema = z
  .object({
    schemaVersion: z.literal("codecamp-apk-learning-blueprint.v1"),
    blueprintId: z.literal("codecamp.apk.game-creation"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    graphVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    apkRuntimeApiVersion: z.literal("1.0.0"),
    reviews: z
      .object({
        curriculumOwner: z.object({ name: z.string().min(1), status: z.enum(["pending", "approved", "changes-requested"]), reviewedAt: z.string().date().nullable().optional() }).strict(),
        apkMaintainer: z.object({ name: z.string().min(1), status: z.enum(["pending", "approved", "changes-requested"]), reviewedAt: z.string().date().nullable().optional() }).strict(),
        productOwner: z.object({ name: z.string().min(1), status: z.enum(["pending", "approved", "changes-requested"]), reviewedAt: z.string().date().nullable().optional() }).strict(),
      })
      .strict(),
    prerequisiteRoots: z
      .array(
        z
          .object({
            role: z.enum(["javascript", "typescript", "react", "testing", "git"]),
            objectiveId: z.string().regex(/^codecamp\.[a-z0-9.-]+$/),
          })
          .strict(),
      )
      .length(5),
    abi: z
      .object({
        cartridgeManifestFields: z.array(z.enum(["id", "title", "description", "version", "runtimeApiVersion", "inputMode", "requiredAssetSlots", "capabilities"])).min(1),
        educationalInputModes: z.array(z.enum(["vocabulary", "sentence"])).min(1),
        educationalResultFields: z.array(z.enum(["accuracy", "xp", "score", "correctAnswers", "totalAttempts"])).min(1),
        hostResponsibilities: z.array(z.enum(["mount", "completion", "diagnostics", "navigation", "persistence"])).min(1),
        cartridgeResponsibilities: z.array(z.enum(["manifest", "game-config", "educational-logic", "validated-result", "deterministic-cleanup"])).min(1),
        editionResponsibilities: z.array(z.enum(["semantic-assets", "asset-provenance", "palette", "audience-tuning", "runtime-version"])).min(1),
        isolation: z
          .object({
            phaser: z.enum(["client-only", "server-safe"]),
            reactHostOwnsMount: z.boolean(),
            serverImportsForbidden: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    objectives: z.array(APKObjectiveBlueprintSchema).min(1),
  })
  .strict();

/** Validated APK learning blueprint. */
export type APKLearningBlueprint = z.infer<typeof APKLearningBlueprintSchema>;

/** One actionable APK blueprint validation issue. */
export interface APKBlueprintIssue {
  /** Stable machine-readable issue code. */
  code: string;
  /** Human-readable correction guidance. */
  message: string;
  /** Objective or prerequisite role when relevant. */
  entityId?: string;
}

/** Fail-closed result for APK blueprint review. */
export interface APKBlueprintValidationResult {
  /** Whether every schema, graph, ABI, and practice rule passes. */
  valid: boolean;
  /** Deterministically ordered validation issues. */
  issues: APKBlueprintIssue[];
}

/** Deterministic APK blueprint coverage report. */
export interface APKBlueprintReport {
  objectiveCount: number;
  practiceCount: number;
  misconceptionCount: number;
  byArtifactKind: Record<string, number>;
  prerequisiteRoles: string[];
}

const REQUIRED_MANIFEST_FIELDS = ["id", "title", "description", "version", "runtimeApiVersion", "inputMode", "requiredAssetSlots", "capabilities"] as const satisfies readonly (keyof RuntimeCartridgeManifest)[];
const _manifestFieldsAreExhaustive: Exclude<keyof RuntimeCartridgeManifest, typeof REQUIRED_MANIFEST_FIELDS[number]> extends never ? true : never = true;
void _manifestFieldsAreExhaustive;
const REQUIRED_INPUT_MODES = ["vocabulary", "sentence"];
const REQUIRED_RESULT_FIELDS = ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"];
const REQUIRED_HOST_RESPONSIBILITIES = ["mount", "completion", "diagnostics", "navigation", "persistence"];
const REQUIRED_CARTRIDGE_RESPONSIBILITIES = ["manifest", "game-config", "educational-logic", "validated-result", "deterministic-cleanup"];
const REQUIRED_EDITION_RESPONSIBILITIES = ["semantic-assets", "asset-provenance", "palette", "audience-tuning", "runtime-version"];
const REQUIRED_PREREQUISITES: Record<string, string> = {
  javascript: "codecamp.foundation.skill.functions",
  typescript: "codecamp.foundation.skill.typescript-contracts",
  react: "codecamp.frontend.skill.react-components",
  testing: "codecamp.testing.skill.unit-tests",
  git: "codecamp.workflow.skill.git-branches",
};

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function reachesAnyAPKObjective(graph: CodeKnowledgeGraph, sourceId: string, targets: Set<string>): boolean {
  const visited = new Set([sourceId]);
  const pending = [sourceId];
  while (pending.length > 0) {
    const current = pending.shift()!;
    if (targets.has(current)) return true;
    for (const edge of graph.knowledgeSpace.edges) {
      if (edge.type !== "prerequisite_for" || edge.sourceId !== current || visited.has(edge.targetId)) continue;
      visited.add(edge.targetId);
      pending.push(edge.targetId);
    }
  }
  return false;
}

/** Validates objective coverage, prerequisite reuse, ABI fidelity, and gradual-release diversity.
 * @param input Candidate APK learning blueprint.
 * @param graph Current reviewed Codecamp graph.
 * @returns Fail-closed validation issues sorted by code and entity.
 */
export function validateAPKLearningBlueprint(input: unknown, graph: CodeKnowledgeGraph): APKBlueprintValidationResult {
  const parsed = APKLearningBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({ code: "APK_BLUEPRINT_SCHEMA_INVALID", message: `${issue.path.join(".")}: ${issue.message}` })),
    };
  }
  const blueprint = parsed.data;
  const issues: APKBlueprintIssue[] = [];
  for (const [role, review] of Object.entries(blueprint.reviews)) {
    if (review.status !== "approved" || !review.reviewedAt) issues.push({ code: "APK_REVIEW_PENDING", entityId: role, message: `${role} approval is required before release.` });
  }
  if (blueprint.graphVersion !== graph.version) issues.push({ code: "APK_GRAPH_VERSION_MISMATCH", message: `Blueprint targets ${blueprint.graphVersion}, graph is ${graph.version}.` });
  const graphAPKObjectives = graph.knowledgeSpace.nodes.filter(
    (node) => node.metadata.cluster === "game-development" && node.metadata.objectiveType !== "container" && node.metadata.lifecycle === "active",
  );
  const targetIds = new Set(graphAPKObjectives.map((node) => node.id));
  const blueprintIds = blueprint.objectives.map((objective) => objective.objectiveId);
  if (new Set(blueprintIds).size !== blueprintIds.length || !sameMembers(blueprintIds, [...targetIds])) {
    issues.push({ code: "APK_OBJECTIVE_COVERAGE_MISMATCH", message: "Blueprint objectives must cover every active reviewed APK objective exactly once." });
  }
  for (const objective of blueprint.objectives) {
    if (!targetIds.has(objective.objectiveId)) {
      issues.push({ code: "NON_APK_OBJECTIVE_DUPLICATION", entityId: objective.objectiveId, message: "Reuse existing technology objectives as prerequisites instead of duplicating them in the APK branch." });
    }
    if (objective.grading.objectiveId !== objective.objectiveId) {
      issues.push({ code: "GRADING_OBJECTIVE_MISMATCH", entityId: objective.objectiveId, message: "Grading must emit evidence for its owning objective." });
    }
    const practices = [objective.workedExample, objective.guidedPractice, objective.independentPractice];
    if (new Set(practices.map((practice) => practice.variantId)).size !== 3 || new Set(practices.map((practice) => practice.variantFamily)).size !== 3) {
      issues.push({ code: "PRACTICE_VARIANTS_NOT_DISTINCT", entityId: objective.objectiveId, message: "Worked, guided, and independent practice require distinct variants and families." });
    }
    for (const misconception of objective.misconceptions) {
      if (!misconception.remediationRefs.includes(`objective:${objective.objectiveId}`)) {
        issues.push({ code: "REMEDIATION_NOT_GRAPH_LINKED", entityId: objective.objectiveId, message: "Misconception remediation must link back to the owning graph objective." });
      }
    }
  }
  const rootsByRole = new Map<string, string>(
    blueprint.prerequisiteRoots.map((root) => [root.role, root.objectiveId]),
  );
  for (const role of Object.keys(REQUIRED_PREREQUISITES) as Array<keyof typeof REQUIRED_PREREQUISITES>) {
    const objectiveId = REQUIRED_PREREQUISITES[role];
    if (rootsByRole.get(role) !== objectiveId || !reachesAnyAPKObjective(graph, objectiveId, targetIds)) {
      issues.push({ code: "MISSING_PREREQUISITE_PATH", entityId: role, message: `${role} must reuse ${objectiveId} through a graph prerequisite path into the APK branch.` });
    }
  }
  if (!sameMembers(blueprint.abi.cartridgeManifestFields, REQUIRED_MANIFEST_FIELDS)) issues.push({ code: "APK_ABI_MANIFEST_MISMATCH", message: "Blueprint manifest fields drift from RuntimeCartridgeManifest." });
  if (!sameMembers(blueprint.abi.educationalInputModes, REQUIRED_INPUT_MODES)) issues.push({ code: "APK_ABI_INPUT_MISMATCH", message: "Blueprint educational inputs drift from the vocabulary and sentence ABI." });
  if (!sameMembers(blueprint.abi.educationalResultFields, REQUIRED_RESULT_FIELDS)) issues.push({ code: "APK_ABI_RESULT_MISMATCH", message: "Blueprint results drift from the five-field GameResults ABI." });
  if (!sameMembers(blueprint.abi.hostResponsibilities, REQUIRED_HOST_RESPONSIBILITIES)) issues.push({ code: "APK_HOST_RESPONSIBILITY_MISMATCH", message: "Blueprint must preserve host-owned lifecycle and persistence responsibilities." });
  if (!sameMembers(blueprint.abi.cartridgeResponsibilities, REQUIRED_CARTRIDGE_RESPONSIBILITIES)) issues.push({ code: "APK_CARTRIDGE_RESPONSIBILITY_MISMATCH", message: "Blueprint must preserve cartridge-owned manifest, game configuration, educational logic, validated results, and deterministic cleanup." });
  if (!sameMembers(blueprint.abi.editionResponsibilities, REQUIRED_EDITION_RESPONSIBILITIES)) issues.push({ code: "APK_EDITION_CONTRACT_MISMATCH", message: "Blueprint must preserve edition asset, provenance, palette, tuning, and version responsibilities." });
  if (blueprint.abi.isolation.phaser !== "client-only" || !blueprint.abi.isolation.reactHostOwnsMount || !blueprint.abi.isolation.serverImportsForbidden) {
    issues.push({ code: "APK_ISOLATION_MISMATCH", message: "Phaser must remain client-only behind a React-owned mount with no server imports." });
  }
  issues.sort((left, right) => `${left.code}:${left.entityId ?? ""}`.localeCompare(`${right.code}:${right.entityId ?? ""}`));
  return { valid: issues.length === 0, issues };
}

/** Builds deterministic counts for reviewed APK objectives and practice families.
 * @param blueprint Strict APK learning blueprint.
 * @returns Objective, practice, misconception, artifact-kind, and prerequisite counts.
 */
export function buildAPKBlueprintReport(blueprint: APKLearningBlueprint): APKBlueprintReport {
  const practices = blueprint.objectives.flatMap((objective) => [objective.workedExample, objective.guidedPractice, objective.independentPractice]);
  const byArtifactKind = practices.reduce<Record<string, number>>((counts, practice) => {
    counts[practice.artifactKind] = (counts[practice.artifactKind] ?? 0) + 1;
    return counts;
  }, {});
  return {
    objectiveCount: blueprint.objectives.length,
    practiceCount: practices.length,
    misconceptionCount: blueprint.objectives.reduce((count, objective) => count + objective.misconceptions.length, 0),
    byArtifactKind: Object.fromEntries(Object.entries(byArtifactKind).sort(([left], [right]) => left.localeCompare(right))),
    prerequisiteRoles: blueprint.prerequisiteRoots.map((root) => root.role).sort(),
  };
}
