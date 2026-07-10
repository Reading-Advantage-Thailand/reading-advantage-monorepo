import { sha256 } from "./source-sync.js";
import { z } from "zod";

/** Minimal read-only lesson shape accepted by the curriculum inventory collector. */
export interface InventoryLessonInput {
  order: number;
  type: string;
  questions?: Array<{ order: number }>;
  exercises?: Array<{ order: number }>;
}

/** Minimal read-only module shape accepted by the curriculum inventory collector. */
export interface InventoryModuleInput {
  slug: string;
  order: number;
  status: "published" | "draft";
  lessons: InventoryLessonInput[];
}

/** Read-only inputs used to derive stable source coordinates. */
export interface CurriculumInventoryInput {
  modules: InventoryModuleInput[];
  repositoryModuleSlugs: string[];
  portfolioPhases: string[];
}

/** Strict package snapshot of the current protected curriculum source. */
export const CurriculumSourceInventorySchema = z
  .object({
    schemaVersion: z.literal("codecamp-curriculum-inventory.v1"),
    totals: z
      .object({
        publishedModules: z.number().int().nonnegative(),
        lessons: z.number().int().nonnegative(),
        questions: z.number().int().nonnegative(),
        exercises: z.number().int().nonnegative(),
        repositories: z.number().int().nonnegative(),
        portfolios: z.number().int().nonnegative(),
      })
      .strict(),
    modules: z.array(
      z
        .object({
          slug: z.string().min(1),
          order: z.number().int().positive(),
          status: z.enum(["published", "draft"]),
          lessonOrders: z.array(z.number().int().positive()),
          questionCoordinates: z.array(z.string().min(1)),
          exerciseCoordinates: z.array(z.string().min(1)),
          hasRepository: z.boolean(),
        })
        .strict(),
    ),
    activityIds: z.array(z.string().min(1)),
  })
  .strict();

/** Validated package snapshot of source curriculum activity coordinates. */
export type CurriculumSourceInventory = z.infer<typeof CurriculumSourceInventorySchema>;

/** Strict revision and digest manifest for the protected source and package inventory. */
export const CurriculumSourceProvenanceSchema = z
  .object({
    schemaVersion: z.literal("codecamp-curriculum-source.v1"),
    sourcePath: z.literal("packages/db/src/seed/codecamp-curriculum-data.ts"),
    originBaseRevision: z.string().regex(/^[0-9a-f]{40}$/),
    originBaseDigest: z.string().regex(/^[0-9a-f]{64}$/),
    sourceDigest: z.string().regex(/^[0-9a-f]{64}$/),
    sourceArtifact: z.string().regex(/^source-snapshots\/[a-z0-9.-]+\.ts$/),
    sourceDirty: z.literal(true),
    snapshotDigest: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

/** Validated provenance for the protected curriculum source inventory. */
export type CurriculumSourceProvenance = z.infer<typeof CurriculumSourceProvenanceSchema>;

/** Collects stable activity coordinates without mutating curriculum inputs.
 * @param input Published modules plus repository and portfolio identities.
 * @returns Deterministically ordered source inventory and totals.
 */
export function collectCurriculumInventory(input: CurriculumInventoryInput): CurriculumSourceInventory {
  const modules = [...input.modules]
    .sort((left, right) => left.order - right.order)
    .map((module) => ({
      slug: module.slug,
      order: module.order,
      status: module.status,
      lessonOrders: module.lessons.map((lesson) => lesson.order).sort((a, b) => a - b),
      questionCoordinates: module.lessons.flatMap((lesson) =>
        (lesson.questions ?? []).map((question) => `${module.slug}:${lesson.order}:${question.order}`),
      ),
      exerciseCoordinates: module.lessons.flatMap((lesson) =>
        (lesson.exercises ?? []).map((exercise) => `${module.slug}:${lesson.order}:${exercise.order}`),
      ),
      hasRepository: input.repositoryModuleSlugs.includes(module.slug),
    }));
  const activityIds = modules.flatMap((module) => [
    ...module.lessonOrders.map((order) => `lesson:${module.slug}:${order}`),
    ...module.questionCoordinates.map((coordinate) => `question:${coordinate}`),
    ...module.exerciseCoordinates.map((coordinate) => `exercise:${coordinate}`),
    ...(module.hasRepository ? [`repo:${module.slug}`] : []),
  ]);
  activityIds.push(
    ...input.portfolioPhases.map((phase) => `portfolio:phase-${phase.toLowerCase()}`),
  );
  return CurriculumSourceInventorySchema.parse({
    schemaVersion: "codecamp-curriculum-inventory.v1",
    totals: {
      publishedModules: modules.filter((module) => module.status === "published").length,
      lessons: modules.reduce((sum, module) => sum + module.lessonOrders.length, 0),
      questions: modules.reduce((sum, module) => sum + module.questionCoordinates.length, 0),
      exercises: modules.reduce((sum, module) => sum + module.exerciseCoordinates.length, 0),
      repositories: modules.filter((module) => module.hasRepository).length,
      portfolios: input.portfolioPhases.length,
    },
    modules,
    activityIds,
  });
}

/** Verifies exact protected source and canonical inventory snapshot digests.
 * @param sourceBytes Exact protected curriculum source bytes.
 * @param artifactBytes Content-addressed source artifact bytes.
 * @param baseBytes Source bytes retrieved from the recorded base revision.
 * @param inventory Parsed package inventory snapshot.
 * @param provenance Recorded source revision and digests.
 * @returns Fail-closed digest comparison with both calculated digests.
 */
export function verifyCurriculumSource(
  sourceBytes: Uint8Array,
  artifactBytes: Uint8Array,
  baseBytes: Uint8Array,
  inventory: CurriculumSourceInventory,
  provenance: CurriculumSourceProvenance,
): {
  valid: boolean;
  originBaseRevision: string;
  originBaseDigest: string;
  sourceDigest: string;
  artifactDigest: string;
  snapshotDigest: string;
  currentSourceMatchesArtifact: boolean;
} {
  const sourceDigest = sha256(sourceBytes);
  const artifactDigest = sha256(artifactBytes);
  const originBaseDigest = sha256(baseBytes);
  const snapshotDigest = sha256(new TextEncoder().encode(JSON.stringify(inventory)));
  return {
    valid:
      sourceDigest === provenance.sourceDigest &&
      artifactDigest === provenance.sourceDigest &&
      originBaseDigest === provenance.originBaseDigest &&
      snapshotDigest === provenance.snapshotDigest,
    originBaseRevision: provenance.originBaseRevision,
    originBaseDigest,
    sourceDigest,
    artifactDigest,
    snapshotDigest,
    currentSourceMatchesArtifact: sourceDigest === artifactDigest,
  };
}
